import { NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE } from '../../../../../src/auth/admin-session';
import { hasSameOrigin } from '../../../../../src/auth/csrf';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 0,
  });
  return response;
}
