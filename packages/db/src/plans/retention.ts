import type { PrismaClient } from '@prisma/client';

export function planRetentionCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff;
}

export async function deleteExpiredPlans(
  database: Pick<PrismaClient, 'plan'>,
  now = new Date(),
) {
  return database.plan.deleteMany({
    where: { lastAccessedAt: { lt: planRetentionCutoff(now) } },
  });
}