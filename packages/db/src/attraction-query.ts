import { Prisma, PrismaClient } from '@prisma/client';

import type { Wgs84Bounds } from './geo.js';

export type AttractionFilter = Readonly<{
  age?: readonly string[] | undefined;
  audience?: readonly string[] | undefined;
  cafe?: boolean | undefined;
  cat?: readonly string[] | undefined;
  dogs?: boolean | undefined;
  dur?: readonly string[] | undefined;
  food?: boolean | undefined;
  heat?: string | undefined;
  interest?: readonly string[] | undefined;
  io?: readonly string[] | undefined;
  lang?: readonly string[] | undefined;
  mode?: readonly string[] | undefined;
  near?: Readonly<{ latitude: number; longitude: number }> | undefined;
  noresv?: boolean | undefined;
  picnic?: boolean | undefined;
  price?: readonly string[] | undefined;
  r?: number | undefined;
  rain?: string | undefined;
  region?: readonly string[] | undefined;
  season?: readonly string[] | undefined;
  stroller?: boolean | undefined;
  wheelchair?: boolean | undefined;
}>;

const enumType = (type: string) => Prisma.raw(`"${type}"`);

function enumValue(value: string, type: string) {
  return Prisma.sql`${value}::${enumType(type)}`;
}

function enumArray(values: readonly string[], type: string) {
  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}`))}]::${enumType(type)}[]`;
}

function inEnum(column: string, values: readonly string[], type: string) {
  return Prisma.sql`${Prisma.raw(column)} IN (${Prisma.join(values.map((value) => enumValue(value, type)))})`;
}

function mapValues(
  values: readonly string[],
  mapping: Readonly<Record<string, string>>,
): readonly string[] | null {
  const mapped = values.map((value) => mapping[value]);
  return mapped.some((value) => value === undefined) ? null : (mapped as string[]);
}

function suitabilityFilter(column: string, value: string | undefined) {
  if (!value) return null;
  const ranks = { POOR: 0, OK: 1, GOOD: 2, EXCELLENT: 3 } as const;
  const rank = ranks[value.toUpperCase() as keyof typeof ranks];
  if (rank === undefined) return Prisma.sql`FALSE`;
  return Prisma.sql`(${Prisma.raw(column)} IS NULL OR CASE ${Prisma.raw(column)}
    WHEN 'POOR'::"Suitability" THEN 0
    WHEN 'OK'::"Suitability" THEN 1
    WHEN 'GOOD'::"Suitability" THEN 2
    WHEN 'EXCELLENT'::"Suitability" THEN 3
    ELSE -1
  END >= ${rank})`;
}

function durationFilter(values: readonly string[]) {
  const bands: Record<string, Prisma.Sql> = {
    under_1h: Prisma.sql`typical_duration_min < 60 AND typical_duration_max > 0`,
    '1-2h': Prisma.sql`typical_duration_min < 120 AND typical_duration_max > 60`,
    '1_2h': Prisma.sql`typical_duration_min < 120 AND typical_duration_max > 60`,
    '2-4h': Prisma.sql`typical_duration_min < 240 AND typical_duration_max > 120`,
    '2_4h': Prisma.sql`typical_duration_min < 240 AND typical_duration_max > 120`,
    half_day: Prisma.sql`typical_duration_min < 360 AND typical_duration_max > 240`,
    full_day: Prisma.sql`typical_duration_max > 360`,
  };
  const conditions = values
    .map((value) => bands[value])
    .filter((value): value is Prisma.Sql => value !== undefined);
  if (conditions.length !== values.length) return Prisma.sql`FALSE`;
  return Prisma.sql`(typical_duration_min IS NULL OR typical_duration_max IS NULL OR ${Prisma.join(conditions, ' OR ')})`;
}

export function hasActiveAttractionFilter(filter: AttractionFilter): boolean {
  return [
    filter.age,
    filter.audience,
    filter.cafe,
    filter.cat,
    filter.dogs,
    filter.dur,
    filter.food,
    filter.heat,
    filter.interest,
    filter.io,
    filter.lang,
    filter.mode,
    filter.near,
    filter.noresv,
    filter.picnic,
    filter.price,
    filter.r,
    filter.rain,
    filter.region,
    filter.season,
    filter.stroller,
    filter.wheelchair,
  ].some((value) => value !== undefined);
}

export function buildAttractionFilterSql(filter: AttractionFilter): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];

  if (filter.region) {
    clauses.push(Prisma.sql`attraction.region_code IN (${Prisma.join(filter.region)})`);
  }
  if (filter.cat) {
    clauses.push(Prisma.sql`EXISTS (
      SELECT 1 FROM attraction_category
      INNER JOIN category ON category.id = attraction_category.category_id
      WHERE attraction_category.attraction_id = attraction.id
        AND (
          category.code IN (${Prisma.join(filter.cat)})
          OR EXISTS (
            SELECT 1 FROM category AS parent_category
            WHERE parent_category.id = category.parent_category_id
              AND parent_category.code IN (${Prisma.join(filter.cat)})
          )
        )
    )`);
  }
  if (filter.interest) {
    clauses.push(Prisma.sql`(
      NOT EXISTS (
        SELECT 1 FROM attraction_interest
        WHERE attraction_interest.attraction_id = attraction.id
      )
      OR EXISTS (
        SELECT 1 FROM attraction_interest
        INNER JOIN interest ON interest.id = attraction_interest.interest_id
        WHERE attraction_interest.attraction_id = attraction.id
          AND interest.code IN (${Prisma.join(filter.interest)})
      )
    )`);
  }
  if (filter.audience) {
    clauses.push(Prisma.sql`(
      NOT EXISTS (
        SELECT 1 FROM attraction_audience
        WHERE attraction_audience.attraction_id = attraction.id
      )
      OR EXISTS (
        SELECT 1 FROM attraction_audience
        INNER JOIN audience ON audience.id = attraction_audience.audience_id
        WHERE attraction_audience.attraction_id = attraction.id
          AND audience.code IN (${Prisma.join(filter.audience)})
      )
    )`);
  }
  if (filter.age) {
    clauses.push(Prisma.sql`child_age_bands && ${enumArray(filter.age, 'ChildAgeBand')}`);
  }

  if (filter.io) {
    const indoorOutdoor = mapValues(filter.io, {
      indoor: 'INDOOR',
      outdoor: 'OUTDOOR',
      mixed: 'MIXED',
    });
    if (!indoorOutdoor) clauses.push(Prisma.sql`FALSE`);
    else {
      const expanded = new Set(indoorOutdoor);
      if (expanded.has('INDOOR') || expanded.has('OUTDOOR')) expanded.add('MIXED');
      clauses.push(inEnum('attraction.indoor_outdoor', [...expanded], 'IndoorOutdoor'));
    }
  }

  const rain = suitabilityFilter('attraction.rain_suitability', filter.rain);
  const heat = suitabilityFilter('attraction.heat_suitability', filter.heat);
  if (rain) clauses.push(rain);
  if (heat) clauses.push(heat);

  if (filter.season) {
    clauses.push(
      Prisma.sql`(
        cardinality(seasons) = 0
        OR seasons && ${enumArray([...new Set([...filter.season, 'ALL_YEAR'])], 'Season')}
      )`,
    );
  }
  if (filter.price) {
    const prices = mapValues(filter.price, {
      free: 'FREE',
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      premium: 'PREMIUM',
    });
    if (!prices) clauses.push(Prisma.sql`FALSE`);
    else {
      clauses.push(
        Prisma.sql`(attraction.price_level IS NULL OR ${inEnum('attraction.price_level', prices, 'PriceLevel')})`,
      );
    }
  }
  if (filter.dur) clauses.push(durationFilter(filter.dur));

  if (filter.mode) {
    const modes = mapValues(filter.mode, {
      walk: 'WALK',
      bicycle: 'BICYCLE',
      bike: 'BICYCLE',
      pt: 'PUBLIC_TRANSPORT',
      public_transport: 'PUBLIC_TRANSPORT',
      car: 'CAR',
    });
    if (!modes) clauses.push(Prisma.sql`FALSE`);
    else clauses.push(Prisma.sql`transport_modes && ${enumArray(modes, 'TransportMode')}`);
  }
  if (filter.lang) {
    const languages = mapValues(filter.lang, { de: 'DE', en: 'EN', fr: 'FR', it: 'IT' });
    if (!languages) clauses.push(Prisma.sql`FALSE`);
    else {
      clauses.push(
        Prisma.sql`(cardinality(visitor_languages) = 0 OR visitor_languages && ${enumArray(languages, 'VisitorLanguage')})`,
      );
    }
  }

  if (filter.food) clauses.push(Prisma.sql`(food_on_site IS NULL OR food_on_site = TRUE)`);
  if (filter.cafe) clauses.push(Prisma.sql`(cafe_on_site IS NULL OR cafe_on_site = TRUE)`);
  if (filter.picnic) clauses.push(Prisma.sql`(picnic_allowed IS NULL OR picnic_allowed = TRUE)`);
  if (filter.noresv) clauses.push(Prisma.sql`booking_requirement = 'NONE'::"BookingRequirement"`);
  if (filter.wheelchair) {
    clauses.push(
      Prisma.sql`wheelchair_access IN ('FULL'::"WheelchairAccess", 'PARTIAL'::"WheelchairAccess")`,
    );
  }
  if (filter.stroller) {
    clauses.push(
      Prisma.sql`stroller_suitable IN ('YES'::"StrollerSuitability", 'PARTIAL'::"StrollerSuitability")`,
    );
  }
  if (filter.dogs) {
    clauses.push(Prisma.sql`dog_policy IN ('ALLOWED'::"DogPolicy", 'LEASHED'::"DogPolicy")`);
  }

  if (filter.near && filter.r !== undefined) {
    clauses.push(Prisma.sql`location IS NOT NULL AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(${filter.near.longitude}, ${filter.near.latitude}), 4326)::geography,
      ${filter.r * 1_000}
    )`);
  }

  return clauses.length ? Prisma.join(clauses, ' AND ') : Prisma.sql`TRUE`;
}

export async function findPublishedAttractionIds(
  client: PrismaClient,
  filter: AttractionFilter,
  bounds?: Wgs84Bounds,
): Promise<readonly string[]> {
  const boundsClause = bounds
    ? Prisma.sql`AND location IS NOT NULL AND ST_Intersects(
        location::geometry,
        ST_MakeEnvelope(${bounds.west}, ${bounds.south}, ${bounds.east}, ${bounds.north}, 4326)
      )`
    : Prisma.empty;
  const rows = await client.$queryRaw<ReadonlyArray<{ id: string }>>(Prisma.sql`
    SELECT attraction.id::text AS id
    FROM attraction
    WHERE attraction.status = 'PUBLISHED'::"AttractionStatus"
      AND ${buildAttractionFilterSql(filter)}
      ${boundsClause}
  `);
  return rows.map((row) => row.id);
}
