import { describe, expect, it } from 'vitest';

import { haversineDistanceM, scoreRelevance } from './relevance.js';

describe('relevance scoring', () => {
  it('is deterministic and keeps scores within the configured range', () => {
    const input = {
      dataCompleteness: 0.8,
      editorialImportance: 0.7,
      freshness: 0.9,
      proximity: 0.4,
      seasonFit: 1,
    };

    expect(scoreRelevance(input)).toBe(scoreRelevance(input));
    expect(scoreRelevance(input)).toBeGreaterThanOrEqual(0);
    expect(scoreRelevance(input)).toBeLessThanOrEqual(1);
  });

  it('redistributes the proximity weight when no location is available', () => {
    const input = {
      dataCompleteness: 0.8,
      editorialImportance: 0.7,
      freshness: 0.9,
      seasonFit: 1,
    };

    expect(scoreRelevance(input)).toBeGreaterThan(scoreRelevance({ ...input, proximity: 0 }));
  });
});

describe('distance scoring', () => {
  it('matches the great-circle distance for a one-degree longitude step', () => {
    expect(
      haversineDistanceM({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }),
    ).toBeCloseTo(111_195, -1);
  });
});
