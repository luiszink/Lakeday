import { Prisma, PrismaClient } from '@prisma/client';
import process from 'node:process';

export type DatabaseExecutor = PrismaClient | Prisma.TransactionClient;

export type Wgs84Point = Readonly<{
  latitude: number;
  longitude: number;
}>;

export async function createAttractionShell(
  client: DatabaseExecutor,
  input: Readonly<{
    id: string;
    point: Wgs84Point;
    countryCode: string;
    municipality: string;
    regionCode: string;
    indoorOutdoor: string;
  }>,
): Promise<void> {
  await client.$executeRaw(
    Prisma.sql`
      INSERT INTO attraction (id, location, country_code, municipality, region_code, indoor_outdoor, updated_at)
      VALUES (
        ${input.id}::uuid,
        ST_SetSRID(ST_MakePoint(${input.point.longitude}, ${input.point.latitude}), 4326)::geography,
        ${input.countryCode}::"CountryCode",
        ${input.municipality},
        ${input.regionCode},
        ${input.indoorOutdoor}::"IndoorOutdoor",
        CURRENT_TIMESTAMP
      )
    `,
  );
}

export async function updateAttractionPoint(
  client: DatabaseExecutor,
  attractionId: string,
  point: Wgs84Point,
): Promise<void> {
  await client.$executeRaw(
    Prisma.sql`
      UPDATE attraction
      SET location = ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326)::geography,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${attractionId}::uuid
    `,
  );
}

type GeoJsonPoint = Readonly<{
  coordinates: readonly [number, number];
}>;

export async function readWgs84Point(
  client: PrismaClient,
  attractionId: string,
): Promise<Wgs84Point | null> {
  const rows = await client.$queryRaw<ReadonlyArray<{ point: GeoJsonPoint }>>(
    Prisma.sql`SELECT ST_AsGeoJSON(location)::json AS point FROM attraction WHERE id = ${attractionId}::uuid`,
  );
  const point = rows[0]?.point;

  if (!point) {
    return null;
  }

  return {
    longitude: point.coordinates[0],
    latitude: point.coordinates[1],
  };
}

export function readShorelineBandKm(value = process.env.SCOPE_SHORELINE_BAND_KM): number {
  if (!value) {
    return 5;
  }

  const bandKm = Number(value);
  if (!Number.isFinite(bandKm) || bandKm <= 0) {
    throw new Error('SCOPE_SHORELINE_BAND_KM must be a positive number.');
  }

  return bandKm;
}

export async function computeShorelineDistanceM(
  client: PrismaClient,
  point: Wgs84Point,
): Promise<number> {
  const rows = await client.$queryRaw<ReadonlyArray<{ distanceM: number }>>(
    Prisma.sql`
      SELECT ROUND(ST_Distance(
        geometry,
        ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326)::geography
      ))::integer AS "distanceM"
      FROM shoreline_geometry
      ORDER BY loaded_at DESC
      LIMIT 1;
    `,
  );
  const distanceM = rows[0]?.distanceM;

  if (distanceM === undefined) {
    throw new Error('No shoreline geometry is loaded.');
  }

  return distanceM;
}

export async function assignRegion(
  client: PrismaClient,
  point: Wgs84Point,
): Promise<string | null> {
  const rows = await client.$queryRaw<ReadonlyArray<{ code: string }>>(
    Prisma.sql`
      SELECT code
      FROM region
      WHERE ST_Covers(
        polygon::geometry,
        ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326)
      )
      ORDER BY sort_order
      LIMIT 1;
    `,
  );

  return rows[0]?.code ?? null;
}

export async function isWithinShorelineBand(
  client: PrismaClient,
  point: Wgs84Point,
  bandKm = readShorelineBandKm(),
): Promise<boolean> {
  return (await computeShorelineDistanceM(client, point)) <= bandKm * 1_000;
}

export async function isShorelineMunicipality(
  client: PrismaClient,
  municipality: string,
): Promise<boolean> {
  const rows = await client.$queryRaw<ReadonlyArray<{ matches: boolean }>>(
    Prisma.sql`
      SELECT EXISTS(
        SELECT 1
        FROM shoreline_municipality
        WHERE lower(name) = lower(${municipality})
      ) AS matches;
    `,
  );

  return rows[0]?.matches ?? false;
}

export async function recomputeShorelineDistances(client: PrismaClient): Promise<number> {
  return client.$executeRaw(
    Prisma.sql`
      UPDATE attraction
      SET shoreline_distance_m = distances.distance_m,
          updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT attraction.id, ROUND(ST_Distance(attraction.location, shoreline.geometry))::integer AS distance_m
        FROM attraction
        CROSS JOIN LATERAL (
          SELECT geometry
          FROM shoreline_geometry
          ORDER BY loaded_at DESC
          LIMIT 1
        ) AS shoreline
      ) AS distances
      WHERE attraction.id = distances.id;
    `,
  );
}
