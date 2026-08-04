import { NextResponse } from 'next/server';

import { beginTotpEnrollment } from '../../../../../../src/auth/auth-service';
import { hasSameOrigin } from '../../../../../../src/auth/csrf';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { enrollmentToken?: unknown } | null;
  if (typeof body?.enrollmentToken !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const enrollment = await beginTotpEnrollment(body.enrollmentToken);
  if (!enrollment) {
    return NextResponse.json({ error: 'Invalid enrollment.' }, { status: 401 });
  }

  return NextResponse.json({
    uri: enrollment.uri,
    qrDataUrl: enrollment.qrDataUrl,
    secret: enrollment.secret,
  });
}
