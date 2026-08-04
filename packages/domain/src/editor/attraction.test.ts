import { describe, expect, it } from 'vitest';

import { attractionEditorPayloadSchema } from './attraction.js';

const validPayload = {
  id: null,
  expectedUpdatedAt: null,
  status: 'DRAFT',
  countryCode: 'DE',
  municipality: 'Konstanz',
  regionCode: 'OBERSEE_WEST',
  latitude: 47.66,
  longitude: 9.17,
  scopeException: false,
  scopeExceptionReason: null,
  editorialRelevance: 'MEDIUM',
  verificationState: 'UNVERIFIED',
  indoorOutdoor: 'MIXED',
  rainSuitability: 'GOOD',
  heatSuitability: 'OK',
  seasons: ['ALL_YEAR'],
  typicalDurationMin: 60,
  typicalDurationMax: 120,
  priceLevel: 'LOW',
  bookingRequirement: 'NONE',
  bookingUrl: null,
  officialWebsite: 'https://example.com/attraction',
  childAgeBands: ['6-9'],
  foodOnSite: null,
  cafeOnSite: true,
  picnicAllowed: true,
  toilets: true,
  strollerSuitable: 'UNKNOWN',
  wheelchairAccess: 'UNKNOWN',
  wheelchairToilet: null,
  dogPolicy: 'LEASHED',
  visitorLanguages: ['DE', 'EN'],
  transportModes: ['WALK', 'PUBLIC_TRANSPORT'],
  nearestStopName: 'Münsterplatz',
  nearestStopDistanceM: 450,
  parkingAvailability: 'NEARBY',
  parkingNote: null,
  bicycleAccess: true,
  bicycleNote: null,
  categoryCodes: ['MUSEUM'],
  localizations: [
    {
      locale: 'de',
      name: 'Beispielort',
      slug: 'beispielort',
      summary: 'Kurz.',
      description: 'Beschreibung.',
      practicalNotes: null,
      translationState: 'SOURCE',
    },
    {
      locale: 'en',
      name: 'Example place',
      slug: 'example-place',
      summary: 'Short.',
      description: 'Description.',
      practicalNotes: null,
      translationState: 'TRANSLATED',
    },
  ],
  criticalFacts: { name: 'VERIFIED', location: 'VERIFIED', hours: 'UNVERIFIED' },
  openingSchedule: {
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    hoursUnknown: false,
    rules: [
      {
        daysOfWeek: ['MON'],
        opens: '09:00',
        closes: '17:00',
        appliesOnPublicHolidays: 'AS_WEEKDAY',
        holidayCalendarCode: 'DE-BW',
      },
    ],
  },
  closures: [],
  prices: [],
} as const;

describe('attraction editor payload', () => {
  it('accepts structured bilingual draft data and opening rules', () => {
    expect(attractionEditorPayloadSchema.parse(validPayload)).toMatchObject({
      categoryCodes: ['MUSEUM'],
      localizations: [{ locale: 'de' }, { locale: 'en' }],
    });
  });

  it('rejects free-text opening times and incomplete localization sets', () => {
    expect(() =>
      attractionEditorPayloadSchema.parse({
        ...validPayload,
        localizations: [validPayload.localizations[0]],
        openingSchedule: {
          ...validPayload.openingSchedule,
          rules: [{ ...validPayload.openingSchedule.rules[0], opens: 'morning' }],
        },
      }),
    ).toThrow();
  });

  it('allows incomplete draft categories for the publish invariant gate', () => {
    expect(
      attractionEditorPayloadSchema.parse({ ...validPayload, categoryCodes: [] }).categoryCodes,
    ).toEqual([]);
  });
});
