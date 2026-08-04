import { NextResponse } from 'next/server';

import { requestPasswordReset } from '../../../../../../src/auth/auth-service';
import { hasSameOrigin } from '../../../../../../src/auth/csrf';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  if (typeof body?.email !== 'string') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  let resetToken: string | undefined;
  try {
    resetToken = await requestPasswordReset(
      body.email,
      process.env.PUBLIC_BASE_URL ?? new URL(request.url).origin,
      ipAddress ? { ipAddress } : {},
    );
  } catch {
    resetToken = undefined;
  }

  return NextResponse.json(
    {
      message: 'If an active account exists, a reset link has been sent.',
      ...(process.env.NODE_ENV === 'production' || !resetToken
        ? {}
        : { developmentResetToken: resetToken }),
    },
    { status: 202 },
  );
}
