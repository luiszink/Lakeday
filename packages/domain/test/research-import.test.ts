import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildResearchImportPlan,
  type ResearchImportCandidate,
  type ResearchImportContext,
} from '../src/research/import.js';
import type { ResearchOutput } from '../src/research/schema.js';

const record = JSON.parse(
  readFileSync(new URL('./fixtures/research/valid.json', import.meta.url), 'utf8'),
) as ResearchOutput;

const baseContext: ResearchImportContext = {
  assignedRegionCode: 'OBERSEE_NORD',
  shorelineDistanceM: 300,
  inScope: true,
  existingCandidates: [],
};

function candidate(overrides: Partial<ResearchImportCandidate>): ResearchImportCandidate {
  return {
    id: 'existing-attraction',
    status: 'DRAFT',
    regionCode: 'OBERSEE_NORD',
    name: 'Different place',
    officialUrl: 'https://different.example/place',
    coordinates: { latitude: 47.7, longitude: 9.2 },
    ...overrides,
  };
}

describe('research import plan', () => {
  it('creates a distinct draft with evidence-derived proposals', () => {
    const plan = buildResearchImportPlan(record, baseContext);
    expect(plan).toMatchObject({ action: 'CREATE', targetAttractionId: null });
    expect(plan.proposals.map(({ factKey }) => factKey)).toEqual(
      expect.arrayContaining(['LOCATION', 'CONTACT', 'OPENING_HOURS', 'PRICE']),
    );
  });

  it('updates an exact duplicate draft', () => {
    const plan = buildResearchImportPlan(record, {
      ...baseContext,
      existingCandidates: [
        candidate({
          name: 'Stadtmuseum Konstanz',
          officialUrl: 'https://example.com/museum',
          coordinates: { latitude: 47.66, longitude: 9.17 },
        }),
      ],
    });
    expect(plan).toMatchObject({ action: 'UPDATE', targetAttractionId: 'existing-attraction' });
    expect(plan.duplicate?.score.classification).toBe('DUPLICATE');
  });

  it('holds a strong candidate and a published duplicate', () => {
    const plan = buildResearchImportPlan(record, {
      ...baseContext,
      existingCandidates: [
        candidate({
          status: 'PUBLISHED',
          name: 'Stadtmuseum Konstanz Sammlung',
          coordinates: { latitude: 47.6605, longitude: 9.1705 },
        }),
      ],
    });
    expect(plan.action).toBe('HOLD');
    expect(plan.targetAttractionId).toBe('existing-attraction');
  });

  it('rejects an out-of-scope record without an exception', () => {
    const plan = buildResearchImportPlan(record, { ...baseContext, inScope: false });
    expect(plan).toMatchObject({ action: 'REJECT', targetAttractionId: null });
    expect(plan.reasons[0]).toContain('outside the product scope');
  });

  it('creates a draft but carries review flags as proposals', () => {
    const flagged = structuredClone(record) as ResearchOutput;
    flagged.reviewFlags = [{ reason: 'conflicting_sources', detail: 'Hours disagree.' }];
    const plan = buildResearchImportPlan(flagged, baseContext);
    expect(plan.action).toBe('CREATE');
    expect(plan.reasons).toContain('Review flags require human review.');
    expect(plan.proposals.at(-1)).toMatchObject({ factKey: 'CONTACT', confidence: 'LOW' });
  });
});
