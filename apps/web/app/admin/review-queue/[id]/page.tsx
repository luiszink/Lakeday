import { notFound } from 'next/navigation';

import { requireRole } from '../../../../src/auth/admin-guard';
import {
  getReviewProposal,
  ReviewProposalNotFoundError,
} from '../../../../src/admin/review/repository';
import { ReviewDetail } from '../../_components/review-detail';

export const runtime = 'nodejs';

type PageContext = { params: Promise<{ id: string }> };

export default async function ReviewProposalPage({ params }: PageContext) {
  if (!(await requireRole('REVIEWER'))) notFound();
  try {
    const proposal = await getReviewProposal((await params).id);
    return <ReviewDetail proposal={JSON.parse(JSON.stringify(proposal))} />;
  } catch (error) {
    if (error instanceof ReviewProposalNotFoundError) notFound();
    throw error;
  }
}
