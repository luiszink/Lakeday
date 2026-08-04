import { NextResponse } from 'next/server';

import { requireRole } from '../../../../src/auth/admin-guard';
import { listReviewProposals } from '../../../../src/admin/review/repository';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!(await requireRole('REVIEWER'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Reviewer role required.' } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const origin = url.searchParams.get('origin');
  const factKey = url.searchParams.get('factKey');
  const attractionStatus = url.searchParams.get('attractionStatus');
  const proposals = await listReviewProposals({
    ...(origin ? { origin } : {}),
    ...(factKey ? { factKey } : {}),
    ...(attractionStatus ? { attractionStatus } : {}),
  });

  return NextResponse.json({
    proposals: proposals.map((proposal) => ({
      ...proposal,
      createdAt: proposal.createdAt.toISOString(),
    })),
  });
}
