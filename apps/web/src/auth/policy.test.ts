import { describe, expect, it } from 'vitest';

import {
  GENERIC_LOGIN_ERROR,
  hasRequiredRole,
  isLockedUntil,
  lockoutUntil,
  loginBackoffMs,
} from './policy';

describe('admin role policy', () => {
  it('orders editor below reviewer and admin', () => {
    expect(hasRequiredRole('EDITOR', 'EDITOR')).toBe(true);
    expect(hasRequiredRole('EDITOR', 'REVIEWER')).toBe(false);
    expect(hasRequiredRole('REVIEWER', 'EDITOR')).toBe(true);
    expect(hasRequiredRole('ADMIN', 'REVIEWER')).toBe(true);
    expect(hasRequiredRole('REVIEWER', 'ADMIN')).toBe(false);
  });
});

describe('admin login backoff', () => {
  it('does not delay the first four failures', () => {
    expect(loginBackoffMs(0)).toBe(0);
    expect(loginBackoffMs(4)).toBe(0);
  });

  it('starts at the fifth failure and doubles up to the cap', () => {
    expect(loginBackoffMs(5)).toBe(1000);
    expect(loginBackoffMs(6)).toBe(2000);
    expect(loginBackoffMs(20)).toBe(15 * 60 * 1000);
  });

  it('creates and evaluates a clock-controlled lockout', () => {
    const now = new Date('2026-08-04T18:00:00.000Z');
    const lockedUntil = lockoutUntil(5, now);

    expect(lockedUntil).toEqual(new Date('2026-08-04T18:00:01.000Z'));
    expect(isLockedUntil(lockedUntil, now)).toBe(true);
    expect(isLockedUntil(lockedUntil, new Date('2026-08-04T18:00:01.000Z'))).toBe(false);
  });

  it('uses one generic message for factor failures', () => {
    expect(GENERIC_LOGIN_ERROR).toBe('Invalid credentials.');
  });
});
