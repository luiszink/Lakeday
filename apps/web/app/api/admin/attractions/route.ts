import { attractionEditorPayloadSchema } from '@lake/domain';
import { NextResponse } from 'next/server';

import { requireRole } from '../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../src/auth/csrf';
import {
  AttractionConflictError,
  AttractionNotFoundError,
  AttractionValidationError,
  listAttractions,
  saveAttractionEditor,
  validateEditorPublish,
} from '../../../../src/admin/attractions/repository';

export const runtime = 'nodejs';

function errorResponse(error: unknown) {
  if (error instanceof AttractionConflictError) {
    return NextResponse.json(
      { error: { code: 'OPTIMISTIC_LOCK_CONFLICT', message: error.message } },
      { status: 409 },
    );
  }
  if (error instanceof AttractionNotFoundError) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: error.message } },
      { status: 404 },
    );
  }
  if (error instanceof AttractionValidationError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: error.message } },
      { status: 422 },
    );
  }
  console.error('Admin attraction request failed', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Unable to save attraction.' } },
    { status: 500 },
  );
}

async function publishCheck(payload: Parameters<typeof saveAttractionEditor>[0]) {
  if (payload.status !== 'PUBLISHED') return null;
  const validation = await validateEditorPublish(payload);
  if (validation.result.ok) return null;
  return NextResponse.json(
    {
      error: {
        code: 'PUBLISH_INVARIANTS_FAILED',
        message: 'Publishing is blocked until all content invariants pass.',
        violations: validation.result.errors,
        scope: {
          inScope: validation.context.inScope,
          shorelineDistanceM: validation.context.shorelineDistanceM,
          regionCode: validation.context.regionCode,
        },
      },
    },
    { status: 422 },
  );
}

export async function GET(request: Request) {
  if (!(await requireRole('EDITOR'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Forbidden.' } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const regionCode = url.searchParams.get('region');
  const query = url.searchParams.get('q');
  const items = await listAttractions({
    ...(status ? { status } : {}),
    ...(regionCode ? { regionCode } : {}),
    ...(query ? { query } : {}),
  });
  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireRole('EDITOR');
  if (!session) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Forbidden.' } },
      { status: 403 },
    );
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'CSRF_REJECTED', message: 'Invalid request origin.' } },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = attractionEditorPayloadSchema.safeParse(body);
  if (!parsed.success || parsed.data.id !== null) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A new attraction requires a valid draft payload.',
          details: parsed.success ? [] : parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  if (parsed.data.status === 'PUBLISHED' || parsed.data.status === 'UNPUBLISHED') {
    if (!(await requireRole('REVIEWER'))) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Reviewer role required for status transition.' } },
        { status: 403 },
      );
    }
  }
  const publishError = await publishCheck(parsed.data);
  if (publishError) return publishError;

  try {
    const saved = await saveAttractionEditor(parsed.data, session.userId);
    return NextResponse.json(
      { attraction: { id: saved.id, updatedAt: saved.updatedAt.toISOString() } },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
