import { Prisma, PrismaClient } from '@prisma/client';

export type Wgs84Point = Readonly<{
  latitude: number;
  longitude: number;
}>;

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
