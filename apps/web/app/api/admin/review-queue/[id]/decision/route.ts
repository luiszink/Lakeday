import { reviewDecisionSchema } from '@lake/domain';
import { NextResponse } from 'next/server';

import { requireRole } from '../../../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../../../src/auth/csrf';
import {
  applyReviewDecision,
  ReviewProposalConflictError,
  ReviewProposalNotFoundError,
  ReviewProposalValidationError,
} from '../../../../../../src/admin/review/repository';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = reviewDecisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid review decision.',
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      decision: await applyReviewDecision((await context.params).id, session.userId, parsed.data),
    });
  } catch (error) {
    if (error instanceof ReviewProposalConflictError) {
      return NextResponse.json(
        { error: { code: 'DECISION_CONFLICT', message: error.message } },
        { status: 409 },
      );
    }
    if (error instanceof ReviewProposalNotFoundError) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 },
      );
    }
    if (error instanceof ReviewProposalValidationError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 422 },
      );
    }
    console.error('Review decision failed', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Unable to apply review decision.' } },
      { status: 500 },
    );
  }
}
