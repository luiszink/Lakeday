import { beforeEach, describe, expect, it } from 'vitest';

import { ADMIN_SESSION_TTL_SECONDS, createAdminSession, verifyAdminSession } from './session';

beforeEach(() => {
  process.env.ADMIN_AUTH_SECRET = 'test-secret-with-at-least-32-characters';
});

describe('admin sessions', () => {
  it('signs a role-bearing session with a 12-hour absolute expiry', () => {
    const issuedAt = Date.parse('2026-08-04T18:00:00.000Z');
    const token = createAdminSession('user-1', 'REVIEWER', issuedAt);

    expect(verifyAdminSession(token, issuedAt)).toMatchObject({
      userId: 'user-1',
      role: 'REVIEWER',
      issuedAt,
      expiresAt: issuedAt + ADMIN_SESSION_TTL_SECONDS * 1000,
    });
  });

  it('rejects expired and tampered sessions', () => {
    const issuedAt = Date.parse('2026-08-04T18:00:00.000Z');
    const token = createAdminSession('user-1', 'EDITOR', issuedAt);

    expect(verifyAdminSession(token, issuedAt + ADMIN_SESSION_TTL_SECONDS * 1000)).toBeNull();
    expect(verifyAdminSession(`${token}tampered`, issuedAt)).toBeNull();
  });
});
