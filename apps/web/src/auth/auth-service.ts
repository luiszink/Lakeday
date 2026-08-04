import { createHash, createHmac, randomBytes } from 'node:crypto';

import { AdminRole, LoginAuditEvent } from '@lake/db';
import argon2 from 'argon2';
import QRCode from 'qrcode';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';

import { database } from './database';
import { sendPasswordResetEmail } from './email';
import { createTotpEnrollmentToken, verifyTotpEnrollmentToken } from './session';
import {
  GENERIC_LOGIN_ERROR,
  isLockedUntil,
  lockoutUntil,
  type AdminRole as PolicyRole,
} from './policy';

export type LoginResult =
  | { status: 'SUCCESS'; userId: string; role: PolicyRole }
  | { status: 'ENROLLMENT_REQUIRED'; enrollmentToken: string }
  | { status: 'FAILURE'; error: typeof GENERIC_LOGIN_ERROR; retryAfterSeconds?: number };

export type AuditContext = {
  ipAddress?: string;
  userAgent?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashIpAddress(ipAddress: string | undefined) {
  if (!ipAddress) {
    return undefined;
  }

  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) {
    return undefined;
  }

  return createHmac('sha256', secret).update(ipAddress).digest('hex');
}

function rateLimitKey(ipAddress: string | undefined) {
  const ipHash = hashIpAddress(ipAddress);
  return ipHash ? `ip:${ipHash}` : undefined;
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function auditFields(context: AuditContext) {
  return {
    ipHash: hashIpAddress(context.ipAddress) ?? null,
    userAgent: context.userAgent?.slice(0, 512) ?? null,
  };
}

function retryAfterSeconds(lockedUntil: Date | null | undefined, now: Date) {
  if (!lockedUntil) {
    return undefined;
  }

  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
}

async function audit(
  email: string,
  event: LoginAuditEvent,
  context: AuditContext,
  adminUserId?: string,
) {
  const data = { email, event, ...auditFields(context) };
  if (adminUserId) {
    await database.loginAudit.create({
      data: { ...data, adminUser: { connect: { id: adminUserId } } },
    });
    return;
  }

  await database.loginAudit.create({ data });
}

async function recordFailure(
  userId: string | undefined,
  email: string,
  context: AuditContext,
  now: Date,
  event: LoginAuditEvent = LoginAuditEvent.PASSWORD_FAILURE,
) {
  const ipKey = rateLimitKey(context.ipAddress);
  const existingIpLimit = ipKey
    ? await database.loginRateLimit.findUnique({ where: { key: ipKey } })
    : null;
  const ipAttempts = (existingIpLimit?.failedAttempts ?? 0) + 1;
  const ipLockedUntil = lockoutUntil(ipAttempts, now);

  await database.$transaction(async (transaction) => {
    if (userId) {
      const user = await transaction.adminUser.findUnique({ where: { id: userId } });
      if (user) {
        const failedAttempts = user.failedLoginAttempts + 1;
        await transaction.adminUser.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: failedAttempts,
            lockedUntil: lockoutUntil(failedAttempts, now),
          },
        });
      }
    }

    if (ipKey) {
      await transaction.loginRateLimit.upsert({
        where: { key: ipKey },
        create: { key: ipKey, failedAttempts: ipAttempts, lockedUntil: ipLockedUntil },
        update: { failedAttempts: ipAttempts, lockedUntil: ipLockedUntil },
      });
    }

    await transaction.loginAudit.create({
      data: {
        email,
        event,
        ...auditFields(context),
        ...(userId ? { adminUser: { connect: { id: userId } } } : {}),
      },
    });
  });

  const user = userId ? await database.adminUser.findUnique({ where: { id: userId } }) : null;
  const retryAt = user?.lockedUntil ?? ipLockedUntil;
  return retryAfterSeconds(retryAt, now);
}

async function verifyRecoveryCode(userId: string, code: string) {
  const user = await database.adminUser.findUnique({ where: { id: userId } });
  if (!user) {
    return false;
  }

  for (const [index, hash] of user.recoveryCodeHashes.entries()) {
    if (await argon2.verify(hash, code)) {
      await database.adminUser.update({
        where: { id: userId },
        data: {
          recoveryCodeHashes: user.recoveryCodeHashes.filter((_, itemIndex) => itemIndex !== index),
        },
      });
      return true;
    }
  }

  return false;
}

export async function loginAdmin(
  input: { email: string; password: string; totp?: string; recoveryCode?: string },
  context: AuditContext,
  now = new Date(),
): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const user = await database.adminUser.findUnique({ where: { email } });
  const ipKey = rateLimitKey(context.ipAddress);
  const ipLimit = ipKey
    ? await database.loginRateLimit.findUnique({ where: { key: ipKey } })
    : null;

  if (
    (user && (!user.isActive || isLockedUntil(user.lockedUntil, now))) ||
    isLockedUntil(ipLimit?.lockedUntil, now)
  ) {
    const retryAfter = retryAfterSeconds(user?.lockedUntil ?? ipLimit?.lockedUntil, now);
    await audit(email, LoginAuditEvent.LOCKED, context, user?.id);
    return {
      status: 'FAILURE',
      error: GENERIC_LOGIN_ERROR,
      ...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
    };
  }

  const passwordValid = user?.passwordHash
    ? await argon2.verify(user.passwordHash, input.password)
    : false;
  if (!user || !user.isActive || !passwordValid) {
    const retryAfter = await recordFailure(user?.id, email, context, now);
    return {
      status: 'FAILURE',
      error: GENERIC_LOGIN_ERROR,
      ...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
    };
  }

  if (!user.totpVerified || !user.totpSecret) {
    await audit(email, LoginAuditEvent.TOTP_ENROLLED, context, user.id);
    return {
      status: 'ENROLLMENT_REQUIRED',
      enrollmentToken: createTotpEnrollmentToken(user.id, user.role as PolicyRole, now.getTime()),
    };
  }

  let secondFactorValid = false;
  let usedRecoveryCode = false;
  if (input.recoveryCode) {
    usedRecoveryCode = await verifyRecoveryCode(user.id, input.recoveryCode.trim());
    secondFactorValid = usedRecoveryCode;
  }
  if (!secondFactorValid && input.totp) {
    try {
      secondFactorValid = (await verifyTotp({ secret: user.totpSecret, token: input.totp })).valid;
    } catch {
      secondFactorValid = false;
    }
  }

  if (!secondFactorValid) {
    const retryAfter = await recordFailure(
      user.id,
      email,
      context,
      now,
      LoginAuditEvent.TOTP_FAILURE,
    );
    return {
      status: 'FAILURE',
      error: GENERIC_LOGIN_ERROR,
      ...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
    };
  }

  await database.$transaction([
    database.adminUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
    }),
    ...(ipKey ? [database.loginRateLimit.deleteMany({ where: { key: ipKey } })] : []),
    database.loginAudit.create({
      data: {
        email,
        event: usedRecoveryCode ? LoginAuditEvent.RECOVERY_CODE_USED : LoginAuditEvent.SUCCESS,
        ...auditFields(context),
        adminUser: { connect: { id: user.id } },
      },
    }),
  ]);

  return { status: 'SUCCESS', userId: user.id, role: user.role as PolicyRole };
}

export async function beginTotpEnrollment(enrollmentToken: string) {
  const enrollment = verifyTotpEnrollmentToken(enrollmentToken);
  if (!enrollment) {
    return null;
  }

  const user = await database.adminUser.findUnique({ where: { id: enrollment.userId } });
  if (!user || !user.isActive || user.totpVerified) {
    return null;
  }

  const secret = user.totpSecret ?? generateSecret();
  if (!user.totpSecret) {
    await database.adminUser.update({ where: { id: user.id }, data: { totpSecret: secret } });
  }

  const uri = generateURI({ issuer: 'BodenseeGuide', label: user.email, secret });
  return { userId: user.id, secret, uri, qrDataUrl: await QRCode.toDataURL(uri) };
}

export async function confirmTotpEnrollment(
  enrollmentToken: string,
  code: string,
  context: AuditContext = {},
  now = new Date(),
) {
  const enrollment = verifyTotpEnrollmentToken(enrollmentToken);
  if (!enrollment) {
    return null;
  }

  const user = await database.adminUser.findUnique({ where: { id: enrollment.userId } });
  if (!user?.totpSecret || !user.isActive || user.totpVerified) {
    return null;
  }
  if (isLockedUntil(user.lockedUntil, now)) {
    await audit(user.email, LoginAuditEvent.LOCKED, context, user.id);
    return null;
  }

  let valid = false;
  try {
    valid = (await verifyTotp({ secret: user.totpSecret, token: code.trim() })).valid;
  } catch {
    valid = false;
  }
  if (!valid) {
    await recordFailure(user.id, user.email, context, now, LoginAuditEvent.TOTP_FAILURE);
    return null;
  }

  const recoveryCodes = Array.from({ length: 10 }, () =>
    randomBytes(6).toString('hex').toUpperCase(),
  );
  const recoveryCodeHashes = await Promise.all(
    recoveryCodes.map((recoveryCode) => argon2.hash(recoveryCode)),
  );
  const enrolled = await database.$transaction(async (transaction) => {
    const claimed = await transaction.adminUser.updateMany({
      where: { id: user.id, isActive: true, totpVerified: false },
      data: {
        totpVerified: true,
        recoveryCodeHashes,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    if (claimed.count !== 1) {
      return false;
    }

    await transaction.loginAudit.create({
      data: {
        email: user.email,
        event: LoginAuditEvent.TOTP_ENROLLED,
        ...auditFields(context),
        adminUser: { connect: { id: user.id } },
      },
    });
    return true;
  });
  if (!enrolled) {
    return null;
  }

  return { userId: user.id, role: user.role as PolicyRole, recoveryCodes };
}

export async function requestPasswordReset(
  emailInput: string,
  baseUrl: string,
  context: AuditContext,
  now = new Date(),
) {
  const email = normalizeEmail(emailInput);
  const user = await database.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return undefined;
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
  await database.$transaction(async (transaction) => {
    await transaction.passwordResetToken.deleteMany({
      where: { adminUserId: user.id, usedAt: null },
    });
    await transaction.passwordResetToken.create({
      data: { adminUserId: user.id, tokenHash: hashResetToken(token), expiresAt },
    });
  });

  const resetUrl = `${baseUrl.replace(/\/$/, '')}/admin/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await sendPasswordResetEmail({ recipient: user.email, resetUrl, expiresAt });
  } finally {
    await audit(email, LoginAuditEvent.PASSWORD_RESET_REQUESTED, context, user.id);
  }

  return process.env.NODE_ENV === 'production' ? undefined : token;
}

export async function resetPassword(token: string, password: string, now = new Date()) {
  const resetToken = await database.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { adminUser: { select: { email: true } } },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
    return false;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  return database.$transaction(async (transaction) => {
    const claimed = await transaction.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) {
      return false;
    }

    await transaction.adminUser.update({
      where: { id: resetToken.adminUserId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    await transaction.loginAudit.create({
      data: {
        email: resetToken.adminUser.email,
        event: LoginAuditEvent.PASSWORD_RESET_COMPLETED,
        adminUser: { connect: { id: resetToken.adminUserId } },
        ipHash: null,
        userAgent: null,
      },
    });
    return true;
  });
}

export function authErrorMessage() {
  return GENERIC_LOGIN_ERROR;
}

export const adminRoleValues = [AdminRole.EDITOR, AdminRole.REVIEWER, AdminRole.ADMIN] as const;
