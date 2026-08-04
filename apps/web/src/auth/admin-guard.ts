import { cookies } from 'next/headers';

import { database } from './database';
import { ADMIN_SESSION_COOKIE } from './admin-session';
import { hasRequiredRole, type AdminRole } from './policy';
import { verifyAdminSession, type AdminSession } from './session';

export { ADMIN_SESSION_COOKIE } from './admin-session';

export async function getAdminSession() {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) {
    return null;
  }

  const user = await database.adminUser.findUnique({ where: { id: session.userId } });
  if (!user?.isActive) {
    return null;
  }

  return { ...session, role: user.role as AdminRole };
}

export async function hasAdminSession() {
  return (await getAdminSession()) !== null;
}

export async function requireRole(requiredRole: AdminRole): Promise<AdminSession | null> {
  const session = await getAdminSession();
  return session && hasRequiredRole(session.role, requiredRole) ? session : null;
}
