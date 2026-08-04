import { AdminRole } from '@lake/db';
import argon2 from 'argon2';
import { NextResponse } from 'next/server';

import { database } from '../../../../src/auth/database';
import { hasSameOrigin } from '../../../../src/auth/csrf';
import { requireRole } from '../../../../src/auth/admin-guard';

export const runtime = 'nodejs';

const roleValues = new Set(Object.values(AdminRole));

function publicUser(user: {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function GET() {
  if (!(await requireRole('ADMIN'))) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const users = await database.adminUser.findMany({
    orderBy: { email: 'asc' },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json({ users: users.map(publicUser) });
}

export async function POST(request: Request) {
  const session = await requireRole('ADMIN');
  if (!session) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    role?: unknown;
  } | null;
  if (
    typeof body?.email !== 'string' ||
    typeof body.password !== 'string' ||
    body.password.length < 12 ||
    typeof body.role !== 'string' ||
    !roleValues.has(body.role as AdminRole)
  ) {
    return NextResponse.json(
      { error: 'Email, role, and a 12-character password are required.' },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
  try {
    const user = await database.adminUser.create({
      data: { email, passwordHash, role: body.role as AdminRole },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to create user.' }, { status: 409 });
  }
}
