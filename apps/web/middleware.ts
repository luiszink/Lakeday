import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ADMIN_SESSION_COOKIE } from './src/auth/admin-session';

export function middleware(request: NextRequest) {
  const responseHeaders = new Headers(request.headers);
  responseHeaders.set('x-admin-pathname', request.nextUrl.pathname);

  const pathname = request.nextUrl.pathname;
  const publicAuthRoutes = new Set([
    '/admin/login',
    '/admin/request-reset',
    '/admin/reset-password',
    '/api/admin/auth/login',
    '/api/admin/auth/password-reset/request',
    '/api/admin/auth/password-reset/reset',
    '/api/admin/auth/totp/enroll',
    '/api/admin/auth/totp/confirm',
  ]);
  const isPublicAuthRoute = publicAuthRoutes.has(pathname);
  const hasSessionCookie = request.cookies.has(ADMIN_SESSION_COOKIE);
  const isApiRequest = pathname.startsWith('/api/admin/');

  const response =
    isPublicAuthRoute || hasSessionCookie
      ? NextResponse.next({ request: { headers: responseHeaders } })
      : isApiRequest
        ? NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
        : NextResponse.json({ error: 'Not found' }, { status: 404 });

  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
