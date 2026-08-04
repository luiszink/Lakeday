import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AdminRole } from './policy';

export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

export type AdminSession = {
  userId: string;
  role: AdminRole;
  issuedAt: number;
  expiresAt: number;
};

type SignedSession = AdminSession & {
  purpose?: 'totp-enrollment';
};

function sessionSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_AUTH_SECRET must contain at least 32 characters.');
  }

  return secret;
}

function encode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signature(payload: string) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createAdminSession(userId: string, role: AdminRole, now = Date.now()) {
  const payload: AdminSession = {
    userId,
    role,
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function createTotpEnrollmentToken(userId: string, role: AdminRole, now = Date.now()) {
  const payload: SignedSession = {
    userId,
    role,
    issuedAt: now,
    expiresAt: now + 10 * 60 * 1000,
    purpose: 'totp-enrollment',
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function verifyAdminSession(
  token: string | undefined,
  now = Date.now(),
): AdminSession | null {
  const [encodedPayload, providedSignature] = token?.split('.') ?? [];
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  try {
    const expectedSignature = signature(encodedPayload);
    const providedBytes = Buffer.from(providedSignature, 'base64url');
    const expectedBytes = Buffer.from(expectedSignature, 'base64url');
    if (
      providedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(providedBytes, expectedBytes)
    ) {
      return null;
    }

    const payload = JSON.parse(decode(encodedPayload)) as SignedSession;
    if (
      typeof payload.userId !== 'string' ||
      !['EDITOR', 'REVIEWER', 'ADMIN'].includes(payload.role) ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.purpose !== undefined ||
      payload.expiresAt <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function verifyTotpEnrollmentToken(token: string | undefined, now = Date.now()) {
  const [encodedPayload, providedSignature] = token?.split('.') ?? [];
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  try {
    const expectedSignature = signature(encodedPayload);
    const providedBytes = Buffer.from(providedSignature, 'base64url');
    const expectedBytes = Buffer.from(expectedSignature, 'base64url');
    if (
      providedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(providedBytes, expectedBytes)
    ) {
      return null;
    }

    const payload = JSON.parse(decode(encodedPayload)) as SignedSession;
    if (
      payload.purpose !== 'totp-enrollment' ||
      typeof payload.userId !== 'string' ||
      !['EDITOR', 'REVIEWER', 'ADMIN'].includes(payload.role) ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= now
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
