import { NextResponse } from 'next/server';

import { validateResearchRecord, type ResearchImportPlan } from '@lake/domain';

import { requireRole } from '../../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../../src/auth/csrf';
import {
  ImportValidationError,
  SourceOriginNotApprovedError,
  persistResearchImport,
  prepareResearchImport,
} from '../../../../../src/admin/import/repository';

export const runtime = 'nodejs';

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
const MAX_RECORDS = 100;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1_000;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

type ImportResult = Readonly<{
  candidateId: string | null;
  status: 'created' | 'updated' | 'held' | 'rejected';
  attractionId: string | null;
  reasons: readonly string[];
  duplicate: ResearchImportPlan['duplicate'];
  errors?: readonly Readonly<{ path: string; code: string; message: string }>[];
}>;

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function rateLimitResponse(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return null;
  }
  if (current.count >= RATE_LIMIT) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Import rate limit exceeded.' } },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((current.resetAt - now) / 1_000)) },
      },
    );
  }
  current.count += 1;
  return null;
}

function recordsFromBody(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body;
  if (
    typeof body === 'object' &&
    body !== null &&
    Array.isArray((body as { records?: unknown }).records)
  ) {
    return (body as { records: unknown[] }).records;
  }
  return null;
}

function rejected(
  candidateId: string | null,
  errors: readonly Readonly<{ path: string; code: string; message: string }>[],
): ImportResult {
  return {
    candidateId,
    status: 'rejected',
    attractionId: null,
    reasons: errors.map((error) => error.message),
    duplicate: null,
    errors,
  };
}

export async function POST(request: Request) {
  const session = await requireRole('REVIEWER');
  if (!session) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Reviewer role required.' } },
      { status: 403 },
    );
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'CSRF_REJECTED', message: 'Invalid request origin.' } },
      { status: 403 },
    );
  }
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Import payload exceeds 5 MB.' } },
      { status: 413 },
    );
  }
  const limited = rateLimitResponse(request);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Import payload must be valid JSON.' } },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Import payload exceeds 5 MB or is invalid JSON.',
        },
      },
      { status: 413 },
    );
  }
  const records = recordsFromBody(body);
  if (!records || records.length === 0 || records.length > MAX_RECORDS) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Provide between 1 and ${MAX_RECORDS} research records.`,
        },
      },
      { status: 400 },
    );
  }

  const results: ImportResult[] = [];
  for (const input of records) {
    const validation = validateResearchRecord(input);
    if (!validation.valid || !validation.record) {
      results.push(rejected(null, validation.issues));
      continue;
    }
    const candidateId = validation.record.identity.candidateId;
    try {
      const prepared = await prepareResearchImport(validation.record);
      const persisted = await persistResearchImport(
        validation.record,
        prepared.plan,
        prepared.resolvedEvidence,
      );
      results.push({
        candidateId,
        status:
          persisted.action === 'CREATE'
            ? 'created'
            : persisted.action === 'UPDATE'
              ? 'updated'
              : persisted.action === 'HOLD'
                ? 'held'
                : 'rejected',
        attractionId: persisted.attractionId,
        reasons: persisted.reasons,
        duplicate: persisted.duplicate,
      });
    } catch (error) {
      if (error instanceof SourceOriginNotApprovedError) {
        results.push(
          rejected(candidateId, [
            {
              path: error.path,
              code: 'source.origin_not_approved',
              message: error.message,
            },
          ]),
        );
      } else if (error instanceof ImportValidationError) {
        results.push(
          rejected(candidateId, [{ path: '$', code: 'import.validation', message: error.message }]),
        );
      } else {
        console.error('Research import record failed', error);
        results.push(
          rejected(candidateId, [
            {
              path: '$',
              code: 'import.write_failed',
              message: 'The record could not be imported.',
            },
          ]),
        );
      }
    }
  }

  const rejectedCount = results.filter((result) => result.status === 'rejected').length;
  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      created: results.filter((result) => result.status === 'created').length,
      updated: results.filter((result) => result.status === 'updated').length,
      held: results.filter((result) => result.status === 'held').length,
      rejected: rejectedCount,
    },
  });
}
