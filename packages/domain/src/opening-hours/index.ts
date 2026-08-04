import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';

export const dayOfWeekSchema = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
export const holidayRuleSchema = z.enum(['AS_WEEKDAY', 'CLOSED', 'SPECIAL']);
export const openStateSchema = z.enum(['OPEN', 'CLOSED', 'UNKNOWN']);

export const openingRuleSchema = z.object({
  daysOfWeek: z.array(dayOfWeekSchema),
  opens: z
    .string()
    .regex(/^\d{2}:\d{2}$/u)
    .nullable(),
  closes: z
    .string()
    .regex(/^\d{2}:\d{2}$/u)
    .nullable(),
  appliesOnPublicHolidays: holidayRuleSchema,
  holidayCalendarCode: z.string().trim().min(1).nullable(),
});

export const openingScheduleSchema = z.object({
  validFrom: z.string().date(),
  validTo: z.string().date(),
  hoursUnknown: z.boolean(),
  rules: z.array(openingRuleSchema),
});

export const exceptionalClosureSchema = z.object({
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
});

export type OpeningRule = z.infer<typeof openingRuleSchema>;
export type OpeningSchedule = Readonly<
  Omit<z.infer<typeof openingScheduleSchema>, 'rules'> & { rules: readonly OpeningRule[] }
>;
export type ExceptionalClosure = z.infer<typeof exceptionalClosureSchema>;
export type OpenState = z.infer<typeof openStateSchema>;
export type HolidayResolver = (calendarCode: string, date: string) => boolean;

export type OpeningHoursContext = Readonly<{
  timeZone: string;
  isPublicHoliday: HolidayResolver;
  closures?: readonly ExceptionalClosure[];
}>;

export type DaySummary = Readonly<{
  date: string;
  state: OpenState;
  intervals: readonly Readonly<{ opens: string; closes: string }>[];
}>;

const temporalWeekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

function isDateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function isClosed(date: string, closures: readonly ExceptionalClosure[]): boolean {
  return closures.some(({ dateFrom, dateTo }) => isDateInRange(date, dateFrom, dateTo));
}

function ruleApplies(
  rule: OpeningRule,
  weekday: z.infer<typeof dayOfWeekSchema>,
  date: string,
  isPublicHoliday: HolidayResolver,
): boolean {
  const holiday = rule.holidayCalendarCode
    ? isPublicHoliday(rule.holidayCalendarCode, date)
    : false;
  if (rule.appliesOnPublicHolidays === 'SPECIAL') return holiday;
  if (holiday && rule.appliesOnPublicHolidays === 'CLOSED') return false;
  return rule.daysOfWeek.includes(weekday);
}

export function summarizeDay(
  scheduleInput: OpeningSchedule | null | undefined,
  date: string,
  context: OpeningHoursContext,
): DaySummary {
  if (!scheduleInput) return { date, state: 'UNKNOWN', intervals: [] };
  const schedule = openingScheduleSchema.parse(scheduleInput);
  const closures = (context.closures ?? []).map((closure) =>
    exceptionalClosureSchema.parse(closure),
  );
  if (schedule.hoursUnknown) return { date, state: 'UNKNOWN', intervals: [] };
  if (!isDateInRange(date, schedule.validFrom, schedule.validTo) || isClosed(date, closures)) {
    return { date, state: 'CLOSED', intervals: [] };
  }
  const weekday = temporalWeekdays[Temporal.PlainDate.from(date).dayOfWeek - 1]!;
  const intervals = schedule.rules
    .filter((rule) => ruleApplies(rule, weekday, date, context.isPublicHoliday))
    .flatMap((rule) =>
      rule.opens && rule.closes ? [{ opens: rule.opens, closes: rule.closes }] : [],
    );
  return { date, state: intervals.length > 0 ? 'OPEN' : 'CLOSED', intervals };
}

export function openStateAt(
  schedule: OpeningSchedule | null | undefined,
  instant: string | Temporal.Instant,
  context: OpeningHoursContext,
): OpenState {
  const zoned = (
    typeof instant === 'string' ? Temporal.Instant.from(instant) : instant
  ).toZonedDateTimeISO(context.timeZone);
  const date = zoned.toPlainDate().toString();
  const summary = summarizeDay(schedule, date, context);
  if (summary.state !== 'OPEN') return summary.state;
  const localTime = zoned.toPlainTime().toString({ smallestUnit: 'minute' });
  return summary.intervals.some(({ opens, closes }) => localTime >= opens && localTime < closes)
    ? 'OPEN'
    : 'CLOSED';
}

export function isOpenOnDate(
  schedule: OpeningSchedule | null | undefined,
  date: string,
  context: OpeningHoursContext,
): boolean {
  return summarizeDay(schedule, date, context).state === 'OPEN';
}
