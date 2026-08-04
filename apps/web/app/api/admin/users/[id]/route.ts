import { AdminRole } from '@lake/db';
import { NextResponse } from 'next/server';

import { database } from '../../../../../src/auth/database';
import { hasSameOrigin } from '../../../../../src/auth/csrf';
import { requireRole } from '../../../../../src/auth/admin-guard';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireRole('ADMIN');
  if (!session) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    role?: unknown;
    isActive?: unknown;
  } | null;
  if (
    (body?.role !== undefined && !Object.values(AdminRole).includes(body.role as AdminRole)) ||
    (body?.isActive !== undefined && typeof body.isActive !== 'boolean')
  ) {
    return NextResponse.json({ error: 'Invalid user update.' }, { status: 400 });
  }
  if (id === session.userId && body?.isActive === false) {
    return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
  }

  const user = await database.adminUser
    .update({
      where: { id },
      data: {
        ...(body?.role !== undefined ? { role: body.role as AdminRole } : {}),
        ...(body?.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    })
    .catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }
  return NextResponse.json({ user: { ...user, createdAt: user.createdAt.toISOString() } });
}
