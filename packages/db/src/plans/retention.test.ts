import { describe, expect, it } from 'vitest';

import { planRetentionCutoff } from './retention.js';

describe('plan retention', () => {
  it('uses a twelve-month idle cutoff', () => {
    expect(planRetentionCutoff(new Date('2027-08-12T10:00:00.000Z')).toISOString()).toBe(
      '2026-08-12T10:00:00.000Z',
    );
  });
});