import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  parseResearchOutput,
  researchOutputJsonSchema,
  researchOutputSchema,
  UnsupportedResearchSchemaVersionError,
} from '../src/research/schema.js';

type JsonRecord = Record<string, unknown>;
type JsonContainer = JsonRecord | unknown[];
type InvalidCase = Readonly<{
  name: string;
  path: string;
  mutate: (record: JsonRecord) => void;
}>;

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/research/valid.json', import.meta.url), 'utf8'),
) as JsonRecord;

function cloneFixture() {
  return structuredClone(fixture) as JsonRecord;
}

function containerAt(record: JsonRecord, path: string[]) {
  let current: JsonContainer = record;
  for (const key of path) {
    const value = Array.isArray(current) ? current[Number(key)] : current[key];
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Expected object at ${key}`);
    }
    current = value as JsonContainer;
  }
  return current;
}

function setAt(record: JsonRecord, path: string[], value: unknown) {
  const key = path.pop();
  if (!key) throw new Error('Cannot set the root value.');
  const parent = containerAt(record, path);
  if (Array.isArray(parent)) parent[Number(key)] = value;
  else parent[key] = value;
}

function deleteAt(record: JsonRecord, path: string[]) {
  const key = path.pop();
  if (!key) throw new Error('Cannot delete the root value.');
  const parent = containerAt(record, path);
  if (Array.isArray(parent)) delete parent[Number(key)];
  else delete parent[key];
}

const invalidCases: readonly InvalidCase[] = [
  {
    name: 'invalid sector code',
    path: 'researchMeta.sector',
    mutate: (record) => setAt(record, ['researchMeta', 'sector'], 'BS-16'),
  },
  {
    name: 'invalid research timestamp',
    path: 'researchMeta.researchedAt',
    mutate: (record) => setAt(record, ['researchMeta', 'researchedAt'], 'yesterday'),
  },
  {
    name: 'missing candidate id',
    path: 'identity.candidateId',
    mutate: (record) => deleteAt(record, ['identity', 'candidateId']),
  },
  {
    name: 'invalid candidate id',
    path: 'identity.candidateId',
    mutate: (record) => setAt(record, ['identity', 'candidateId'], 'candidate-1'),
  },
  {
    name: 'found value without evidence',
    path: 'identity.nameDe.evidence',
    mutate: (record) => setAt(record, ['identity', 'nameDe', 'evidence'], []),
  },
  {
    name: 'invalid evidence URL',
    path: 'identity.nameDe.evidence.0.sourceUrl',
    mutate: (record) =>
      setAt(record, ['identity', 'nameDe', 'evidence', '0', 'sourceUrl'], 'not-a-url'),
  },
  {
    name: 'conflicting value without note',
    path: 'identity.nameDe.conflictNote',
    mutate: (record) => {
      setAt(record, ['identity', 'nameDe', 'status'], 'conflicting');
      deleteAt(record, ['identity', 'nameDe', 'conflictNote']);
    },
  },
  {
    name: 'invalid latitude',
    path: 'geo.coordinates.value.lat',
    mutate: (record) => setAt(record, ['geo', 'coordinates', 'value', 'lat'], 91),
  },
  {
    name: 'scope exception without justification',
    path: 'geo.scopeCheck.exceptionJustification',
    mutate: (record) => setAt(record, ['geo', 'scopeCheck', 'exceptionProposed'], true),
  },
  {
    name: 'high confidence critical value without official evidence',
    path: 'identity.nameDe.evidence',
    mutate: (record) => setAt(record, ['identity', 'nameDe', 'evidence', '0', 'sourceType'], 'osm'),
  },
  {
    name: 'all year mixed with another season',
    path: 'classification.seasons.value',
    mutate: (record) =>
      setAt(record, ['classification', 'seasons', 'value'], ['ALL_YEAR', 'SUMMER']),
  },
  {
    name: 'invalid opening time',
    path: 'practical.openingHours.value.rules.0.opens',
    mutate: (record) =>
      setAt(record, ['practical', 'openingHours', 'value', 'rules', '0', 'opens'], 'morning'),
  },
  {
    name: 'negative price',
    path: 'practical.prices.value.0.amount',
    mutate: (record) => setAt(record, ['practical', 'prices', 'value', '0', 'amount'], -1),
  },
  {
    name: 'missing German localization',
    path: 'localizations.de',
    mutate: (record) => deleteAt(record, ['localizations', 'de']),
  },
  {
    name: 'English before translation step',
    path: 'researchMeta.pipelineStep',
    mutate: (record) => setAt(record, ['researchMeta', 'pipelineStep'], 'verified'),
  },
  {
    name: 'English without translation metadata',
    path: 'localizations.en.translationMeta',
    mutate: (record) => deleteAt(record, ['localizations', 'en', 'translationMeta']),
  },
  {
    name: 'summary outside word limit',
    path: 'localizations.de.summary',
    mutate: (record) => setAt(record, ['localizations', 'de', 'summary'], 'Too short.'),
  },
];

describe('research output schema', () => {
  it('accepts the valid fixture and exposes the typed parser', () => {
    expect(researchOutputSchema.safeParse(fixture).success).toBe(true);
    expect(parseResearchOutput(fixture).schemaVersion).toBe('1.0.0');
  });

  it.each(invalidCases)('rejects $name with a precise path', ({ mutate, path }) => {
    const record = cloneFixture();
    mutate(record);
    const result = researchOutputSchema.safeParse(record);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === path)).toBe(true);
    }
  });

  it('accepts same-major versions and rejects newer majors with a versioned error', () => {
    const compatible = cloneFixture();
    compatible.schemaVersion = '1.2.0';
    expect(parseResearchOutput(compatible).schemaVersion).toBe('1.2.0');

    const unsupported = cloneFixture();
    unsupported.schemaVersion = '2.0.0';
    expect(() => parseResearchOutput(unsupported)).toThrow(UnsupportedResearchSchemaVersionError);
    try {
      parseResearchOutput(unsupported);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'UNSUPPORTED_RESEARCH_SCHEMA_VERSION',
        receivedVersion: '2.0.0',
      });
    }
  });

  it('keeps the committed JSON Schema artifact in sync', () => {
    const artifact = JSON.parse(
      readFileSync(new URL('../schemas/research-output.schema.json', import.meta.url), 'utf8'),
    );
    expect(artifact).toEqual(researchOutputJsonSchema);
  });
});
