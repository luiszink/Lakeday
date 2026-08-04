import { cookies } from 'next/headers';

import { ADMIN_SESSION_COOKIE } from './admin-session';

export { ADMIN_SESSION_COOKIE } from './admin-session';

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return cookieStore.has(ADMIN_SESSION_COOKIE);
}
