import { notFound } from 'next/navigation';

import { requireRole } from '../../../src/auth/admin-guard';
import { listReviewProposals } from '../../../src/admin/review/repository';
import { ReviewQueue } from '../_components/review-queue';

export const runtime = 'nodejs';

export default async function ReviewQueuePage() {
  if (!(await requireRole('REVIEWER'))) notFound();
  const proposals = await listReviewProposals({});
  return (
    <ReviewQueue
      initialProposals={proposals.map((proposal) => ({
        ...proposal,
        createdAt: proposal.createdAt.toISOString(),
      }))}
    />
  );
}
