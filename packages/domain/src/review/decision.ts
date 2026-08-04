import { z } from 'zod';

import { failure, success, type Result } from '../result.js';

export const reviewProposalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED']);

export const reviewDecisionActionSchema = z.enum(['APPROVE', 'REJECT']);

export const reviewDecisionSchema = z.object({
  action: reviewDecisionActionSchema,
  editedValue: z.unknown().optional(),
  reviewNote: z.string().trim().max(2_000).nullable().optional(),
});

export type ReviewProposalStatus = z.infer<typeof reviewProposalStatusSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

export type ReviewProposal = Readonly<{
  status: ReviewProposalStatus;
  currentValue: unknown | null;
  proposedValue: unknown;
  isTextual: boolean;
}>;

export type ReviewDecisionResult = Readonly<{
  status: 'APPROVED' | 'REJECTED';
  reviewerDecision: 'APPROVED' | 'REJECTED';
  finalValue: unknown | null;
  valueChanged: boolean;
  invalidateEnglishTranslation: boolean;
  supersedePending: boolean;
}>;

export type ReviewDecisionViolation = Readonly<{
  code: 'DECISION_CONFLICT';
}>;

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function applyProposalDecision(
  proposalInput: ReviewProposal,
  decisionInput: ReviewDecision,
): Result<ReviewDecisionResult, ReviewDecisionViolation> {
  const proposal = {
    ...proposalInput,
    status: reviewProposalStatusSchema.parse(proposalInput.status),
  };
  const decision = reviewDecisionSchema.parse(decisionInput);

  if (proposal.status !== 'PENDING') {
    return failure([{ code: 'DECISION_CONFLICT' }]);
  }

  if (decision.action === 'REJECT') {
    return success({
      status: 'REJECTED',
      reviewerDecision: 'REJECTED',
      finalValue: proposal.currentValue,
      valueChanged: false,
      invalidateEnglishTranslation: false,
      supersedePending: false,
    });
  }

  const finalValue =
    decision.editedValue === undefined ? proposal.proposedValue : decision.editedValue;
  const valueChanged = !valuesEqual(proposal.currentValue, finalValue);

  return success({
    status: 'APPROVED',
    reviewerDecision: 'APPROVED',
    finalValue,
    valueChanged,
    invalidateEnglishTranslation: proposal.isTextual && valueChanged,
    supersedePending: true,
  });
}
