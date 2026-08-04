import { describe, expect, it } from 'vitest';

import {
  generateRegionCandidatePairs,
  normalizeName,
  normalizeOfficialUrl,
  scoreDuplicatePair,
  trigramSimilarity,
  type DuplicateCandidate,
} from './index.js';

const fixtureDuplicateA: DuplicateCandidate = {
  id: 'fixture-near-duplicate-a',
  regionCode: 'KONSTANZ_SEERHEIN',
  name: 'Testhaus am Hafen GmbH',
  officialUrl: 'https://www.example.test/hafen?utm_source=newsletter',
  coordinates: { latitude: 47.6634, longitude: 9.1755 },
};
const fixtureDuplicateB: DuplicateCandidate = {
  id: 'fixture-near-duplicate-b',
  regionCode: 'KONSTANZ_SEERHEIN',
  name: 'Test-Haus am Hafen',
  officialUrl: 'https://example.test/hafen/',
  coordinates: { latitude: 47.6637, longitude: 9.1757 },
};
const distinctNeighbour: DuplicateCandidate = {
  id: 'fixture-distinct-neighbour',
  regionCode: 'KONSTANZ_SEERHEIN',
  name: 'Neues Schloss Meersburg',
  officialUrl: 'https://example.test/neues-schloss',
  coordinates: { latitude: 47.6648, longitude: 9.177 },
};

describe('duplicate normalization', () => {
  it('folds diacritics, sharp s, punctuation, and legal suffixes', () => {
    expect(normalizeName('Schloß-Museum e. V.')).toBe('schloss museum');
    expect(normalizeName('  MÜNSTER  ')).toBe('munster');
  });

  it('normalizes official URLs to host and path without tracking parameters', () => {
    expect(normalizeOfficialUrl('https://WWW.Example.test/place/?utm_source=mail')).toBe(
      'example.test/place',
    );
    expect(normalizeOfficialUrl('not a url')).toBeNull();
  });

  it('matches umlaut and sharp-s spelling variants with high trigram similarity', () => {
    expect(trigramSimilarity('Schloß', 'Schloss')).toBe(1);
    expect(trigramSimilarity('Münster', 'Munster')).toBe(1);
  });
});

describe('duplicate scoring', () => {
  it('classifies a shared external identifier as a certain duplicate', () => {
    const result = scoreDuplicatePair(
      { ...fixtureDuplicateA, externalIdentifiers: [{ system: 'OSM', externalId: '42' }] },
      { ...fixtureDuplicateB, externalIdentifiers: [{ system: 'OSM', externalId: '42' }] },
    );
    expect(result.classification).toBe('DUPLICATE');
    expect(result.signals).toContainEqual({ source: 'EXTERNAL_IDENTIFIER', strength: 'CERTAIN' });
  });

  it('classifies two strong signals as a duplicate and one as a review candidate', () => {
    expect(scoreDuplicatePair(fixtureDuplicateA, fixtureDuplicateB).classification).toBe(
      'DUPLICATE',
    );
    expect(
      scoreDuplicatePair(
        { ...fixtureDuplicateA, name: 'Alpha', coordinates: { latitude: 47.4, longitude: 9 } },
        { ...fixtureDuplicateB, name: 'Beta', coordinates: { latitude: 47.8, longitude: 9.8 } },
      ).classification,
    ).toBe('REVIEW');
  });

  it('distinguishes strong and weak coordinate thresholds', () => {
    const strong = scoreDuplicatePair(
      {
        ...fixtureDuplicateA,
        name: 'Alpha',
        coordinates: { latitude: 47.6634, longitude: 9.1755 },
      },
      { ...fixtureDuplicateB, name: 'Beta', coordinates: { latitude: 47.664, longitude: 9.1755 } },
    );
    const weak = scoreDuplicatePair(
      {
        ...fixtureDuplicateA,
        name: 'Alpha',
        coordinates: { latitude: 47.6634, longitude: 9.1755 },
      },
      { ...fixtureDuplicateB, name: 'Beta', coordinates: { latitude: 47.665, longitude: 9.1755 } },
    );
    expect(strong.signals).toContainEqual({ source: 'COORDINATES', strength: 'STRONG' });
    expect(weak.signals).toContainEqual({ source: 'COORDINATES', strength: 'WEAK' });
  });

  it('keeps the Burg versus Neues Schloss analogue distinct', () => {
    expect(
      scoreDuplicatePair(
        {
          ...fixtureDuplicateA,
          name: 'Burg Meersburg',
          officialUrl: 'https://example.test/burg',
          coordinates: { latitude: 47.7, longitude: 9.27 },
        },
        distinctNeighbour,
      ).classification,
    ).toBe('DISTINCT');
  });
});

describe('region candidate generation', () => {
  it('generates unique pairs only within a region bucket', () => {
    const pairs = generateRegionCandidatePairs([
      fixtureDuplicateA,
      fixtureDuplicateB,
      distinctNeighbour,
      { ...distinctNeighbour, id: 'other-region', regionCode: 'OBERSEE_NORD' },
    ]);
    expect(pairs).toHaveLength(3);
    expect(pairs.every(([left, right]) => left.regionCode === right.regionCode)).toBe(true);
  });
});

describe('fixture duplicate quality', () => {
  it('has perfect precision and recall for the synthetic duplicate pair', () => {
    const pairs = generateRegionCandidatePairs([
      fixtureDuplicateA,
      fixtureDuplicateB,
      distinctNeighbour,
    ]);
    const expectedDuplicateIds = new Set(['fixture-near-duplicate-a:fixture-near-duplicate-b']);
    const detectedDuplicateIds = new Set(
      pairs
        .filter(([left, right]) => scoreDuplicatePair(left, right).classification === 'DUPLICATE')
        .map(([left, right]) => [left.id, right.id].sort().join(':')),
    );
    const truePositives = [...detectedDuplicateIds].filter((pair) =>
      expectedDuplicateIds.has(pair),
    ).length;
    expect(truePositives / detectedDuplicateIds.size).toBe(1);
    expect(truePositives / expectedDuplicateIds.size).toBe(1);
  });
});
