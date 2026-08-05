import type { ResearchOutput } from './schema.js';

export const copiedProseThreshold = 0.7;

export type CopiedProseField =
  | 'localizations.de.summary'
  | 'localizations.de.description'
  | 'localizations.de.practicalNotes'
  | 'localizations.en.summary'
  | 'localizations.en.description'
  | 'localizations.en.practicalNotes';

export type CopiedProseMatch = Readonly<{
  field: CopiedProseField;
  matchedQuote: string;
  similarity: number;
  reason: 'trigram_similarity' | 'sentence_containment';
}>;

export type CopiedProseGuardOptions = Readonly<{
  threshold?: number;
  minimumSentenceWords?: number;
}>;

type TextCandidate = Readonly<{ field: CopiedProseField; text: string }>;

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/gu, 'ss')
    .toLocaleLowerCase('de-DE')
    .replace(/\s+/gu, ' ')
    .trim();
}

function trigrams(value: string) {
  const padded = `  ${normalizeText(value)} `;
  const result = new Set<string>();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    result.add(padded.slice(index, index + 3));
  }
  return result;
}

export function copiedProseTrigramSimilarity(left: string, right: string) {
  const leftTrigrams = trigrams(left);
  const rightTrigrams = trigrams(right);
  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) return 0;
  let intersection = 0;
  for (const trigram of leftTrigrams) {
    if (rightTrigrams.has(trigram)) intersection += 1;
  }
  return intersection / Math.max(leftTrigrams.size, rightTrigrams.size);
}

function sentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/u)
    .map(normalizeText)
    .filter(Boolean);
}

function hasSentenceContainment(text: string, quote: string, minimumSentenceWords: number) {
  const normalizedText = normalizeText(text);
  const normalizedQuote = normalizeText(quote);
  const candidateSentenceContained = sentences(text).some((sentence) => {
    return sentence.split(' ').length >= minimumSentenceWords && normalizedQuote.includes(sentence);
  });
  const quoteSentenceContained = sentences(quote).some((sentence) => {
    return sentence.split(' ').length >= minimumSentenceWords && normalizedText.includes(sentence);
  });
  return candidateSentenceContained || quoteSentenceContained;
}

function textCandidates(record: ResearchOutput): readonly TextCandidate[] {
  const candidates: TextCandidate[] = [];
  for (const [locale, localization] of Object.entries(record.localizations)) {
    if (!localization) continue;
    for (const field of ['summary', 'description', 'practicalNotes'] as const) {
      const text = localization[field];
      if (text)
        candidates.push({ field: `localizations.${locale}.${field}` as CopiedProseField, text });
    }
  }
  return candidates;
}

function evidenceQuotes(record: ResearchOutput) {
  const envelopes = [
    record.identity.nameDe,
    record.identity.officialWebsite,
    record.geo.coordinates,
    record.geo.municipality,
    ...Object.values(record.classification),
    ...(record.practical ? Object.values(record.practical) : []),
  ];
  return [
    ...new Set(
      envelopes.flatMap((envelope) =>
        envelope.evidence.map(({ quoteOrData }) => quoteOrData.trim()).filter(Boolean),
      ),
    ),
  ];
}

export function findCopiedProse(
  record: ResearchOutput,
  options: CopiedProseGuardOptions = {},
): readonly CopiedProseMatch[] {
  const threshold = options.threshold ?? copiedProseThreshold;
  const minimumSentenceWords = options.minimumSentenceWords ?? 5;
  if (threshold >= 1) return [];
  const matches: CopiedProseMatch[] = [];

  for (const candidate of textCandidates(record)) {
    let bestMatch: CopiedProseMatch | null = null;
    for (const quote of evidenceQuotes(record)) {
      const similarity = copiedProseTrigramSimilarity(candidate.text, quote);
      const sentenceContained = hasSentenceContainment(candidate.text, quote, minimumSentenceWords);
      if (similarity <= threshold && !sentenceContained) continue;
      const match: CopiedProseMatch = {
        field: candidate.field,
        matchedQuote: quote,
        similarity,
        reason: sentenceContained ? 'sentence_containment' : 'trigram_similarity',
      };
      if (!bestMatch || match.similarity > bestMatch.similarity) bestMatch = match;
    }
    if (bestMatch) matches.push(bestMatch);
  }
  return matches;
}
