import { NextResponse } from 'next/server';

import { loginAdmin } from '../../../../../src/auth/auth-service';
import { ADMIN_SESSION_COOKIE } from '../../../../../src/auth/admin-session';
import { hasSameOrigin } from '../../../../../src/auth/csrf';
import { createAdminSession } from '../../../../../src/auth/session';

export const runtime = 'nodejs';

type LoginBody = {
  email?: unknown;
  password?: unknown;
  totp?: unknown;
  recoveryCode?: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!isString(body.email) || !isString(body.password)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const result = await loginAdmin(
    {
      email: body.email,
      password: body.password,
      ...(isString(body.totp) ? { totp: body.totp } : {}),
      ...(isString(body.recoveryCode) ? { recoveryCode: body.recoveryCode } : {}),
    },
    {
      ...(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ? { ipAddress: request.headers.get('x-forwarded-for')!.split(',')[0]!.trim() }
        : {}),
      ...(request.headers.get('user-agent')
        ? { userAgent: request.headers.get('user-agent')! }
        : {}),
    },
  );

  if (result.status === 'FAILURE') {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.retryAfterSeconds ? { retryAfterSeconds: result.retryAfterSeconds } : {}),
      },
      {
        status: 401,
        ...(result.retryAfterSeconds
          ? { headers: { 'Retry-After': String(result.retryAfterSeconds) } }
          : {}),
      },
    );
  }

  if (result.status === 'ENROLLMENT_REQUIRED') {
    return NextResponse.json(
      { requiresTotpEnrollment: true, enrollmentToken: result.enrollmentToken },
      { status: 428 },
    );
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSession(result.userId, result.role),
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  return response;
}
