import { Temporal } from '@js-temporal/polyfill';

import {
  summarizeDay,
  type ExceptionalClosure,
  type HolidayResolver,
  type OpeningSchedule,
} from '../opening-hours/index.js';
import { HeuristicTravelTimeEstimator, type TravelMode, type TravelPoint, type TravelTimeEstimator } from './travel.js';

export type PlanStopInput = Readonly<{
  attractionId: string;
  plannedDurationMin: number | null | undefined;
}>;

export type PlanInput = Readonly<{
  date?: string | null | undefined;
  dayStart?: string | undefined;
  mode?: TravelMode | undefined;
  startPoint?: TravelPoint | null | undefined;
  stops: readonly PlanStopInput[];
}>;

export type PlanAttractionInput = Readonly<{
  id: string;
  coordinates: TravelPoint | null;
  exceptionalClosures?: readonly ExceptionalClosure[] | undefined;
  hoursStale?: boolean | undefined;
  openingSchedule: OpeningSchedule | null;
  typicalDurationMax: number | null;
  typicalDurationMin: number | null;
}>;

export type PlanHolidayCalendars = Readonly<{
  isPublicHoliday?: HolidayResolver | undefined;
}>;

export type PlanConflictCode =
  | 'ARRIVAL_TOO_CLOSE_TO_CLOSING'
  | 'CLOSED_ON_DATE'
  | 'DAY_TOO_LONG'
  | 'HOURS_STALE'
  | 'HOURS_UNKNOWN'
  | 'NO_DATE'
  | 'VISIT_EXCEEDS_CLOSING';

export type PlanConflictSeverity = 'ERROR' | 'INFO' | 'WARNING';

export type PlanConflict = Readonly<{
  code: PlanConflictCode;
  parameters: Readonly<Record<string, number | string>>;
  severity: PlanConflictSeverity;
  stopIndex: number | null;
}>;

export type PlanTimelineEntry = Readonly<{
  arrival: string;
  departure: string;
  plannedDurationMin: number;
  stopIndex: number;
  travelMinutes: number;
}>;

export type PlanValidation = Readonly<{
  conflicts: readonly PlanConflict[];
  date: string | null;
  dayStart: string;
  timeline: readonly PlanTimelineEntry[];
  totals: Readonly<{
    overallMinutes: number;
    travelMinutes: number;
    visitMinutes: number;
  }>;
}>;

const defaultDate = '2000-01-03';
const defaultDayStart = '09:00';
const timeZone = 'Europe/Zurich';

function minutesFromTime(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function daySummary(
  attraction: PlanAttractionInput,
  date: string,
  isPublicHoliday: HolidayResolver,
) {
  return summarizeDay(
    attraction.openingSchedule,
    date,
    attraction.exceptionalClosures
      ? { closures: attraction.exceptionalClosures, isPublicHoliday, timeZone }
      : { isPublicHoliday, timeZone },
  );
}

function formatTime(value: Temporal.ZonedDateTime) {
  return value.toPlainTime().toString({ smallestUnit: 'minute' });
}

function typicalDuration(attraction: PlanAttractionInput) {
  const minimum = attraction.typicalDurationMin;
  const maximum = attraction.typicalDurationMax;
  if (minimum === null) return maximum ?? 60;
  if (maximum === null) return minimum;
  return Math.max(15, Math.round((minimum + maximum) / 2 / 15) * 15);
}

function nextOpenDate(
  attraction: PlanAttractionInput,
  date: string,
  isPublicHoliday: HolidayResolver,
) {
  for (let offset = 1; offset <= 31; offset += 1) {
    const candidate = Temporal.PlainDate.from(date).add({ days: offset }).toString();
    if (
      daySummary(attraction, candidate, isPublicHoliday).state === 'OPEN'
    ) {
      return candidate;
    }
  }
  return null;
}

function addConflict(
  conflicts: PlanConflict[],
  code: PlanConflictCode,
  severity: PlanConflictSeverity,
  stopIndex: number | null,
  parameters: Readonly<Record<string, number | string>> = {},
) {
  conflicts.push({ code, parameters, severity, stopIndex });
}

export function validatePlan(
  plan: PlanInput,
  attractions: readonly PlanAttractionInput[],
  holidayCalendars: PlanHolidayCalendars = {},
  estimator: TravelTimeEstimator = new HeuristicTravelTimeEstimator(),
): PlanValidation {
  const date = plan.date ?? null;
  const calculationDate = date ?? defaultDate;
  const dayStart = plan.dayStart ?? defaultDayStart;
  const mode = plan.mode ?? 'CAR';
  const isPublicHoliday = holidayCalendars.isPublicHoliday ?? (() => false);
  const byId = new Map(attractions.map((attraction) => [attraction.id, attraction]));
  const conflicts: PlanConflict[] = [];
  const timeline: PlanTimelineEntry[] = [];
  let cursor = Temporal.ZonedDateTime.from(`${calculationDate}T${dayStart}:00[${timeZone}]`);
  let previousPoint = plan.startPoint ?? null;
  let travelMinutes = 0;
  let visitMinutes = 0;

  if (!date && plan.stops.length > 0) addConflict(conflicts, 'NO_DATE', 'INFO', null);

  plan.stops.forEach((stop, stopIndex) => {
    const attraction = byId.get(stop.attractionId);
    if (!attraction) return;
    const travel = previousPoint && attraction.coordinates
      ? estimator.estimate(previousPoint, attraction.coordinates, mode)
      : 0;
    cursor = cursor.add({ minutes: travel });
    const arrival = formatTime(cursor);
    const duration = stop.plannedDurationMin ?? typicalDuration(attraction);
    const departureCursor = cursor.add({ minutes: duration });
    const departure = formatTime(departureCursor);
    timeline.push({ arrival, departure, plannedDurationMin: duration, stopIndex, travelMinutes: travel });
    travelMinutes += travel;
    visitMinutes += duration;

    const summary = daySummary(attraction, calculationDate, isPublicHoliday);
    if (!attraction.openingSchedule || attraction.openingSchedule.hoursUnknown) {
      addConflict(conflicts, 'HOURS_UNKNOWN', 'INFO', stopIndex);
    } else if (attraction.hoursStale) {
      addConflict(conflicts, 'HOURS_STALE', 'INFO', stopIndex);
    } else if (date && summary.state === 'CLOSED') {
      addConflict(conflicts, 'CLOSED_ON_DATE', 'ERROR', stopIndex, {
        nextOpenDate: nextOpenDate(attraction, calculationDate, isPublicHoliday) ?? '',
      });
    } else if (summary.state === 'OPEN') {
      const interval =
        summary.intervals.find(({ closes }) => minutesFromTime(closes) >= minutesFromTime(arrival)) ??
        summary.intervals.at(-1);
      if (interval) {
        const closesAt = minutesFromTime(interval.closes);
        const arrivesAt = minutesFromTime(arrival);
        const departsAt = minutesFromTime(departure);
        if (arrivesAt >= closesAt - 30) {
          addConflict(conflicts, 'ARRIVAL_TOO_CLOSE_TO_CLOSING', 'WARNING', stopIndex, {
            arrival,
            closes: interval.closes,
          });
        }
        if (departsAt > closesAt) {
          addConflict(conflicts, 'VISIT_EXCEEDS_CLOSING', 'INFO', stopIndex, {
            closes: interval.closes,
            departure,
          });
        }
      }
    }
    previousPoint = attraction.coordinates;
    cursor = departureCursor;
  });

  const overallMinutes = travelMinutes + visitMinutes;
  if (overallMinutes > 12 * 60) addConflict(conflicts, 'DAY_TOO_LONG', 'WARNING', null);
  return {
    conflicts: conflicts.sort((first, second) => (first.stopIndex ?? Infinity) - (second.stopIndex ?? Infinity)),
    date,
    dayStart,
    timeline,
    totals: { overallMinutes, travelMinutes, visitMinutes },
  };
}