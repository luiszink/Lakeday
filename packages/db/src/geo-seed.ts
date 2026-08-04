import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Prisma, PrismaClient } from '@prisma/client';

type GeoJsonGeometry = Readonly<{
  type: string;
  coordinates: unknown;
}>;

type RegionFeature = Readonly<{
  type: 'Feature';
  properties: Readonly<{
    code: string;
    nameDe: string;
    nameEn: string;
    sortOrder: number;
  }>;
  geometry: GeoJsonGeometry;
}>;

type ShorelineFeature = Readonly<{
  type: 'Feature';
  properties: Readonly<{
    version: string;
    sourceUrl: string;
    licence: string;
  }>;
  geometry: GeoJsonGeometry;
}>;

const geographicDataDirectory = fileURLToPath(new URL('../../../data/geo/', import.meta.url));

const shorelineMunicipalities = [
  ['DE_BODMAN_LUDWIGSHAFEN', 'Bodman-Ludwigshafen', 'DE'],
  ['DE_FRIEDRICHSHAFEN', 'Friedrichshafen', 'DE'],
  ['DE_KONSTANZ', 'Konstanz', 'DE'],
  ['DE_KRESSBRONN', 'Kressbronn am Bodensee', 'DE'],
  ['DE_LANGENARGEN', 'Langenargen', 'DE'],
  ['DE_LINDAU', 'Lindau', 'DE'],
  ['DE_MEERSBURG', 'Meersburg', 'DE'],
  ['DE_RADOLFZELL', 'Radolfzell am Bodensee', 'DE'],
  ['DE_REICHENAU', 'Reichenau', 'DE'],
  ['DE_UEBERLINGEN', 'Überlingen', 'DE'],
  ['AT_BREGENZ', 'Bregenz', 'AT'],
  ['AT_HARD', 'Hard', 'AT'],
  ['CH_KREUZLINGEN', 'Kreuzlingen', 'CH'],
  ['CH_ROMANSHORN', 'Romanshorn', 'CH'],
  ['CH_RORSCHACH', 'Rorschach', 'CH'],
  ['CH_STECKBORN', 'Steckborn', 'CH'],
  ['CH_STEIN_AM_RHEIN', 'Stein am Rhein', 'CH'],
] as const;

async function readGeoJson<T>(fileUrl: URL): Promise<T> {
  return JSON.parse(await readFile(fileUrl, 'utf8')) as T;
}

export async function seedGeoData(client: PrismaClient): Promise<void> {
  const shoreline = await readGeoJson<ShorelineFeature>(
    new URL('shoreline.geojson', `file://${geographicDataDirectory}/`),
  );
  const regionsDirectory = new URL('regions/', `file://${geographicDataDirectory}/`);
  const regionFiles = (await readdir(fileURLToPath(regionsDirectory)))
    .filter((fileName) => fileName.endsWith('.geojson'))
    .sort();

  await client.$executeRaw(
    Prisma.sql`
      INSERT INTO shoreline_geometry (id, version, geometry, source_url, licence)
      VALUES (
        gen_random_uuid(),
        ${shoreline.properties.version},
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(shoreline.geometry)}), 4326)::geography,
        ${shoreline.properties.sourceUrl},
        ${shoreline.properties.licence}
      )
      ON CONFLICT (version) DO UPDATE SET
        geometry = EXCLUDED.geometry,
        source_url = EXCLUDED.source_url,
        licence = EXCLUDED.licence,
        loaded_at = CURRENT_TIMESTAMP;
    `,
  );

  for (const regionFile of regionFiles) {
    const region = await readGeoJson<RegionFeature>(new URL(regionFile, regionsDirectory));
    await client.$executeRaw(
      Prisma.sql`
        INSERT INTO region (code, name_de, name_en, polygon, sort_order)
        VALUES (
          ${region.properties.code},
          ${region.properties.nameDe},
          ${region.properties.nameEn},
          ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(region.geometry)}), 4326)::geography,
          ${region.properties.sortOrder}
        )
        ON CONFLICT (code) DO UPDATE SET
          name_de = EXCLUDED.name_de,
          name_en = EXCLUDED.name_en,
          polygon = EXCLUDED.polygon,
          sort_order = EXCLUDED.sort_order;
      `,
    );
  }

  for (const [code, name, countryCode] of shorelineMunicipalities) {
    await client.$executeRaw(
      Prisma.sql`
        INSERT INTO shoreline_municipality (code, name, country_code)
        VALUES (${code}, ${name}, ${countryCode}::"CountryCode")
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
      `,
    );
  }
}
