import { notFound } from 'next/navigation';

import { database } from '../../../src/auth/database';
import { requireRole } from '../../../src/auth/admin-guard';
import { AdminUsers } from '../_components/users';

export const runtime = 'nodejs';

export default async function AdminUsersPage() {
  if (!(await requireRole('ADMIN'))) {
    notFound();
  }

  const users = await database.adminUser.findMany({
    orderBy: { email: 'asc' },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return (
    <AdminUsers
      initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))}
    />
  );
}
