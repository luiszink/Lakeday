import { attractionEditorPayloadSchema } from '@lake/domain';
import { NextResponse } from 'next/server';

import { requireRole } from '../../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../../src/auth/csrf';
import { calculateEditorScope } from '../../../../../src/admin/attractions/repository';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!(await requireRole('EDITOR'))) {
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

  const parsed = attractionEditorPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid scope payload.',
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ scope: await calculateEditorScope(parsed.data) });
}
