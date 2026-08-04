import { describe, expect, it } from 'vitest';

import { applyProposalDecision } from './decision.js';

const pendingProposal = {
  status: 'PENDING' as const,
  currentValue: { amount: 10, currency: 'EUR' },
  proposedValue: { amount: 12, currency: 'EUR' },
  isTextual: false,
};

describe('applyProposalDecision', () => {
  it('approves the proposed value and closes competing pending proposals', () => {
    expect(applyProposalDecision(pendingProposal, { action: 'APPROVE' })).toEqual({
      ok: true,
      value: {
        status: 'APPROVED',
        reviewerDecision: 'APPROVED',
        finalValue: { amount: 12, currency: 'EUR' },
        valueChanged: true,
        invalidateEnglishTranslation: false,
        supersedePending: true,
      },
    });
  });

  it('uses the edited value for edit-then-approve', () => {
    const result = applyProposalDecision(
      { ...pendingProposal, isTextual: true },
      { action: 'APPROVE', editedValue: 'New source description' },
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        finalValue: 'New source description',
        invalidateEnglishTranslation: true,
      },
    });
  });

  it('rejects without changing the current fact', () => {
    expect(
      applyProposalDecision(pendingProposal, {
        action: 'REJECT',
        reviewNote: 'Evidence insufficient',
      }),
    ).toEqual({
      ok: true,
      value: {
        status: 'REJECTED',
        reviewerDecision: 'REJECTED',
        finalValue: { amount: 10, currency: 'EUR' },
        valueChanged: false,
        invalidateEnglishTranslation: false,
        supersedePending: false,
      },
    });
  });

  it('rejects a proposal that was already decided', () => {
    expect(
      applyProposalDecision({ ...pendingProposal, status: 'APPROVED' }, { action: 'REJECT' }),
    ).toEqual({ ok: false, errors: [{ code: 'DECISION_CONFLICT' }] });
  });

  it('does not invalidate English when an approved text value is unchanged', () => {
    const result = applyProposalDecision(
      {
        ...pendingProposal,
        currentValue: 'Same text',
        proposedValue: 'Same text',
        isTextual: true,
      },
      { action: 'APPROVE' },
    );

    expect(result).toMatchObject({
      ok: true,
      value: { valueChanged: false, invalidateEnglishTranslation: false },
    });
  });
});
