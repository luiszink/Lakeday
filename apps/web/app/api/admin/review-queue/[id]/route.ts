import { NextResponse } from 'next/server';

import { requireRole } from '../../../../../src/auth/admin-guard';
import {
  getReviewProposal,
  ReviewProposalNotFoundError,
} from '../../../../../src/admin/review/repository';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  if (!(await requireRole('REVIEWER'))) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Reviewer role required.' } },
      { status: 403 },
    );
  }

  try {
    const proposal = await getReviewProposal((await context.params).id);
    return NextResponse.json({
      proposal: {
        ...proposal,
        createdAt: proposal.createdAt.toISOString(),
        updatedAt: proposal.updatedAt.toISOString(),
        reviewedAt: proposal.reviewedAt?.toISOString() ?? null,
        attraction: {
          ...proposal.attraction,
          createdAt: proposal.attraction.createdAt.toISOString(),
          updatedAt: proposal.attraction.updatedAt.toISOString(),
          factProvenances: proposal.attraction.factProvenances.map((provenance) => ({
            ...provenance,
            lastCheckedAt: provenance.lastCheckedAt.toISOString(),
            nextRefreshAt: provenance.nextRefreshAt.toISOString(),
            createdAt: provenance.createdAt.toISOString(),
            updatedAt: provenance.updatedAt.toISOString(),
            reviewedAt: provenance.reviewedAt?.toISOString() ?? null,
          })),
        },
        sourceRecord: proposal.sourceRecord
          ? {
              ...proposal.sourceRecord,
              retrievedAt: proposal.sourceRecord.retrievedAt.toISOString(),
              createdAt: proposal.sourceRecord.createdAt.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    if (error instanceof ReviewProposalNotFoundError) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Unable to load proposal.' } },
      { status: 500 },
    );
  }
}
