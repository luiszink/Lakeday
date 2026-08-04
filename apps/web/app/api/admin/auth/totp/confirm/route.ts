import { NextResponse } from 'next/server';

import { confirmTotpEnrollment } from '../../../../../../src/auth/auth-service';
import { ADMIN_SESSION_COOKIE } from '../../../../../../src/auth/admin-session';
import { hasSameOrigin } from '../../../../../../src/auth/csrf';
import { createAdminSession } from '../../../../../../src/auth/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    enrollmentToken?: unknown;
    code?: unknown;
  } | null;
  if (typeof body?.enrollmentToken !== 'string' || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const enrollment = await confirmTotpEnrollment(
    body.enrollmentToken,
    body.code,
    ipAddress ? { ipAddress } : {},
  );
  if (!enrollment) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const response = NextResponse.json({
    authenticated: true,
    recoveryCodes: enrollment.recoveryCodes,
  });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSession(enrollment.userId, enrollment.role),
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  return response;
}
