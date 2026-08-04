import { randomUUID } from 'node:crypto';

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assignRegion,
  computeShorelineDistanceM,
  isShorelineMunicipality,
  isWithinShorelineBand,
  readShorelineBandKm,
  readWgs84Point,
  recomputeShorelineDistances,
} from './geo.js';
import { seedGeoData } from './geo-seed.js';

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
  await client!.$executeRawUnsafe('TRUNCATE TABLE shoreline_geometry CASCADE;');
  await client!.$executeRawUnsafe('TRUNCATE TABLE shoreline_municipality CASCADE;');
  await seedGeoData(client!);
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

describeDatabase('geographic seed data', () => {
  it('loads nine regions and is idempotent', async () => {
    await seedGeoData(client!);

    const rows = await client!.$queryRawUnsafe<
      ReadonlyArray<{ regions: bigint; shorelines: bigint; municipalities: bigint }>
    >(`
      SELECT
        (SELECT count(*) FROM region WHERE code <> 'TEST_REGION') AS regions,
        (SELECT count(*) FROM shoreline_geometry) AS shorelines,
        (SELECT count(*) FROM shoreline_municipality) AS municipalities;
    `);

    expect(rows[0]).toEqual({ regions: 9n, shorelines: 1n, municipalities: 17n });
  });

  it('computes the documented known-point shoreline distances', async () => {
    await expect(
      computeShorelineDistanceM(client!, { latitude: 47.706, longitude: 9.195 }),
    ).resolves.toBeLessThanOrEqual(300);
    await expect(
      computeShorelineDistanceM(client!, { latitude: 47.6634, longitude: 9.1755 }),
    ).resolves.toBeLessThan(1_000);
    await expect(
      computeShorelineDistanceM(client!, { latitude: 47.772, longitude: 9.295 }),
    ).resolves.toBeGreaterThanOrEqual(6_000);
    await expect(
      computeShorelineDistanceM(client!, { latitude: 47.772, longitude: 9.295 }),
    ).resolves.toBeLessThanOrEqual(8_000);
    await expect(
      computeShorelineDistanceM(client!, { latitude: 47.659, longitude: 8.859 }),
    ).resolves.toBeLessThan(1_000);
    await expect(
      computeShorelineDistanceM(client!, { latitude: 47.249, longitude: 9.343 }),
    ).resolves.toBeGreaterThan(5_000);
  });

  it('assigns every product-region anchor to its documented region', async () => {
    await expect(assignRegion(client!, { latitude: 47.77, longitude: 9.17 })).resolves.toBe(
      'UEBERLINGER_SEE',
    );
    await expect(assignRegion(client!, { latitude: 47.65, longitude: 9.48 })).resolves.toBe(
      'OBERSEE_NORD',
    );
    await expect(assignRegion(client!, { latitude: 47.55, longitude: 9.69 })).resolves.toBe(
      'BAYERN_UFER',
    );
    await expect(assignRegion(client!, { latitude: 47.5, longitude: 9.75 })).resolves.toBe(
      'VORARLBERG_UFER',
    );
    await expect(assignRegion(client!, { latitude: 47.48, longitude: 9.5 })).resolves.toBe(
      'OBERSEE_SUED',
    );
    await expect(assignRegion(client!, { latitude: 47.64, longitude: 9.18 })).resolves.toBe(
      'THURGAU_UFER',
    );
    await expect(assignRegion(client!, { latitude: 47.6634, longitude: 9.1755 })).resolves.toBe(
      'KONSTANZ_SEERHEIN',
    );
    await expect(assignRegion(client!, { latitude: 47.74, longitude: 8.97 })).resolves.toBe(
      'UNTERSEE_NORD',
    );
    await expect(assignRegion(client!, { latitude: 47.659, longitude: 8.859 })).resolves.toBe(
      'UNTERSEE_SUED',
    );
  });

  it('uses the configured shoreline band and municipality lookup', async () => {
    const affenberg = { latitude: 47.772, longitude: 9.295 };

    expect(readShorelineBandKm('7')).toBe(7);
    await expect(isWithinShorelineBand(client!, affenberg, 5)).resolves.toBe(false);
    await expect(isWithinShorelineBand(client!, affenberg, 7)).resolves.toBe(true);
    await expect(isShorelineMunicipality(client!, 'Konstanz')).resolves.toBe(true);
    await expect(isShorelineMunicipality(client!, 'Salem')).resolves.toBe(false);
  });

  it('recomputes stored attraction distances from the active shoreline', async () => {
    const attractionId = await createAttraction();

    await expect(recomputeShorelineDistances(client!)).resolves.toBeGreaterThan(0);
    const rows = await client!.$queryRawUnsafe<ReadonlyArray<{ distanceM: number }>>(`
      SELECT shoreline_distance_m AS "distanceM"
      FROM attraction
      WHERE id = '${attractionId}';
    `);

    expect(rows[0]?.distanceM).toBeLessThan(1_000);
  });
});
