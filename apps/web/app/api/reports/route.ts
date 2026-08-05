import { reportRequestSchema } from '@lake/domain';
import { Locale, Prisma } from '@lake/db';
import { NextResponse } from 'next/server';

import { database } from '../../../src/auth/database';

export const runtime = 'nodejs';

const rateLimit = 5;
const rateWindowMs = 60 * 60 * 1_000;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function requestKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

function rateLimitResponse(request: Request) {
  const now = Date.now();
  const key = requestKey(request);
  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + rateWindowMs });
    return null;
  }
  if (current.count >= rateLimit) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Report rate limit exceeded.' } },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((current.resetAt - now) / 1_000)) },
      },
    );
  }
  current.count += 1;
  return null;
}

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 12_000) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Report payload is too large.' } },
      { status: 413 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = reportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid report.',
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  const limited = rateLimitResponse(request);
  if (limited) return limited;

  if (parsed.data.honeypot) {
    return NextResponse.json({ accepted: true }, { status: 201 });
  }

  const attraction = await database.attraction.findFirst({
    where: { id: parsed.data.attractionId, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!attraction) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Attraction not found.' } },
      { status: 404 },
    );
  }

  const report = await database.userReport.create({
    data: {
      attractionId: attraction.id,
      category: parsed.data.category as Prisma.UserReportCreateInput['category'],
      locale: parsed.data.locale === 'en' ? Locale.en : Locale.de,
      message: parsed.data.message || null,
    },
    select: { id: true },
  });

  return NextResponse.json({ accepted: true, reportId: report.id }, { status: 201 });
}
