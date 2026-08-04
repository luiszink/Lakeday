import { attractionEditorPayloadSchema } from '@lake/domain';
import { NextResponse } from 'next/server';

import { requireRole } from '../../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../../src/auth/csrf';
import {
  AttractionConflictError,
  AttractionNotFoundError,
  AttractionValidationError,
  getAttractionEditor,
  saveAttractionEditor,
  validateEditorPublish,
} from '../../../../../src/admin/attractions/repository';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

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

export async function GET(_: Request, context: RouteContext) {
  if (!(await requireRole('EDITOR'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Forbidden.' } },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json({ attraction: await getAttractionEditor((await context.params).id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const id = (await context.params).id;
  const body = await request.json().catch(() => null);
  const parsed = attractionEditorPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid attraction payload.',
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }
  if (parsed.data.id !== null && parsed.data.id !== id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Payload id does not match route id.' } },
      { status: 400 },
    );
  }

  const payload = { ...parsed.data, id };
  if (payload.status === 'PUBLISHED' || payload.status === 'UNPUBLISHED') {
    if (!(await requireRole('REVIEWER'))) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Reviewer role required for status transition.' } },
        { status: 403 },
      );
    }
  }
  if (payload.status === 'PUBLISHED') {
    const validation = await validateEditorPublish(payload);
    if (!validation.result.ok) {
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
  }

  try {
    const saved = await saveAttractionEditor(payload, session.userId);
    return NextResponse.json({
      attraction: { id: saved.id, updatedAt: saved.updatedAt.toISOString() },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
