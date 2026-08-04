import { NextResponse } from 'next/server';

import { resetPassword } from '../../../../../../src/auth/auth-service';
import { hasSameOrigin } from '../../../../../../src/auth/csrf';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    password?: unknown;
  } | null;
  if (
    typeof body?.token !== 'string' ||
    typeof body.password !== 'string' ||
    body.password.length < 12
  ) {
    return NextResponse.json(
      { error: 'Password must contain at least 12 characters.' },
      { status: 400 },
    );
  }

  const reset = await resetPassword(body.token, body.password);
  if (!reset) {
    return NextResponse.json({ error: 'Reset link is invalid or expired.' }, { status: 400 });
  }

  return NextResponse.json({ reset: true });
}
