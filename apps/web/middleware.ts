import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ADMIN_SESSION_COOKIE } from './src/auth/admin-session';

export function middleware(request: NextRequest) {
  const responseHeaders = new Headers(request.headers);
  responseHeaders.set('x-admin-pathname', request.nextUrl.pathname);

  const response =
    request.nextUrl.pathname === '/admin/login'
      ? NextResponse.next({ request: { headers: responseHeaders } })
      : request.cookies.has(ADMIN_SESSION_COOKIE)
        ? NextResponse.next({ request: { headers: responseHeaders } })
        : NextResponse.json({ error: 'Not found' }, { status: 404 });

  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
