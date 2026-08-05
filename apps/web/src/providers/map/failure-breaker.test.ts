import { describe, expect, it } from 'vitest';

import { MapFailureBreaker } from './failure-breaker';

describe('MapFailureBreaker', () => {
  it('opens once the failure threshold is reached within the window', () => {
    const breaker = new MapFailureBreaker({ threshold: 2, windowMs: 1_000 });

    expect(breaker.recordFailure(100)).toBe(false);
    expect(breaker.recordFailure(500)).toBe(true);
    expect(breaker.recordFailure(600)).toBe(false);
  });

  it('forgets failures outside the window and can reset', () => {
    const breaker = new MapFailureBreaker({ threshold: 2, windowMs: 1_000 });

    expect(breaker.recordFailure(100)).toBe(false);
    expect(breaker.recordFailure(1_101)).toBe(false);
    expect(breaker.recordFailure(1_200)).toBe(true);
    breaker.reset();
    expect(breaker.recordFailure(1_300)).toBe(false);
  });
});
