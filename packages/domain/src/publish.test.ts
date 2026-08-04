import { describe, expect, it } from 'vitest';

import {
  attractionLocalizationSchema,
  attractionSchema,
  criticalFactsSchema,
  type Attraction,
  type AttractionLocalization,
  type CriticalFacts,
} from './entities/attraction.js';
import { publishAttraction } from './publish.js';
import { isInScope, type ScopeGeometry } from './scope.js';

const scopeGeometry: ScopeGeometry = {
  isWithinShorelineBand: ({ latitude }) => latitude === 47.6,
  isShorelineMunicipality: (municipality) => municipality === 'Konstanz',
};

const attraction: Attraction = {
  id: '5d1c0e3e-798f-46d2-ae1e-f9b7a9ee318c',
  status: 'DRAFT',
  countryCode: 'DE',
  municipality: 'Konstanz',
  regionCode: 'KONSTANZ_SEERHEIN',
  coordinates: { latitude: 47.6, longitude: 9.17 },
  categoryCodes: ['CULTURE_HISTORY'],
  scopeException: false,
  scopeExceptionReason: null,
  editorialRelevance: 'MEDIUM',
  verificationState: 'VERIFIED',
  indoorOutdoor: 'INDOOR',
  rainSuitability: 'EXCELLENT',
  heatSuitability: 'GOOD',
  seasons: ['ALL_YEAR'],
  childAgeBands: [],
  priceLevel: 'MEDIUM',
  bookingRequirement: 'NONE',
  strollerSuitable: 'YES',
  wheelchairAccess: 'FULL',
  dogPolicy: 'NO',
  visitorLanguages: ['DE', 'EN'],
  transportModes: ['WALK', 'PUBLIC_TRANSPORT'],
};

const localizations: readonly AttractionLocalization[] = [
  {
    locale: 'de',
    name: 'Testort',
    slug: 'testort',
    summary: 'Kurzbeschreibung',
    description: 'Vollständige Beschreibung',
    practicalNotes: null,
    translationState: 'SOURCE',
  },
  {
    locale: 'en',
    name: 'Test place',
    slug: 'test-place',
    summary: 'Short summary',
    description: 'Complete description',
    practicalNotes: null,
    translationState: 'TRANSLATED',
  },
];

const criticalFacts: CriticalFacts = { name: 'VERIFIED', location: 'VERIFIED', hours: 'VERIFIED' };

function expectViolation(value: ReturnType<typeof publishAttraction>, code: string): void {
  expect(value.ok).toBe(false);
  if (!value.ok)
    expect(value.errors.map(({ code: violationCode }) => violationCode)).toContain(code);
}

describe('isInScope', () => {
  it('includes coordinates inside the shoreline band', () => {
    expect(isInScope(attraction, scopeGeometry)).toBe(true);
  });

  it('includes highly relevant attractions in shoreline municipalities', () => {
    expect(
      isInScope(
        {
          ...attraction,
          coordinates: { latitude: 47.4, longitude: 9.17 },
          editorialRelevance: 'HIGH',
        },
        scopeGeometry,
      ),
    ).toBe(true);
  });

  it('includes justified editorial exceptions', () => {
    expect(
      isInScope(
        {
          ...attraction,
          coordinates: { latitude: 47.4, longitude: 9.17 },
          municipality: 'Salem',
          scopeException: true,
          scopeExceptionReason: 'Regional landmark',
        },
        scopeGeometry,
      ),
    ).toBe(true);
  });

  it('excludes out-of-band coordinates without a qualifying rule', () => {
    expect(
      isInScope(
        { ...attraction, coordinates: { latitude: 47.4, longitude: 9.17 }, municipality: 'Salem' },
        scopeGeometry,
      ),
    ).toBe(false);
  });
});

describe('publishAttraction', () => {
  it('round-trips the fixture shapes through the public Zod schemas', () => {
    expect(attractionSchema.parse(attraction)).toEqual(attraction);
    expect(
      localizations.map((localization) => attractionLocalizationSchema.parse(localization)),
    ).toEqual(localizations);
    expect(criticalFactsSchema.parse(criticalFacts)).toEqual(criticalFacts);
  });

  it('publishes a fully verified in-scope attraction', () => {
    const result = publishAttraction(attraction, localizations, criticalFacts, scopeGeometry);
    expect(result).toEqual({ ok: true, value: { ...attraction, status: 'PUBLISHED' } });
  });

  it('rejects a missing German localization', () => {
    expectViolation(
      publishAttraction(attraction, [localizations[1]!], criticalFacts, scopeGeometry),
      'LOCALIZATION_MISSING',
    );
  });

  it('rejects an incomplete localization', () => {
    expectViolation(
      publishAttraction(
        attraction,
        [{ ...localizations[0]!, description: null }, localizations[1]!],
        criticalFacts,
        scopeGeometry,
      ),
      'LOCALIZATION_INCOMPLETE',
    );
  });

  it('rejects a stale localization', () => {
    expectViolation(
      publishAttraction(
        attraction,
        [{ ...localizations[0]!, translationState: 'STALE' }, localizations[1]!],
        criticalFacts,
        scopeGeometry,
      ),
      'LOCALIZATION_STALE',
    );
  });

  it('rejects missing coordinates', () => {
    expectViolation(
      publishAttraction(
        { ...attraction, coordinates: null },
        localizations,
        criticalFacts,
        scopeGeometry,
      ),
      'COORDINATES_MISSING',
    );
  });

  it('rejects a missing region', () => {
    expectViolation(
      publishAttraction(
        { ...attraction, regionCode: null },
        localizations,
        criticalFacts,
        scopeGeometry,
      ),
      'REGION_MISSING',
    );
  });

  it('rejects a missing category', () => {
    expectViolation(
      publishAttraction(
        { ...attraction, categoryCodes: [] },
        localizations,
        criticalFacts,
        scopeGeometry,
      ),
      'CATEGORY_MISSING',
    );
  });

  it('rejects unverified critical facts', () => {
    expectViolation(
      publishAttraction(
        attraction,
        localizations,
        { ...criticalFacts, hours: 'UNVERIFIED' },
        scopeGeometry,
      ),
      'CRITICAL_FACT_UNVERIFIED',
    );
  });

  it('rejects an unjustified scope exception', () => {
    expectViolation(
      publishAttraction(
        { ...attraction, scopeException: true, scopeExceptionReason: null },
        localizations,
        criticalFacts,
        scopeGeometry,
      ),
      'SCOPE_EXCEPTION_REASON_REQUIRED',
    );
  });

  it('rejects out-of-band coordinates without a scope rule', () => {
    expectViolation(
      publishAttraction(
        { ...attraction, coordinates: { latitude: 47.4, longitude: 9.17 }, municipality: 'Salem' },
        localizations,
        criticalFacts,
        scopeGeometry,
      ),
      'OUT_OF_SCOPE',
    );
  });
});
