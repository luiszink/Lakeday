import { NextResponse } from 'next/server';

import { requireRole } from '../../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../../src/auth/csrf';
import {
  deleteSource,
  parseSourcePayload,
  updateSource,
  type SourcePatch,
} from '../../../../../src/registries/repository';

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: RouteContext) {
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
    true,
  ) as SourcePatch | null;
  if (!parsed || Object.keys(parsed).length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one valid source field is required.',
        },
      },
      { status: 400 },
    );
  }
  if (parsed.approvalState && session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only an admin can change source approval.' } },
      { status: 403 },
    );
  }

  try {
    const source = await updateSource((await params).id, parsed, session.userId);
    return NextResponse.json({ source });
  } catch (error) {
    console.error('Admin source update failed', error);
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: 'Unable to update source origin.' } },
      { status: 409 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
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

  try {
    await deleteSource((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Admin source deletion failed', error);
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Unable to delete source origin.' } },
      { status: 409 },
    );
  }
}
