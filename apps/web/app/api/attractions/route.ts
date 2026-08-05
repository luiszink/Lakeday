import {
  attractionListQuerySchema,
  attractionListResponseSchema,
  haversineDistanceM,
  isOpenOnDate,
  openStateAt,
  scoreRelevance,
  summarizeDay,
  type OpeningSchedule,
} from '@lake/domain';
import {
  findAttractionIdsWithinBounds,
  findPublishedAttractionIds,
  hasActiveAttractionFilter,
  isPublicHoliday,
  Locale,
  Prisma,
  readWgs84Point,
  searchPublishedAttractions,
  type Wgs84Bounds,
} from '@lake/db';
import { NextResponse } from 'next/server';

import { database } from '../../../src/auth/database';

export const runtime = 'nodejs';

const requestCounts = new Map<string, { count: number; windowStartedAt: number }>();
const rateLimit = 120;
const rateWindowMs = 60_000;

type Cursor = Readonly<{ updatedAt: string; id: string; rank?: number }>;
const hintFilterKeys = [
  'age',
  'audience',
  'cafe',
  'cat',
  'dogs',
  'dur',
  'food',
  'heat',
  'interest',
  'io',
  'lang',
  'mode',
  'noresv',
  'open',
  'picnic',
  'price',
  'r',
  'rain',
  'region',
  'season',
  'stroller',
  'wheelchair',
] as const;

function errorResponse(code: string, message: string, details?: unknown, status = 400) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

function parseCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<Cursor>;
    if (typeof decoded.updatedAt !== 'string' || typeof decoded.id !== 'string') return null;
    if (Number.isNaN(Date.parse(decoded.updatedAt))) return null;
    if (decoded.rank !== undefined && typeof decoded.rank !== 'number') return null;
    return {
      updatedAt: decoded.updatedAt,
      id: decoded.id,
      ...(decoded.rank !== undefined ? { rank: decoded.rank } : {}),
    };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function parseBounds(value: string | undefined): Wgs84Bounds | null {
  if (!value) return null;
  const coordinates = value.split(',').map(Number);
  if (coordinates.length !== 4 || coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    return null;
  }
  const [west, south, east, north] = coordinates;
  if (
    west! < -180 ||
    east! > 180 ||
    west! >= east! ||
    south! < -90 ||
    north! > 90 ||
    south! >= north!
  ) {
    return null;
  }
  return { east: east!, north: north!, south: south!, west: west! };
}

function requestKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const key = requestKey(request);
  const current = requestCounts.get(key);
  if (!current || now - current.windowStartedAt >= rateWindowMs) {
    requestCounts.set(key, { count: 1, windowStartedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > rateLimit;
}

function dateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timeValue(value: Date | null) {
  return value ? value.toISOString().slice(11, 16) : null;
}

type OpeningScheduleRow = Prisma.OpeningScheduleGetPayload<{ include: { rules: true } }>;

function toOpeningSchedule(schedule: OpeningScheduleRow | null): OpeningSchedule | null {
  if (!schedule) return null;
  return {
    validFrom: dateValue(schedule.validFrom),
    validTo: dateValue(schedule.validTo),
    hoursUnknown: schedule.hoursUnknown,
    rules: schedule.rules.map((rule) => ({
      daysOfWeek: rule.daysOfWeek,
      opens: timeValue(rule.opens),
      closes: timeValue(rule.closes),
      appliesOnPublicHolidays: rule.appliesOnPublicHolidays,
      holidayCalendarCode: rule.holidayCalendarCode,
    })),
  } satisfies OpeningSchedule;
}

function localDate(value: Date) {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Zurich',
    year: 'numeric',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function openingContext(closures: ReadonlyArray<{ dateFrom: Date; dateTo: Date }>) {
  return {
    timeZone: 'Europe/Zurich',
    isPublicHoliday,
    closures: closures.map((closure) => ({
      dateFrom: dateValue(closure.dateFrom),
      dateTo: dateValue(closure.dateTo),
    })),
  };
}

function freshnessScore(lastVerifiedAt: Date | null, now: Date): number {
  if (!lastVerifiedAt) return 0;
  const ageInDays = Math.max(0, (now.getTime() - lastVerifiedAt.getTime()) / 86_400_000);
  return Math.max(0, 1 - ageInDays / 365);
}

function relevanceScore(
  record: Readonly<{
    categories: ReadonlyArray<unknown>;
    editorialImportance: Prisma.Decimal;
    lastVerifiedAt: Date | null;
    openingSchedule: OpeningScheduleRow | null;
    priceLevel: unknown;
    typicalDurationMax: number | null;
    typicalDurationMin: number | null;
  }>,
  now: Date,
  proximity?: number,
) {
  const knownFields = [
    record.categories.length > 0,
    record.editorialImportance !== null,
    record.lastVerifiedAt !== null,
    record.openingSchedule && !record.openingSchedule.hoursUnknown,
    record.priceLevel !== null,
    record.typicalDurationMin !== null || record.typicalDurationMax !== null,
  ];
  return scoreRelevance({
    dataCompleteness: knownFields.filter(Boolean).length / knownFields.length,
    editorialImportance: Number(record.editorialImportance),
    freshness: freshnessScore(record.lastVerifiedAt, now),
    ...(proximity === undefined ? {} : { proximity }),
    seasonFit: 1,
  });
}

function removeFilter<T extends Record<string, unknown>>(filter: T, key: string): T {
  const copy = { ...filter };
  delete copy[key];
  return copy;
}

function freshnessLevel(lastVerifiedAt: Date | null) {
  if (!lastVerifiedAt) return 'UNKNOWN' as const;
  const ageInDays = (Date.now() - lastVerifiedAt.getTime()) / 86_400_000;
  if (ageInDays <= 30) return 'FRESH' as const;
  if (ageInDays <= 90) return 'AGING' as const;
  return 'STALE' as const;
}

export async function GET(request: Request) {
  if (isRateLimited(request)) {
    return errorResponse('RATE_LIMITED', 'Too many requests.', undefined, 429);
  }

  const url = new URL(request.url);
  const parsedQuery = attractionListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsedQuery.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid attraction list query.',
      parsedQuery.error.issues,
    );
  }

  const bounds = parseBounds(parsedQuery.data.bbox);
  if (parsedQuery.data.bbox && !bounds) {
    return errorResponse('VALIDATION_ERROR', 'Invalid attraction map bounds.', [
      { path: ['bbox'], code: 'invalid_bbox', message: 'Bounds must be west,south,east,north.' },
    ]);
  }
  if (!bounds && parsedQuery.data.limit > 50 && !parsedQuery.data.ids) {
    return errorResponse('VALIDATION_ERROR', 'List queries cannot request more than 50 items.', [
      { path: ['limit'], code: 'too_big', message: 'Limit must be at most 50 without bbox.' },
    ]);
  }

  const cursor = parseCursor(parsedQuery.data.cursor);
  if (parsedQuery.data.cursor && !cursor) {
    return errorResponse('VALIDATION_ERROR', 'Invalid cursor.', [
      { path: ['cursor'], code: 'invalid_cursor', message: 'Cursor is not valid.' },
    ]);
  }

  const sortMode = parsedQuery.data.sort ?? (parsedQuery.data.near ? 'distance' : 'relevance');
  if (sortMode === 'distance' && !parsedQuery.data.near) {
    return errorResponse('LOCATION_REQUIRED', 'Distance sorting requires a selected location.', [
      {
        path: ['near'],
        code: 'location_required',
        message: 'near is required for distance sorting.',
      },
    ]);
  }

  const locale = parsedQuery.data.locale === 'en' ? 'en' : 'de';
  const databaseLocale = locale === 'en' ? Locale.en : Locale.de;
  const now = new Date();
  const openFilter = parsedQuery.data.open;
  const currentDate = localDate(now);
  const evaluationDate = openFilter?.startsWith('date:')
    ? openFilter.slice('date:'.length)
    : currentDate;
  const baseWhere = {
    status: 'PUBLISHED' as const,
    localizations: { some: { locale: databaseLocale } },
  };
  const boundsIds = bounds ? await findAttractionIdsWithinBounds(database, bounds) : null;
  const filter = parsedQuery.data;
  const filterIds = hasActiveAttractionFilter(filter)
    ? await findPublishedAttractionIds(database, filter)
    : null;
  let openIds: readonly string[] | null = null;
  if (openFilter) {
    const candidateIds = filterIds ?? (await findPublishedAttractionIds(database, filter));
    const candidates = await database.attraction.findMany({
      where: { status: 'PUBLISHED', id: { in: [...candidateIds] } },
      select: {
        id: true,
        openingSchedule: { include: { rules: true } },
        closures: { select: { dateFrom: true, dateTo: true } },
      },
    });
    openIds = candidates
      .filter((candidate) => {
        const schedule = toOpeningSchedule(candidate.openingSchedule);
        const context = openingContext(candidate.closures);
        return openFilter === 'now'
          ? openStateAt(schedule, now.toISOString(), context) === 'OPEN'
          : isOpenOnDate(schedule, evaluationDate, context);
      })
      .map((candidate) => candidate.id);
  }
  const baseScopedIds = openIds
    ? boundsIds
      ? openIds.filter((id) => boundsIds.includes(id))
      : [...openIds]
    : filterIds
      ? boundsIds
        ? filterIds.filter((id) => boundsIds.includes(id))
        : [...filterIds]
      : boundsIds
        ? [...boundsIds]
        : null;
  const requestedIds = parsedQuery.data.ids;
  const scopedIds = requestedIds
    ? baseScopedIds
      ? baseScopedIds.filter((id) => requestedIds.includes(id))
      : [...requestedIds]
    : baseScopedIds;
  async function countMatches(
    filterVariant: typeof filter,
    openVariant: string | undefined,
  ): Promise<number> {
    let candidateIds = hasActiveAttractionFilter(filterVariant)
      ? await findPublishedAttractionIds(database, filterVariant)
      : null;
    if (boundsIds) {
      candidateIds = candidateIds
        ? candidateIds.filter((id) => boundsIds.includes(id))
        : [...boundsIds];
    }
    if (openVariant) {
      const openCandidates =
        candidateIds ?? (await findPublishedAttractionIds(database, filterVariant));
      const schedules = await database.attraction.findMany({
        where: { status: 'PUBLISHED', id: { in: [...openCandidates] } },
        select: {
          id: true,
          openingSchedule: { include: { rules: true } },
          closures: { select: { dateFrom: true, dateTo: true } },
        },
      });
      candidateIds = schedules
        .filter((candidate) => {
          const schedule = toOpeningSchedule(candidate.openingSchedule);
          const context = openingContext(candidate.closures);
          return openVariant === 'now'
            ? openStateAt(schedule, now.toISOString(), context) === 'OPEN'
            : isOpenOnDate(schedule, openVariant.slice('date:'.length), context);
        })
        .map((candidate) => candidate.id);
    }
    if (filter.q) {
      const searchVariant = await searchPublishedAttractions(database, {
        ...(candidateIds ? { allowedIds: candidateIds } : {}),
        ...(bounds ? { bounds } : {}),
        query: filter.q,
        locale,
        limit: 1,
      });
      return searchVariant.total;
    }
    return database.attraction.count({
      where: {
        ...baseWhere,
        ...(candidateIds ? { id: { in: [...candidateIds] } } : {}),
      },
    });
  }
  const search = parsedQuery.data.q
    ? await searchPublishedAttractions(database, {
        ...(scopedIds ? { allowedIds: scopedIds } : {}),
        ...(bounds ? { bounds } : {}),
        query: parsedQuery.data.q,
        locale,
        limit: parsedQuery.data.limit,
        ...(cursor?.rank !== undefined
          ? {
              cursor: {
                id: cursor.id,
                rank: cursor.rank,
                updatedAt: new Date(cursor.updatedAt),
              },
            }
          : {}),
      })
    : null;
  const searchIds = search?.matches.slice(0, parsedQuery.data.limit).map((match) => match.id);
  const where = searchIds
    ? { ...baseWhere, id: { in: searchIds } }
    : scopedIds
      ? { ...baseWhere, id: { in: scopedIds } }
      : baseWhere;

  const [total, records] = await Promise.all([
    search
      ? Promise.resolve(search.total)
      : database.attraction.count({
          where: scopedIds ? { ...baseWhere, id: { in: scopedIds } } : baseWhere,
        }),
    database.attraction.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...(searchIds ? { take: searchIds.length } : {}),
      select: {
        id: true,
        municipality: true,
        regionCode: true,
        updatedAt: true,
        lastVerifiedAt: true,
        editorialImportance: true,
        priceLevel: true,
        typicalDurationMin: true,
        typicalDurationMax: true,
        localizations: {
          where: { locale },
          select: { name: true, slug: true },
          take: 1,
        },
        region: { select: { code: true, nameDe: true, nameEn: true } },
        categories: {
          where: { isPrimary: true },
          take: 1,
          select: { category: { select: { code: true, labelDe: true, labelEn: true } } },
        },
        openingSchedule: { include: { rules: true } },
        closures: { select: { dateFrom: true, dateTo: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { altDe: true, altEn: true, storagePath: true, attributionText: true },
        },
      },
    }),
  ]);

  const coordinatesById = new Map(
    await Promise.all(
      records.map(
        async (record) => [record.id, await readWgs84Point(database, record.id)] as const,
      ),
    ),
  );
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const searchRecords = searchIds
    ? searchIds.map((id) => recordsById.get(id)).filter((record) => record !== undefined)
    : null;
  const orderedRecords = [...(searchRecords ?? records)].sort((left, right) => {
    const leftCoordinates = coordinatesById.get(left.id);
    const rightCoordinates = coordinatesById.get(right.id);
    const leftDistance =
      parsedQuery.data.near && leftCoordinates
        ? haversineDistanceM(parsedQuery.data.near, leftCoordinates)
        : Number.POSITIVE_INFINITY;
    const rightDistance =
      parsedQuery.data.near && rightCoordinates
        ? haversineDistanceM(parsedQuery.data.near, rightCoordinates)
        : Number.POSITIVE_INFINITY;
    if (sortMode === 'distance' && leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    const leftProximity = Number.isFinite(leftDistance)
      ? Math.max(0, 1 - leftDistance / ((parsedQuery.data.r ?? 50) * 1_000))
      : undefined;
    const rightProximity = Number.isFinite(rightDistance)
      ? Math.max(0, 1 - rightDistance / ((parsedQuery.data.r ?? 50) * 1_000))
      : undefined;
    const relevanceDifference =
      relevanceScore(left, now, leftProximity) - relevanceScore(right, now, rightProximity);
    if (relevanceDifference !== 0) return relevanceDifference > 0 ? -1 : 1;
    const updatedDifference = right.updatedAt.getTime() - left.updatedAt.getTime();
    return updatedDifference || right.id.localeCompare(left.id);
  });
  const cursorIndex =
    !search && cursor ? orderedRecords.findIndex((record) => record.id === cursor.id) : -1;
  const pageStart = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const page = orderedRecords.slice(pageStart, pageStart + parsedQuery.data.limit);
  const hasNextPage = search
    ? search.matches.length > parsedQuery.data.limit
    : pageStart + parsedQuery.data.limit < orderedRecords.length;
  const items = await Promise.all(
    page.map(async (record) => {
      const localization = record.localizations[0];
      const coordinates = coordinatesById.get(record.id) ?? null;
      if (!localization || !coordinates) return null;

      const schedule = toOpeningSchedule(record.openingSchedule);
      const context = openingContext(record.closures);
      const summary = summarizeDay(schedule, evaluationDate, context);
      const openState = openFilter
        ? openFilter === 'now'
          ? openStateAt(schedule, now.toISOString(), context)
          : summary.state
        : openStateAt(schedule, now.toISOString(), context);
      const openUntil =
        summary.state === 'OPEN' ? (summary.intervals.at(-1)?.closes ?? null) : null;

      return attractionListResponseSchema.shape.items.element.parse({
        id: record.id,
        slug: localization.slug,
        name: localization.name,
        category: record.categories[0]
          ? {
              code: record.categories[0].category.code,
              label:
                locale === 'en'
                  ? record.categories[0].category.labelEn
                  : record.categories[0].category.labelDe,
            }
          : null,
        region: {
          code: record.region.code,
          name: locale === 'en' ? record.region.nameEn : record.region.nameDe,
        },
        municipality: record.municipality,
        coordinates,
        priceLevel: record.priceLevel,
        openState,
        openDate: openState === 'OPEN' ? evaluationDate : null,
        openUntil: openState === 'OPEN' ? openUntil : null,
        typicalDuration:
          record.typicalDurationMin !== null || record.typicalDurationMax !== null
            ? { min: record.typicalDurationMin, max: record.typicalDurationMax }
            : null,
        freshness: {
          level: freshnessLevel(record.lastVerifiedAt),
          lastVerifiedAt: record.lastVerifiedAt?.toISOString() ?? null,
        },
        thumbnail: record.images[0] ?? null,
      });
    }),
  );
  const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);
  const activeHintKeys = hintFilterKeys.filter((key) => filter[key] !== undefined);
  const zeroResultHints =
    total === 0 && activeHintKeys.length > 0
      ? await Promise.all(
          activeHintKeys.map(async (key) => ({
            filter: key,
            count: await countMatches(
              removeFilter(filter, key),
              key === 'open' ? undefined : openFilter,
            ),
          })),
        )
      : undefined;
  const lastSearchMatch = search?.matches[parsedQuery.data.limit - 1];
  const nextCursor =
    hasNextPage && page.length > 0
      ? encodeCursor(
          lastSearchMatch
            ? {
                updatedAt: lastSearchMatch.updatedAt.toISOString(),
                id: lastSearchMatch.id,
                rank: lastSearchMatch.rank,
              }
            : {
                updatedAt: page[page.length - 1]!.updatedAt.toISOString(),
                id: page[page.length - 1]!.id,
              },
        )
      : null;
  const response = attractionListResponseSchema.parse({
    items: validItems,
    nextCursor,
    total,
    ...(bounds ? { truncated: hasNextPage } : {}),
    ...(zeroResultHints ? { zeroResultHints } : {}),
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
