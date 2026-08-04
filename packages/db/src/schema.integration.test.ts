import { randomUUID } from 'node:crypto';

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readWgs84Point } from './geo.js';

config({ path: '../../.env' });

const databaseUrl = process.env.DATABASE_URL;
const client = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const describeDatabase = databaseUrl ? describe : describe.skip;

async function createAttraction(): Promise<string> {
  const rows = await client!.$queryRawUnsafe<ReadonlyArray<{ id: string }>>(`
    INSERT INTO attraction (
      id, location, country_code, municipality, region_code, indoor_outdoor,
      seasons, child_age_bands, visitor_languages, transport_modes, updated_at
    ) VALUES (
      gen_random_uuid(),
      ST_SetSRID(ST_MakePoint(9.176, 47.677), 4326)::geography,
      'DE', 'Konstanz', 'TEST_REGION', 'OUTDOOR',
      ARRAY[]::"Season"[], ARRAY[]::"ChildAgeBand"[],
      ARRAY[]::"VisitorLanguage"[], ARRAY[]::"TransportMode"[], NOW()
    )
    RETURNING id;
  `);

  return rows[0]!.id;
}

beforeAll(async () => {
  await client!.$executeRawUnsafe('TRUNCATE TABLE attraction CASCADE;');
  await client!.$executeRawUnsafe('TRUNCATE TABLE region CASCADE;');
  await client!.$executeRawUnsafe(`
    INSERT INTO region (code, name_de, name_en)
    VALUES ('TEST_REGION', 'Testregion', 'Test region');
  `);
});

afterAll(async () => {
  await client?.$disconnect();
});

describeDatabase('initial schema constraints', () => {
  it('requires a reason for a scope exception', async () => {
    await expect(
      client!.$executeRawUnsafe(`
        INSERT INTO attraction (
          id, location, country_code, municipality, region_code, indoor_outdoor,
          seasons, child_age_bands, visitor_languages, transport_modes,
          scope_exception, updated_at
        ) VALUES (
          gen_random_uuid(),
          ST_SetSRID(ST_MakePoint(9.176, 47.677), 4326)::geography,
          'DE', 'Konstanz', 'TEST_REGION', 'OUTDOOR',
          ARRAY[]::"Season"[], ARRAY[]::"ChildAgeBand"[],
          ARRAY[]::"VisitorLanguage"[], ARRAY[]::"TransportMode"[], true, NOW()
        );
      `),
    ).rejects.toThrow();
  });

  it('enforces localized slug and external identifier uniqueness', async () => {
    const attractionId = await createAttraction();
    await client!.$executeRawUnsafe(`
      INSERT INTO attraction_localization (id, attraction_id, locale, name, slug, updated_at)
      VALUES (gen_random_uuid(), '${attractionId}', 'de', 'Test', 'test', NOW());
    `);
    await expect(
      client!.$executeRawUnsafe(`
        INSERT INTO attraction_localization (id, attraction_id, locale, name, slug, updated_at)
        VALUES (gen_random_uuid(), '${attractionId}', 'de', 'Test', 'another-test', NOW());
      `),
    ).rejects.toThrow();

    const otherAttractionId = await createAttraction();
    await expect(
      client!.$executeRawUnsafe(`
        INSERT INTO attraction_localization (id, attraction_id, locale, name, slug, updated_at)
        VALUES (gen_random_uuid(), '${otherAttractionId}', 'de', 'Test', 'test', NOW());
      `),
    ).rejects.toThrow();

    await client!.$executeRawUnsafe(`
      INSERT INTO external_identifier (id, attraction_id, system, external_id)
      VALUES (gen_random_uuid(), '${attractionId}', 'OSM', '12345');
    `);
    await expect(
      client!.$executeRawUnsafe(`
        INSERT INTO external_identifier (id, attraction_id, system, external_id)
        VALUES (gen_random_uuid(), '${attractionId}', 'OSM', '12345');
      `),
    ).rejects.toThrow();
  });

  it('enforces share token and plan stop ordering uniqueness', async () => {
    const attractionId = await createAttraction();
    const shareToken = `token-${randomUUID()}`;
    const plans = await client!.$queryRawUnsafe<ReadonlyArray<{ id: string }>>(`
      INSERT INTO plan (id, share_token, locale)
      VALUES (gen_random_uuid(), '${shareToken}', 'de')
      RETURNING id;
    `);
    const planId = plans[0]!.id;

    await expect(
      client!.$executeRawUnsafe(`
        INSERT INTO plan (id, share_token, locale)
        VALUES (gen_random_uuid(), '${shareToken}', 'en');
      `),
    ).rejects.toThrow();

    await client!.$executeRawUnsafe(`
      INSERT INTO plan_stop (id, plan_id, attraction_id, sort_index)
      VALUES (gen_random_uuid(), '${planId}', '${attractionId}', 0);
    `);
    await expect(
      client!.$executeRawUnsafe(`
        INSERT INTO plan_stop (id, plan_id, attraction_id, sort_index)
        VALUES (gen_random_uuid(), '${planId}', '${attractionId}', 0);
      `),
    ).rejects.toThrow();
  });

  it('round-trips a WGS84 point through the typed geo helper', async () => {
    const attractionId = await createAttraction();

    await expect(readWgs84Point(client!, attractionId)).resolves.toEqual({
      latitude: 47.677,
      longitude: 9.176,
    });
  });
});
