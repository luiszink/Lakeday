import { NextResponse } from 'next/server';

import { getAdminSession } from '../../../../../src/auth/admin-guard';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    role: session.role,
    expiresAt: session.expiresAt,
  });
}
