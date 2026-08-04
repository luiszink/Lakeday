import { NextResponse } from 'next/server';

import { requireRole } from '../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../src/auth/csrf';
import {
  createLicence,
  listLicences,
  parseLicencePayload,
  type LicenceMutation,
} from '../../../../src/registries/repository';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await requireRole('EDITOR'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Forbidden.' } },
      { status: 403 },
    );
  }
  return NextResponse.json({ licences: await listLicences() });
}

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
  const parsed = parseLicencePayload(
    await request.json().catch(() => null),
  ) as LicenceMutation | null;
  if (!parsed || !parsed.spdxOrName) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A licence name and permissions are required.',
        },
      },
      { status: 400 },
    );
  }

  try {
    const licence = await createLicence(parsed);
    return NextResponse.json({ licence }, { status: 201 });
  } catch (error) {
    console.error('Admin licence creation failed', error);
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: 'Unable to create licence.' } },
      { status: 409 },
    );
  }
}
