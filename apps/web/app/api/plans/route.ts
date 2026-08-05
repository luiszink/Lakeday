import { randomBytes } from 'node:crypto';

import { planShareSchema, roundWgs84Coordinate } from '@lake/domain';
import { Locale } from '@lake/db';
import { NextResponse } from 'next/server';

import { database } from '../../../src/auth/database';
import { checkPlanRateLimit } from '../../../src/api/plan-rate-limit';

export const runtime = 'nodejs';

const payloadLimitBytes = 32 * 1024;
const rateLimitWindowMs = 60 * 60 * 1_000;

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function rateLimitedResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000));
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many plan shares.' } },
    { headers: { 'Retry-After': String(retryAfter) }, status: 429 },
  );
}

export async function POST(request: Request) {
  const rate = checkPlanRateLimit(`post:${clientKey(request)}`, 10, rateLimitWindowMs);
  if (!rate.allowed) return rateLimitedResponse(rate.resetAt);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > payloadLimitBytes) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Plan payload is too large.' } },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    );
  }
  const parsed = planShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid plan payload.' } },
      { status: 400 },
    );
  }

  const attractionIds = parsed.data.stops.map((stop) => stop.attractionId);
  const published = await database.attraction.findMany({
    select: { id: true },
    where: { id: { in: attractionIds }, status: 'PUBLISHED' },
  });
  if (published.length !== attractionIds.length) {
    return NextResponse.json(
      { error: { code: 'ATTRACTION_UNAVAILABLE', message: 'Every plan stop must be published.' } },
      { status: 400 },
    );
  }

  const shareToken = randomBytes(16).toString('base64url');
  const startPoint = parsed.data.startPoint
    ? roundWgs84Coordinate(parsed.data.startPoint.coordinates)
    : null;
  const plan = await database.plan.create({
    data: {
      date: parsed.data.date ? new Date(`${parsed.data.date}T00:00:00.000Z`) : null,
      locale: parsed.data.locale === 'de' ? Locale.de : Locale.en,
      shareToken,
      startPointLabel: parsed.data.startPoint?.label ?? null,
      startPointX: startPoint?.longitude ?? null,
      startPointY: startPoint?.latitude ?? null,
      stops: {
        create: parsed.data.stops.map((stop, sortIndex) => ({
          attractionId: stop.attractionId,
          plannedDurationMin: stop.plannedDurationMin ?? null,
          sortIndex,
        })),
      },
    },
    select: { shareToken: true },
  });
  const url = new URL(`/${parsed.data.locale}/plan/${plan.shareToken}`, request.url).toString();
  return NextResponse.json({ shareToken: plan.shareToken, url }, { status: 201 });
}