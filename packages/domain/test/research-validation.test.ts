import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { validateResearchRecord } from '../src/research/validation.js';

type JsonRecord = Record<string, unknown>;

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/research/valid.json', import.meta.url), 'utf8'),
) as JsonRecord;

function cloneFixture() {
  return structuredClone(fixture) as JsonRecord;
}

function setAt(record: JsonRecord, path: string[], value: unknown) {
  const key = path.pop();
  if (!key) throw new Error('Cannot set the root value.');
  let current: JsonRecord = record;
  for (const segment of path) {
    current = current[segment] as JsonRecord;
  }
  current[key] = value;
}

describe('research static validation', () => {
  it('accepts a valid record and matching sector filename', () => {
    const result = validateResearchRecord(fixture, 'data/research/BS-01/stadtmuseum-konstanz.json');
    expect(result).toMatchObject({ valid: true, issues: [] });
  });

  it('rejects unknown taxonomy codes with a field path', () => {
    const record = cloneFixture();
    setAt(record, ['classification', 'primaryCategory', 'value'], 'invented_category');

    const result = validateResearchRecord(record);
    expect(result.issues).toContainEqual({
      path: 'classification.primaryCategory.value',
      code: 'taxonomy.unknown_code',
      message: 'Unknown taxonomy code: invented_category.',
    });
  });

  it('rejects coordinates outside the declared sector bounding box', () => {
    const record = cloneFixture();
    setAt(record, ['geo', 'coordinates', 'value', 'lat'], 47.9);

    const result = validateResearchRecord(record);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        path: 'geo.coordinates.value',
        code: 'scope.outside_sector_bbox',
      }),
    );
  });

  it('rejects a sector directory that disagrees with the record', () => {
    const result = validateResearchRecord(fixture, 'data/research/BS-14/stadtmuseum-konstanz.json');
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        path: 'researchMeta.sector',
        code: 'file.sector_directory_mismatch',
      }),
    );
  });
});
