import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  isOpenOnDate,
  openStateAt,
  summarizeDay,
  type OpeningHoursContext,
  type OpeningSchedule,
  type OpenState,
} from './index.js';

const holidayDates = new Set([
  'DE-BW:2026-05-25',
  'DE-BW:2026-12-25',
  'CH-TG:2026-08-01',
  'CH-SH:2026-08-01',
  'AT-VBG:2026-05-25',
]);

const context: OpeningHoursContext = {
  timeZone: 'Europe/Zurich',
  isPublicHoliday: (calendarCode, date) => holidayDates.has(`${calendarCode}:${date}`),
};

const weekdaySchedule: OpeningSchedule = {
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  hoursUnknown: false,
  rules: [
    {
      daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      opens: '09:00',
      closes: '17:00',
      appliesOnPublicHolidays: 'AS_WEEKDAY',
      holidayCalendarCode: 'DE-BW',
    },
    {
      daysOfWeek: ['SAT'],
      opens: '10:00',
      closes: '14:00',
      appliesOnPublicHolidays: 'AS_WEEKDAY',
      holidayCalendarCode: 'DE-BW',
    },
  ],
};

function instant(date: string, time: string, offset = '+01:00'): string {
  return `${date}T${time}:00${offset}`;
}

type GoldenCase = readonly [
  name: string,
  schedule: OpeningSchedule | null,
  date: string,
  time: string,
  expected: OpenState,
  contextPatch: Partial<OpeningHoursContext> | undefined,
  offset: string | undefined,
];

describe('opening-hours golden cases', () => {
  const goldenCases = [
    ['weekday opens at boundary', weekdaySchedule, '2026-01-05', '09:00', 'OPEN'],
    ['weekday remains open', weekdaySchedule, '2026-01-05', '12:30', 'OPEN'],
    ['weekday closes at boundary', weekdaySchedule, '2026-01-05', '17:00', 'CLOSED'],
    ['weekday before opening', weekdaySchedule, '2026-01-05', '08:59', 'CLOSED'],
    ['weekday after closing', weekdaySchedule, '2026-01-05', '17:01', 'CLOSED'],
    ['Saturday opens', weekdaySchedule, '2026-01-03', '10:00', 'OPEN'],
    ['Saturday closes', weekdaySchedule, '2026-01-03', '14:00', 'CLOSED'],
    ['Sunday is closed in DE', weekdaySchedule, '2026-01-04', '12:00', 'CLOSED'],
    [
      'Sunday is closed in CH without a Sunday rule',
      weekdaySchedule,
      '2026-01-04',
      '12:00',
      'CLOSED',
    ],
    ['before seasonal window', weekdaySchedule, '2025-12-31', '12:00', 'CLOSED'],
    ['after seasonal window', weekdaySchedule, '2027-01-01', '12:00', 'CLOSED'],
    ['Pfingstmontag applies as weekday in DE', weekdaySchedule, '2026-05-25', '12:00', 'OPEN'],
    [
      'Pfingstmontag is an ordinary Monday in CH-TG',
      {
        ...weekdaySchedule,
        rules: [{ ...weekdaySchedule.rules[0]!, holidayCalendarCode: 'CH-TG' }],
      },
      '2026-05-25',
      '12:00',
      'OPEN',
    ],
    [
      'Swiss National Day is only Swiss',
      {
        ...weekdaySchedule,
        rules: [
          { ...weekdaySchedule.rules[0]!, holidayCalendarCode: 'CH-TG' },
          {
            daysOfWeek: ['SAT'],
            opens: '10:00',
            closes: '14:00',
            appliesOnPublicHolidays: 'AS_WEEKDAY',
            holidayCalendarCode: 'CH-TG',
          },
        ],
      },
      '2026-08-01',
      '11:00',
      'OPEN',
    ],
    [
      'holiday closed rule removes weekday interval',
      {
        ...weekdaySchedule,
        rules: [{ ...weekdaySchedule.rules[0]!, appliesOnPublicHolidays: 'CLOSED' }],
      },
      '2026-05-25',
      '12:00',
      'CLOSED',
    ],
    [
      'holiday special rule opens only on holiday',
      {
        ...weekdaySchedule,
        rules: [
          {
            daysOfWeek: [],
            opens: '11:00',
            closes: '13:00',
            appliesOnPublicHolidays: 'SPECIAL',
            holidayCalendarCode: 'DE-BW',
          },
        ],
      },
      '2026-05-25',
      '12:00',
      'OPEN',
      undefined,
      '+02:00',
    ],
    [
      'holiday special rule does not open normal day',
      {
        ...weekdaySchedule,
        rules: [
          {
            daysOfWeek: [],
            opens: '11:00',
            closes: '13:00',
            appliesOnPublicHolidays: 'SPECIAL',
            holidayCalendarCode: 'DE-BW',
          },
        ],
      },
      '2026-05-18',
      '12:00',
      'CLOSED',
    ],
    [
      'unknown schedule remains unknown',
      { ...weekdaySchedule, hoursUnknown: true },
      '2026-01-05',
      '12:00',
      'UNKNOWN',
    ],
    ['missing schedule remains unknown', null, '2026-01-05', '12:00', 'UNKNOWN'],
    [
      'exceptional closure wins over a weekday rule',
      weekdaySchedule,
      '2026-01-05',
      '12:00',
      'CLOSED',
      { closures: [{ dateFrom: '2026-01-05', dateTo: '2026-01-05' }] },
    ],
    [
      'multi-day closure starts inclusively',
      weekdaySchedule,
      '2026-01-05',
      '12:00',
      'CLOSED',
      { closures: [{ dateFrom: '2026-01-05', dateTo: '2026-01-06' }] },
    ],
    [
      'multi-day closure ends inclusively',
      weekdaySchedule,
      '2026-01-06',
      '12:00',
      'CLOSED',
      { closures: [{ dateFrom: '2026-01-05', dateTo: '2026-01-06' }] },
    ],
    [
      'post-closure weekday reopens',
      weekdaySchedule,
      '2026-01-07',
      '12:00',
      'OPEN',
      { closures: [{ dateFrom: '2026-01-05', dateTo: '2026-01-06' }] },
    ],
    [
      'DST spring-forward day uses local clock before opening',
      {
        ...weekdaySchedule,
        rules: [
          {
            daysOfWeek: ['SUN'],
            opens: '03:30',
            closes: '04:30',
            appliesOnPublicHolidays: 'AS_WEEKDAY',
            holidayCalendarCode: null,
          },
        ],
      },
      '2026-03-29',
      '03:15',
      'CLOSED',
      undefined,
      '+02:00',
    ],
    [
      'DST spring-forward day uses local clock after opening',
      {
        ...weekdaySchedule,
        rules: [
          {
            daysOfWeek: ['SUN'],
            opens: '03:30',
            closes: '04:30',
            appliesOnPublicHolidays: 'AS_WEEKDAY',
            holidayCalendarCode: null,
          },
        ],
      },
      '2026-03-29',
      '03:45',
      'OPEN',
      undefined,
      '+02:00',
    ],
  ] as unknown as readonly GoldenCase[];

  it.each(goldenCases)('%s', (_name, schedule, date, time, expected, contextPatch, offset) => {
    expect(
      openStateAt(schedule, instant(date, time, offset), { ...context, ...contextPatch }),
    ).toBe(expected);
  });

  it('returns all normalized daily intervals and supports open-on-date', () => {
    const summary = summarizeDay(weekdaySchedule, '2026-01-05', context);
    expect(summary).toEqual({
      date: '2026-01-05',
      state: 'OPEN',
      intervals: [{ opens: '09:00', closes: '17:00' }],
    });
    expect(isOpenOnDate(weekdaySchedule, '2026-01-05', context)).toBe(true);
  });
});

describe('opening-hours properties', () => {
  it('never returns open outside a configured interval', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_439 }), (minute) => {
        const hour = String(Math.floor(minute / 60)).padStart(2, '0');
        const minuteOfHour = String(minute % 60).padStart(2, '0');
        const state = openStateAt(
          weekdaySchedule,
          instant('2026-01-05', `${hour}:${minuteOfHour}`),
          context,
        );
        const inInterval = minute >= 9 * 60 && minute < 17 * 60;
        expect(state === 'OPEN').toBe(inInterval);
      }),
    );
  });

  it('evaluates an opening state in under one millisecond on average', () => {
    const start = performance.now();
    for (let index = 0; index < 1_000; index += 1) {
      openStateAt(weekdaySchedule, instant('2026-01-05', '12:00'), context);
    }
    expect((performance.now() - start) / 1_000).toBeLessThan(1);
  });
});
