import argon2 from 'argon2';
import type { AdminRole, PrismaClient } from '@prisma/client';

const roles = new Set<AdminRole>(['EDITOR', 'REVIEWER', 'ADMIN']);

export async function seedAdminUser(client: PrismaClient) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const roleInput = (process.env.ADMIN_ROLE ?? 'ADMIN') as AdminRole;

  if (!email && !password) {
    return;
  }
  if (!email || !password || password.length < 12 || !roles.has(roleInput)) {
    throw new Error(
      'ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD (12+ characters), and a valid ADMIN_ROLE are required.',
    );
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await client.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, role: roleInput },
    update: { passwordHash, role: roleInput, isActive: true },
  });
}
