import { afterAll, describe, expect, it } from 'vitest';

import { database } from '../../auth/database';
import { applyReviewDecision } from './repository';

const describeDatabase =
  process.env.DATABASE_URL && process.env.RUN_REVIEW_INTEGRATION === '1' ? describe : describe.skip;
const mergeProposalId = '00000000-0000-4000-8000-000000000306';
const mergeFromId = '00000000-0000-4000-8000-000000000106';
const mergeIntoId = '00000000-0000-4000-8000-000000000105';
const sourceRecordId = '00000000-0000-4000-8000-000000000206';

afterAll(async () => {
  await database.$disconnect();
});

describeDatabase('review repository integration', () => {
  it('keeps the older attraction and records a non-self alias for a merge', async () => {
    const reviewer = await database.adminUser.findFirstOrThrow({ where: { role: 'ADMIN' } });
    const result = await applyReviewDecision(mergeProposalId, reviewer.id, { action: 'APPROVE' });
    const alias = await database.attractionAlias.findUnique({
      where: { mergedFromId: mergeFromId },
    });

    expect(result.merge).toEqual({ mergedIntoId: mergeIntoId, mergedFromId: mergeFromId });
    expect(alias).toMatchObject({ mergedIntoId: mergeIntoId, mergedFromId: mergeFromId });
    await expect(
      database.attraction.findUnique({ where: { id: mergeFromId }, select: { status: true } }),
    ).resolves.toMatchObject({ status: 'ARCHIVED' });

    await database.attraction.updateMany({
      where: { id: { in: [mergeFromId, mergeIntoId] } },
      data: { status: 'PUBLISHED' },
    });
    await database.attractionAlias.deleteMany({
      where: { mergedFromId: { in: [mergeFromId, mergeIntoId] } },
    });
    await database.factProvenance.deleteMany({ where: { sourceRecordId } });
    await database.changeProposal.update({
      where: { id: mergeProposalId },
      data: { status: 'PENDING', reviewedById: null, reviewedAt: null, reviewNote: null },
    });
  });
});
