import {
  attractionDetailQuerySchema,
  attractionDetailResponseSchema,
  haversineDistanceM,
  openStateAt,
  summarizeDay,
  type OpeningSchedule,
} from '@lake/domain';
import { isPublicHoliday, Locale, Prisma, readWgs84Point } from '@lake/db';
import { NextResponse } from 'next/server';

import { database } from '../../../../src/auth/database';

export const runtime = 'nodejs';
export const revalidate = 60;

type OpeningScheduleRow = Prisma.OpeningScheduleGetPayload<{ include: { rules: true } }>;

type DetailRouteProps = Readonly<{
  params: Promise<{ idOrSlug: string }>;
}>;

function dateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timeValue(value: Date | null) {
  return value ? value.toISOString().slice(11, 16) : null;
}

function localDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
  }).format(value);
}

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
  };
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

function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function canonicalPath(locale: 'de' | 'en', slug: string) {
  return `/${locale}/${locale === 'de' ? 'orte' : 'places'}/${encodeURIComponent(slug)}`;
}

export async function GET(request: Request, context: DetailRouteProps) {
  const { idOrSlug } = await context.params;
  const parsedQuery = attractionDetailQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid attraction detail query.' } },
      { status: 400 },
    );
  }

  const locale = parsedQuery.data.locale === 'en' ? Locale.en : Locale.de;
  const localeCode = parsedQuery.data.locale;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    idOrSlug,
  );
  const attraction = await database.attraction.findFirst({
    where: {
      status: 'PUBLISHED',
      ...(isUuid ? { id: idOrSlug } : { localizations: { some: { locale, slug: idOrSlug } } }),
    },
    include: {
      localizations: { where: { locale }, take: 1 },
      region: true,
      categories: {
        where: { isPrimary: true },
        include: { category: true },
        orderBy: { createdAt: 'asc' },
      },
      openingSchedule: { include: { rules: true } },
      closures: { orderBy: { dateFrom: 'asc' } },
      prices: { orderBy: [{ validFrom: 'desc' }, { audience: 'asc' }] },
      images: {
        orderBy: { sortOrder: 'asc' },
        include: { licence: true },
      },
      factProvenances: { orderBy: { lastCheckedAt: 'desc' } },
      aliasesMergedInto: {
        include: {
          mergedFrom: { include: { localizations: { where: { locale }, take: 1 } } },
        },
      },
    },
  });

  if (!attraction) {
    const alias = await database.attraction.findFirst({
      where: {
        status: { not: 'PUBLISHED' },
        localizations: { some: { locale, slug: idOrSlug } },
        aliasesMergedFrom: { some: { mergedInto: { status: 'PUBLISHED' } } },
      },
      select: {
        aliasesMergedFrom: {
          select: {
            mergedInto: {
              select: {
                localizations: { where: { locale }, take: 1, select: { slug: true } },
              },
            },
          },
          take: 1,
        },
      },
    });
    const canonicalSlug = alias?.aliasesMergedFrom[0]?.mergedInto.localizations[0]?.slug;
    if (canonicalSlug) {
      const location = canonicalPath(localeCode, canonicalSlug);
      return NextResponse.json(
        { redirect: location, reason: 'ATTRACTION_MERGED' },
        { status: 301, headers: { Location: location } },
      );
    }
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Attraction not found.' } },
      { status: 404 },
    );
  }

  const coordinates = await readWgs84Point(database, attraction.id);
  const schedule = toOpeningSchedule(attraction.openingSchedule);
  const contextForHours = openingContext(attraction.closures);
  const evaluationDate = parsedQuery.data.date ?? localDate(new Date());
  const daySummary = summarizeDay(schedule, evaluationDate, contextForHours);
  const openState = parsedQuery.data.date
    ? daySummary.state
    : openStateAt(schedule, new Date().toISOString(), contextForHours);
  const nearbyCandidates = await database.attraction.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: attraction.id },
      regionCode: attraction.regionCode,
      localizations: { some: { locale } },
    },
    take: 12,
    include: {
      localizations: { where: { locale }, take: 1 },
      categories: {
        where: { isPrimary: true },
        take: 1,
        include: { category: true },
      },
    },
  });
  const nearby = (
    await Promise.all(
      nearbyCandidates.map(async (candidate) => {
        const candidateCoordinates = await readWgs84Point(database, candidate.id);
        if (!candidateCoordinates || !coordinates) return null;
        const localization = candidate.localizations[0];
        if (!localization) return null;
        return {
          category: candidate.categories[0]
            ? localeCode === 'en'
              ? candidate.categories[0].category.labelEn
              : candidate.categories[0].category.labelDe
            : null,
          distanceM: haversineDistanceM(coordinates, candidateCoordinates),
          id: candidate.id,
          name: localization.name,
          slug: localization.slug,
        };
      }),
    )
  )
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((left, right) => left.distanceM - right.distanceM)
    .slice(0, 4);
  const localization = attraction.localizations[0];
  if (!localization) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Attraction localization not found.' } },
      { status: 404 },
    );
  }

  const response = attractionDetailResponseSchema.parse({
    aliases: attraction.aliasesMergedInto.flatMap((alias) => {
      const aliasLocalization = alias.mergedFrom.localizations[0];
      return aliasLocalization ? [{ id: alias.mergedFrom.id, slug: aliasLocalization.slug }] : [];
    }),
    bookingRequirement: attraction.bookingRequirement,
    bookingUrl: safeUrl(attraction.bookingUrl),
    categories: attraction.categories.map(({ category }) => ({
      code: category.code,
      label: localeCode === 'en' ? category.labelEn : category.labelDe,
    })),
    coordinates,
    countryCode: attraction.countryCode,
    dogPolicy: attraction.dogPolicy,
    exceptionalClosures: attraction.closures.map((closure) => ({
      dateFrom: dateValue(closure.dateFrom),
      dateTo: dateValue(closure.dateTo),
    })),
    factFreshness: attraction.factProvenances.map((fact) => ({
      factKey: fact.factKey,
      lastCheckedAt: fact.lastCheckedAt?.toISOString() ?? null,
      status: fact.updateStatus,
    })),
    foodOnSite: attraction.foodOnSite,
    cafeOnSite: attraction.cafeOnSite,
    heatSuitability: attraction.heatSuitability,
    id: attraction.id,
    images: attraction.images.map((image) => ({
      altDe: image.altDe,
      altEn: image.altEn,
      attributionText: image.attributionText,
      licence: image.licence.spdxOrName,
      sourceUrl: safeUrl(image.sourceUrl),
      storagePath: image.storagePath,
    })),
    indoorOutdoor: attraction.indoorOutdoor,
    nearestStopDistanceM: attraction.nearestStopDistanceM,
    nearestStopName: attraction.nearestStopName,
    lastVerifiedAt: attraction.lastVerifiedAt?.toISOString() ?? null,
    localization: {
      description: localization.description,
      name: localization.name,
      practicalNotes: localization.practicalNotes,
      slug: localization.slug,
      summary: localization.summary,
    },
    municipality: attraction.municipality,
    nearby,
    openState,
    openDate: daySummary.date,
    openingSchedule: schedule,
    parkingAvailability: attraction.parkingAvailability,
    parkingNote: attraction.parkingNote,
    bicycleAccess: attraction.bicycleAccess,
    bicycleNote: attraction.bicycleNote,
    prices: attraction.prices.map((price) => ({
      amount: Number(price.amount),
      audience: price.audience,
      currency: price.currency,
      note: price.note,
      validFrom: price.validFrom ? dateValue(price.validFrom) : null,
      validTo: price.validTo ? dateValue(price.validTo) : null,
    })),
    picnicAllowed: attraction.picnicAllowed,
    officialWebsite: safeUrl(attraction.officialWebsite),
    priceLevel: attraction.priceLevel,
    region: {
      code: attraction.region.code,
      name: localeCode === 'en' ? attraction.region.nameEn : attraction.region.nameDe,
    },
    rainSuitability: attraction.rainSuitability,
    seasons: attraction.seasons,
    strollerSuitable: attraction.strollerSuitable,
    typicalDuration:
      attraction.typicalDurationMin !== null || attraction.typicalDurationMax !== null
        ? { min: attraction.typicalDurationMin, max: attraction.typicalDurationMax }
        : null,
    toilets: attraction.toilets,
    transportModes: attraction.transportModes,
    visitorLanguages: attraction.visitorLanguages,
    wheelchairAccess: attraction.wheelchairAccess,
    wheelchairToilet: attraction.wheelchairToilet,
  });

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
