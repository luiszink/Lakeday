import { NextResponse } from 'next/server';

import { requireRole } from '../../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../../src/auth/csrf';
import {
  deleteLicence,
  parseLicencePayload,
  updateLicence,
  type LicencePatch,
} from '../../../../../src/registries/repository';

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: RouteContext) {
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
  const parsed = parseLicencePayload(
    await request.json().catch(() => null),
    true,
  ) as LicencePatch | null;
  if (!parsed || Object.keys(parsed).length === 0) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one valid licence field is required.',
        },
      },
      { status: 400 },
    );
  }

  try {
    const licence = await updateLicence((await params).id, parsed);
    return NextResponse.json({ licence });
  } catch (error) {
    console.error('Admin licence update failed', error);
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: 'Unable to update licence.' } },
      { status: 409 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
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

  try {
    await deleteLicence((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Admin licence deletion failed', error);
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Unable to delete licence.' } },
      { status: 409 },
    );
  }
}
