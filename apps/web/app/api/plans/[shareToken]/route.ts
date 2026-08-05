import {
  validatePlan,
  type OpeningSchedule,
} from '@lake/domain';
import { isPublicHoliday, Locale, Prisma, readWgs84Point } from '@lake/db';
import { NextResponse } from 'next/server';

import { database } from '../../../../src/auth/database';
import { checkPlanRateLimit } from '../../../../src/api/plan-rate-limit';

export const runtime = 'nodejs';

type RouteProps = Readonly<{
  params: Promise<{ shareToken: string }>;
}>;

const tokenPattern = /^[A-Za-z0-9_-]{22}$/u;
const rateLimitWindowMs = 60 * 60 * 1_000;

function dateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timeValue(value: Date | null) {
  return value ? value.toISOString().slice(11, 16) : null;
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

function toOpeningSchedule(
  schedule: Prisma.OpeningScheduleGetPayload<{ include: { rules: true } }> | null,
): OpeningSchedule | null {
  if (!schedule) return null;
  return {
    hoursUnknown: schedule.hoursUnknown,
    rules: schedule.rules.map((rule) => ({
      appliesOnPublicHolidays: rule.appliesOnPublicHolidays,
      daysOfWeek: rule.daysOfWeek,
      holidayCalendarCode: rule.holidayCalendarCode,
      opens: timeValue(rule.opens),
      closes: timeValue(rule.closes),
    })),
    validFrom: dateValue(schedule.validFrom),
    validTo: dateValue(schedule.validTo),
  };
}

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(request: Request, context: RouteProps) {
  const { shareToken } = await context.params;
  const rate = checkPlanRateLimit(`get:${clientKey(request)}`, 60, rateLimitWindowMs);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many shared-plan requests.' } },
      { headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1_000))) }, status: 429 },
    );
  }
  if (!tokenPattern.test(shareToken)) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Shared plan not found.' } },
      { headers: { 'X-Robots-Tag': 'noindex' }, status: 404 },
    );
  }

  const plan = await database.plan.findUnique({
    where: { shareToken },
    include: {
      stops: {
        include: {
          attraction: {
            include: {
              closures: { orderBy: { dateFrom: 'asc' } },
              factProvenances: {
                orderBy: { lastCheckedAt: 'desc' },
                take: 1,
                where: { factKey: 'OPENING_HOURS' },
              },
              localizations: {
                take: 1,
                where: { locale: planLocaleFromRequest(request) },
              },
              openingSchedule: { include: { rules: true } },
            },
          },
        },
        orderBy: { sortIndex: 'asc' },
      },
    },
  });
  if (!plan) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Shared plan not found.' } },
      { headers: { 'X-Robots-Tag': 'noindex' }, status: 404 },
    );
  }

  await database.plan.update({ where: { id: plan.id }, data: { lastAccessedAt: new Date() } });
  const locale = plan.locale === Locale.de ? 'de' : 'en';
  const stops = await Promise.all(
    plan.stops.map(async (stop) => {
      const attraction = stop.attraction;
      const localization = attraction.localizations[0];
      const coordinates = attraction.status === 'PUBLISHED' ? await readWgs84Point(database, attraction.id) : null;
      return {
        attractionId: stop.attractionId,
        available: attraction.status === 'PUBLISHED' && Boolean(localization),
        coordinates,
        exceptionalClosures: attraction.closures.map((closure) => ({ dateFrom: dateValue(closure.dateFrom), dateTo: dateValue(closure.dateTo) })),
        municipality: attraction.municipality,
        name: localization?.name ?? null,
        openingSchedule: toOpeningSchedule(attraction.openingSchedule),
        officialWebsite: attraction.status === 'PUBLISHED' ? safeUrl(attraction.officialWebsite) : null,
        plannedDurationMin: stop.plannedDurationMin,
        sortIndex: stop.sortIndex,
        typicalDuration: {
          max: attraction.typicalDurationMax,
          min: attraction.typicalDurationMin,
        },
        hoursStale: attraction.factProvenances[0]?.updateStatus === 'STALE',
      };
    }),
  );
  const validation = validatePlan(
    {
      date: plan.date ? dateValue(plan.date) : null,
      startPoint:
        plan.startPointX === null || plan.startPointY === null
          ? null
          : { latitude: Number(plan.startPointY), longitude: Number(plan.startPointX) },
      stops: plan.stops.map((stop) => ({
        attractionId: stop.attractionId,
        plannedDurationMin: stop.plannedDurationMin,
      })),
    },
    stops
      .filter((stop) => stop.available && stop.coordinates)
      .map((stop) => ({
        coordinates: stop.coordinates,
        exceptionalClosures: stop.exceptionalClosures,
        hoursStale: stop.hoursStale,
        id: stop.attractionId,
        openingSchedule: stop.openingSchedule,
        typicalDurationMax: stop.typicalDuration.max,
        typicalDurationMin: stop.typicalDuration.min,
      })),
    { isPublicHoliday },
  );

  return NextResponse.json(
    {
      date: plan.date ? dateValue(plan.date) : null,
      lastAccessedAt: new Date().toISOString(),
      locale,
      shareToken,
      startPoint:
        plan.startPointX === null || plan.startPointY === null
          ? null
          : {
              coordinates: { latitude: Number(plan.startPointY), longitude: Number(plan.startPointX) },
              label: plan.startPointLabel,
            },
      stops,
      validation,
    },
    { headers: { 'X-Robots-Tag': 'noindex' } },
  );
}

function planLocaleFromRequest(request: Request) {
  return new URL(request.url).searchParams.get('locale') === 'en' ? Locale.en : Locale.de;
}