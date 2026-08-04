import { NextResponse } from 'next/server';

import { requireRole } from '../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../src/auth/csrf';
import {
  createSource,
  listSources,
  parseSourcePayload,
  type SourceMutation,
} from '../../../../src/registries/repository';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await requireRole('EDITOR'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Forbidden.' } },
      { status: 403 },
    );
  }
  return NextResponse.json({ sources: await listSources() });
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
  const parsed = parseSourcePayload(
    await request.json().catch(() => null),
  ) as SourceMutation | null;
  if (!parsed || !parsed.originUrl || !parsed.sourceType || !parsed.licenceId) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Origin, source type, and licence are required.',
        },
      },
      { status: 400 },
    );
  }
  if (parsed.approvalState && parsed.approvalState !== 'PENDING' && session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only an admin can change source approval.' } },
      { status: 403 },
    );
  }

  try {
    const source = await createSource(parsed, session.userId);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('Admin source creation failed', error);
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: 'Unable to create source origin.' } },
      { status: 409 },
    );
  }
}
