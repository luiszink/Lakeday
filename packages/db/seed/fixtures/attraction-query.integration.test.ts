import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedGeoData } from '../../src/geo-seed.js';
import { findPublishedAttractionIds, type AttractionFilter } from '../../src/attraction-query.js';
import { searchPublishedAttractions } from '../../src/search.js';
import { seedHolidayCalendars } from '../holidays.js';
import { seedLicences } from '../licences.js';
import { seedVocabularies } from '../vocabularies.js';
import { fixtureIds } from './data.js';
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

describeDatabase('attraction filter query', () => {
  async function ids(filter: AttractionFilter) {
    return new Set(await findPublishedAttractionIds(client!, filter));
  }

  it('applies category, region, price, and wheelchair must filters', async () => {
    const playgrounds = await ids({ cat: ['playground'] });
    const konstanz = await ids({ region: ['KONSTANZ_SEERHEIN'] });
    const free = await ids({ price: ['free'] });
    const wheelchair = await ids({ wheelchair: true });

    expect(playgrounds.has(fixtureIds['fixture-playground']!)).toBe(true);
    expect(konstanz.has(fixtureIds['fixture-playground']!)).toBe(true);
    expect(free.size).toBeGreaterThan(0);
    expect(wheelchair.has(fixtureIds['fixture-church_monastery']!)).toBe(false);
    expect(wheelchair.has(fixtureIds['fixture-playground']!)).toBe(true);
  });

  it('treats mixed as both indoor and outdoor and keeps nice unknowns', async () => {
    const indoor = await ids({ io: ['indoor'] });
    const outdoor = await ids({ io: ['outdoor'] });
    const food = await ids({ food: true });
    const languages = await ids({ lang: ['fr'] });

    expect(indoor.has(fixtureIds['fixture-island']!)).toBe(true);
    expect(outdoor.has(fixtureIds['fixture-island']!)).toBe(true);
    expect(food.size).toBeGreaterThan(0);
    expect(languages.size).toBeGreaterThan(0);
  });

  it('enforces the P3 age, stroller, and radius combination', async () => {
    const matches = await ids({
      age: ['0-2'],
      stroller: true,
      near: { latitude: 47.661, longitude: 9.175 },
      r: 5,
    });

    expect([...matches]).toEqual([fixtureIds['fixture-playground']!]);
  });

  it('composes filtered candidates with full-text search', async () => {
    const allowedIds = await ids({ cat: ['playground'] });
    const result = await searchPublishedAttractions(client!, {
      allowedIds: [...allowedIds],
      locale: 'de',
      limit: 20,
      query: 'playground',
    });

    expect(result.matches.map(({ id }) => id)).toEqual([fixtureIds['fixture-playground']!]);
  });
});
