import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  copiedProseThreshold,
  findCopiedProse,
  type ResearchOutput,
} from '../src/research/index.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/research/valid.json', import.meta.url), 'utf8'),
) as ResearchOutput;

function cloneFixture() {
  return structuredClone(fixture) as ResearchOutput;
}

function setEvidenceQuote(record: ResearchOutput, quote: string) {
  Object.assign(record.identity.nameDe.evidence[0], { quoteOrData: quote });
}

describe('copied prose guard', () => {
  it('rejects a copied sentence and reports its field and matched quote', () => {
    const record = cloneFixture();
    const copiedSentence = record.localizations.de.summary.split('. ')[0]! + '.';
    setEvidenceQuote(record, copiedSentence);

    const matches = findCopiedProse(record);

    expect(matches).toContainEqual(
      expect.objectContaining({
        field: 'localizations.de.summary',
        matchedQuote: copiedSentence,
        reason: 'sentence_containment',
      }),
    );
  });

  it('rejects a near-paraphrase above the calibrated trigram threshold', () => {
    const record = cloneFixture();
    const quote =
      'The museum presents Konstanz history through changing collections, accessible objects, and short interpretation offers.';
    setEvidenceQuote(record, quote);
    record.localizations.de.description =
      'The museum presents Konstanz history through changing collections, accessible objects, and brief interpretation offers.';

    const match = findCopiedProse(record).find(
      ({ field }) => field === 'localizations.de.description',
    );

    expect(match).toEqual(
      expect.objectContaining({
        field: 'localizations.de.description',
        matchedQuote: quote,
        reason: 'trigram_similarity',
      }),
    );
    expect(match?.similarity).toBeGreaterThan(copiedProseThreshold);
  });

  it('passes clearly original localized text', () => {
    expect(findCopiedProse(fixture)).toEqual([]);
  });
});
