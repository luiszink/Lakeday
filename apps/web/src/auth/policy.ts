export type AdminRole = 'EDITOR' | 'REVIEWER' | 'ADMIN';

const roleRank: Record<AdminRole, number> = {
  EDITOR: 1,
  REVIEWER: 2,
  ADMIN: 3,
};

export const LOGIN_BACKOFF_THRESHOLD = 5;
export const LOGIN_BACKOFF_CAP_MS = 15 * 60 * 1000;

export function hasRequiredRole(role: AdminRole, requiredRole: AdminRole) {
  return roleRank[role] >= roleRank[requiredRole];
}

export function loginBackoffMs(failedAttempts: number) {
  if (failedAttempts < LOGIN_BACKOFF_THRESHOLD) {
    return 0;
  }

  const exponent = Math.min(failedAttempts - LOGIN_BACKOFF_THRESHOLD, 10);
  return Math.min(LOGIN_BACKOFF_CAP_MS, 1000 * 2 ** exponent);
}

export function lockoutUntil(failedAttempts: number, now: Date) {
  const backoffMs = loginBackoffMs(failedAttempts);
  return backoffMs === 0 ? null : new Date(now.getTime() + backoffMs);
}

export function isLockedUntil(lockedUntil: Date | null | undefined, now: Date) {
  return lockedUntil !== null && lockedUntil !== undefined && lockedUntil.getTime() > now.getTime();
}

export const GENERIC_LOGIN_ERROR = 'Invalid credentials.';
