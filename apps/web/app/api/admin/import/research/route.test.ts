import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResearchOutput } from '@lake/domain';

vi.mock('../../../../../src/auth/admin-guard', () => ({
  requireRole: vi.fn().mockResolvedValue({ role: 'REVIEWER' }),
}));
vi.mock('../../../../../src/auth/csrf', () => ({ hasSameOrigin: vi.fn(() => true) }));
vi.mock('../../../../../src/admin/import/repository', () => ({
  ImportValidationError: class ImportValidationError extends Error {},
  SourceOriginNotApprovedError: class SourceOriginNotApprovedError extends Error {},
  listResearchImportBatches: vi.fn().mockResolvedValue([]),
  persistResearchImport: vi.fn(),
  prepareResearchImport: vi.fn(),
  recordResearchImportBatch: vi.fn().mockResolvedValue({ id: 'batch-id' }),
}));

import { POST } from './route';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../../../../../../packages/domain/test/fixtures/research/valid.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as ResearchOutput;

function cloneFixture() {
  return structuredClone(fixture) as ResearchOutput;
}

describe('research import route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports copied prose as machine-readable validation details', async () => {
    const record = cloneFixture();
    const copiedSentence = record.localizations.de.summary.split('. ')[0]! + '.';
    Object.assign(record.identity.nameDe.evidence[0]!, { quoteOrData: copiedSentence });

    const response = await POST(
      new Request('http://localhost/api/admin/import/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ records: [record] }),
      }),
    );
    const body = (await response.json()) as {
      results: Array<{
        status: string;
        errors?: Array<{
          path: string;
          code: string;
          details?: { field: string; matchedQuote: string; similarity: number };
        }>;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      status: 'rejected',
      errors: [
        {
          path: 'localizations.de.summary',
          code: 'prose.copied',
          details: { field: 'localizations.de.summary', matchedQuote: copiedSentence },
        },
      ],
    });
    expect(body.results[0]?.errors?.[0]?.details?.similarity).toBeGreaterThanOrEqual(0);
  });
});
