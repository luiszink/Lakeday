import {
  geocodeQuerySchema,
  geocodeResponseSchema,
  isInsideLakeConstanceScope,
  roundWgs84Coordinate,
} from '@lake/domain';
import { NextResponse } from 'next/server';

import { createGeocoder } from '../../../src/providers/geocoder';

export const runtime = 'nodejs';

const requestCounts = new Map<string, { count: number; windowStartedAt: number }>();
const rateLimit = 30;
const rateWindowMs = 60_000;
const geocoder = createGeocoder();

function requestKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

function isRateLimited(request: Request): boolean {
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

export async function GET(request: Request) {
  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const parsedQuery = geocodeQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid geocoder query.',
          details: parsedQuery.error.issues,
        },
      },
      { status: 400 },
    );
  }

  try {
    const results = (await geocoder.search(parsedQuery.data.q, parsedQuery.data.locale))
      .map((result) => ({ ...result, coordinates: roundWgs84Coordinate(result.coordinates) }))
      .filter((result) => isInsideLakeConstanceScope(result.coordinates))
      .map((result) => geocodeResponseSchema.shape.results.element.parse(result));

    return NextResponse.json(
      { providerUnavailable: false, results },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } },
    );
  } catch {
    return NextResponse.json(
      geocodeResponseSchema.parse({ providerUnavailable: true, results: [] }),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
