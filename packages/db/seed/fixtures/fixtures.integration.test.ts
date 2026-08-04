import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { publishAttraction } from '../../../domain/src/index.ts';
import { seedGeoData } from '../../src/geo-seed.js';
import { seedHolidayCalendars } from '../holidays.js';
import { seedLicences } from '../licences.js';
import { seedVocabularies } from '../vocabularies.js';
import { fixtureAttractions, fixtureIds } from './data.js';
import { seedFixtures } from './loader.js';

config({ path: '../../.env' });

const databaseUrl = process.env.DATABASE_URL;
const client = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const describeDatabase = databaseUrl ? describe : describe.skip;

beforeAll(async () => {
  if (!client) return;
  await seedGeoData(client);
  await seedVocabularies(client);
  await seedLicences(client);
  await seedHolidayCalendars(client);
  await seedFixtures(client);
});

afterAll(async () => {
  await client?.$disconnect();
});

describeDatabase('synthetic fixtures', () => {
  it('loads at least forty fixtures across every region, country, and category', async () => {
    const [attractionCount, regions, countries, priceLevels, uncoveredCategories] =
      await Promise.all([
        client!.attraction.count({ where: { id: { in: fixtureAttractions.map(({ id }) => id) } } }),
        client!.attraction.findMany({
          where: { id: { in: fixtureAttractions.map(({ id }) => id) } },
          distinct: ['regionCode'],
          select: { regionCode: true },
        }),
        client!.attraction.findMany({
          where: { id: { in: fixtureAttractions.map(({ id }) => id) } },
          distinct: ['countryCode'],
          select: { countryCode: true },
        }),
        client!.attraction.findMany({
          where: { id: { in: fixtureAttractions.map(({ id }) => id) } },
          distinct: ['priceLevel'],
          select: { priceLevel: true },
        }),
        client!.$queryRaw<ReadonlyArray<{ code: string }>>`
        SELECT category.code
        FROM category
        LEFT JOIN attraction_category ON attraction_category.category_id = category.id
        LEFT JOIN attraction ON attraction.id = attraction_category.attraction_id
          AND attraction.id = ANY(${fixtureAttractions.map(({ id }) => id)}::uuid[])
        GROUP BY category.code
        HAVING count(attraction.id) = 0;
      `,
      ]);

    expect(attractionCount).toBeGreaterThanOrEqual(40);
    expect(regions).toHaveLength(9);
    expect(countries.map(({ countryCode }) => countryCode).sort()).toEqual(['AT', 'CH', 'DE']);
    expect(priceLevels.map(({ priceLevel }) => priceLevel).sort()).toEqual([
      'FREE',
      'HIGH',
      'LOW',
      'MEDIUM',
      'PREMIUM',
    ]);
    expect(uncoveredCategories).toEqual([]);
  });

  it('contains all documented edge cases at stable IDs', async () => {
    const fixtures = await client!.attraction.findMany({
      where: { id: { in: Object.values(fixtureIds) } },
      include: { openingSchedule: true, prices: true, localizations: true },
    });
    const byId = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

    expect(byId.get(fixtureIds['fixture-unknown-hours']!)?.openingSchedule?.hoursUnknown).toBe(
      true,
    );
    expect(
      byId.get(fixtureIds['fixture-chf-price']!)?.prices.some(({ currency }) => currency === 'CHF'),
    ).toBe(true);
    expect(byId.get(fixtureIds['fixture-scope-exception']!)?.scopeExceptionReason).toContain(
      'Synthetic',
    );
    expect(
      byId
        .get(fixtureIds['fixture-stale-facts']!)
        ?.localizations.some(({ translationState }) => translationState === 'STALE'),
    ).toBe(true);
    expect(byId.get(fixtureIds['fixture-near-duplicate-a']!)).toBeDefined();
    expect(byId.get(fixtureIds['fixture-near-duplicate-b']!)).toBeDefined();
    expect(fixtures.some(({ wheelchairAccess }) => wheelchairAccess === 'FULL')).toBe(true);
    expect(fixtures.some(({ wheelchairAccess }) => wheelchairAccess === 'UNKNOWN')).toBe(true);
  });

  it('is idempotent and keeps every published fixture valid in the domain', async () => {
    await seedFixtures(client!);
    const fixtures = await client!.attraction.findMany({
      where: { id: { in: fixtureAttractions.map(({ id }) => id) } },
      include: { categories: { include: { category: true } }, localizations: true },
    });

    expect(fixtures).toHaveLength(fixtureAttractions.length);
    for (const fixture of fixtures.filter(({ status }) => status === 'PUBLISHED')) {
      const result = publishAttraction(
        {
          id: fixture.id,
          status: fixture.status,
          countryCode: fixture.countryCode,
          municipality: fixture.municipality,
          regionCode: fixture.regionCode,
          coordinates: { latitude: 47.6, longitude: 9.17 },
          categoryCodes: fixture.categories.map(({ category }) => category.code),
          scopeException: fixture.scopeException,
          scopeExceptionReason: fixture.scopeExceptionReason,
          editorialRelevance: 'MEDIUM',
          verificationState: fixture.verificationState,
          indoorOutdoor: fixture.indoorOutdoor,
          rainSuitability: fixture.rainSuitability,
          heatSuitability: fixture.heatSuitability,
          seasons: fixture.seasons,
          childAgeBands: fixture.childAgeBands.map((value) =>
            value.replace('AGE_', '').replace('_PLUS', '+').replace('_', '-'),
          ) as ('0-2' | '3-5' | '6-9' | '10-13' | '14+')[],
          priceLevel: fixture.priceLevel,
          bookingRequirement: fixture.bookingRequirement,
          strollerSuitable: fixture.strollerSuitable ?? 'UNKNOWN',
          wheelchairAccess: fixture.wheelchairAccess ?? 'UNKNOWN',
          dogPolicy: fixture.dogPolicy ?? 'UNKNOWN',
          visitorLanguages: fixture.visitorLanguages,
          transportModes: fixture.transportModes,
        },
        fixture.localizations,
        { name: 'VERIFIED', location: 'VERIFIED', hours: 'VERIFIED' },
        { isWithinShorelineBand: () => true, isShorelineMunicipality: () => false },
      );
      expect(result.ok).toBe(true);
    }
  });

  it('refuses to load synthetic fixtures in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(seedFixtures(client!)).rejects.toThrow('must not be loaded in production');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
