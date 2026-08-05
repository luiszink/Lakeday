import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  HeuristicTravelTimeEstimator,
  validatePlan,
  type PlanAttractionInput,
  type PlanInput,
} from '../src/plan/index.js';

const attraction = (overrides: Partial<PlanAttractionInput> = {}): PlanAttractionInput => ({
  coordinates: { latitude: 47.66, longitude: 9.17 },
  id: 'attraction-1',
  openingSchedule: {
    hoursUnknown: false,
    rules: [
      {
        appliesOnPublicHolidays: 'AS_WEEKDAY',
        daysOfWeek: ['MON'],
        holidayCalendarCode: 'CH-TG',
        opens: '09:00',
        closes: '17:00',
      },
    ],
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },
  typicalDurationMax: 60,
  typicalDurationMin: 60,
  ...overrides,
});

const plan = (stops: PlanInput['stops'], overrides: Partial<PlanInput> = {}): PlanInput => ({
  date: '2026-01-05',
  stops,
  ...overrides,
});

describe('validatePlan', () => {
  it('reports the P3 arrival warning for a 17:00 closing time', () => {
    const result = validatePlan(
      plan([{ attractionId: 'attraction-1', plannedDurationMin: 15 }], { dayStart: '16:40' }),
      [attraction()],
    );

    expect(result.timeline[0]?.arrival).toBe('16:40');
    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ code: 'ARRIVAL_TOO_CLOSE_TO_CLOSING', stopIndex: 0 }),
    );
  });

  it('honours a Swiss holiday closure through the supplied calendar', () => {
    const result = validatePlan(
      plan([{ attractionId: 'attraction-1', plannedDurationMin: 60 }], { date: '2026-08-01' }),
      [
        attraction({
          openingSchedule: {
            ...attraction().openingSchedule!,
            rules: [{ ...attraction().openingSchedule!.rules[0]!, appliesOnPublicHolidays: 'CLOSED' }],
          },
        }),
      ],
      { isPublicHoliday: (code, date) => code === 'CH-TG' && date === '2026-08-01' },
    );

    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ code: 'CLOSED_ON_DATE', severity: 'ERROR' }),
    );
  });

  it('is deterministic and adding a stop never shortens totals', () => {
    const one = plan([{ attractionId: 'attraction-1', plannedDurationMin: 30 }]);
    const two = plan([
      { attractionId: 'attraction-1', plannedDurationMin: 30 },
      { attractionId: 'attraction-1', plannedDurationMin: 30 },
    ]);
    const first = validatePlan(one, [attraction()]);
    const second = validatePlan(one, [attraction()]);
    const longer = validatePlan(two, [attraction()]);
    expect(first).toEqual(second);
    expect(longer.totals.overallMinutes).toBeGreaterThanOrEqual(first.totals.overallMinutes);
  });

  it('keeps totals monotonic across generated visit durations', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 15, max: 300 }), { minLength: 1, maxLength: 5 }), (durations) => {
        const stops = durations.map((plannedDurationMin) => ({
          attractionId: 'attraction-1',
          plannedDurationMin,
        }));
        const result = validatePlan(plan(stops), [attraction()]);
        return result.totals.visitMinutes === durations.reduce((total, duration) => total + duration, 0);
      }),
    );
  });

  it('uses swappable travel configuration', () => {
    const baseline = new HeuristicTravelTimeEstimator().estimate(
      { latitude: 47.66, longitude: 9.17 },
      { latitude: 47.7, longitude: 9.25 },
      'CAR',
    );
    const slower = new HeuristicTravelTimeEstimator({
      detourFactor: 2,
      modeSpeedKmh: { CAR: 20 },
    }).estimate(
      { latitude: 47.66, longitude: 9.17 },
      { latitude: 47.7, longitude: 9.25 },
      'CAR',
    );
    expect(slower).toBeGreaterThan(baseline);
  });
});