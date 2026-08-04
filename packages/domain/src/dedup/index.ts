export type DuplicateCandidate = Readonly<{
  id: string;
  regionCode: string;
  name: string;
  officialUrl?: string | null;
  coordinates?: Readonly<{ latitude: number; longitude: number }> | null;
  externalIdentifiers?: readonly Readonly<{ system: string; externalId: string }>[];
}>;

export type DuplicateSignalStrength = 'CERTAIN' | 'STRONG' | 'WEAK';
export type DuplicateClassification = 'DUPLICATE' | 'REVIEW' | 'DISTINCT';

export type DuplicateScore = Readonly<{
  classification: DuplicateClassification;
  signals: readonly Readonly<{
    source: 'EXTERNAL_IDENTIFIER' | 'OFFICIAL_URL' | 'COORDINATES' | 'NAME';
    strength: DuplicateSignalStrength;
  }>[];
  nameSimilarity: number;
  distanceM: number | null;
}>;

export type DuplicateThresholds = Readonly<{
  coordinateStrongDistanceM: number;
  coordinateWeakDistanceM: number;
  nameStrongSimilarity: number;
  nameWeakSimilarity: number;
}>;

// These product-approved thresholds match the domain-model decision and are explicit so pilot data can tune them later.
export const defaultDuplicateThresholds: DuplicateThresholds = {
  coordinateStrongDistanceM: 100,
  coordinateWeakDistanceM: 300,
  nameStrongSimilarity: 0.85,
  nameWeakSimilarity: 0.7,
};

const legalSuffixPattern = /\b(gmbh|gmbh\s*&\s*co\.?\s*kg|ag|kg|ug|e\.?\s*v\.?)$/u;

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/gu, 'ss')
    .toLocaleLowerCase('de-DE')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(legalSuffixPattern, '')
    .trim();
}

export function normalizeOfficialUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./u, '');
    const path = url.pathname.replace(/\/+$/u, '') || '/';
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value}  `;
  return new Set(
    Array.from({ length: Math.max(padded.length - 2, 0) }, (_, index) =>
      padded.slice(index, index + 3),
    ),
  );
}

export function trigramSimilarity(left: string, right: string): number {
  const leftTrigrams = trigrams(normalizeName(left));
  const rightTrigrams = trigrams(normalizeName(right));
  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) return 0;
  const shared = [...leftTrigrams].filter((trigram) => rightTrigrams.has(trigram)).length;
  return (2 * shared) / (leftTrigrams.size + rightTrigrams.size);
}

export function distanceMeters(
  left: Readonly<{ latitude: number; longitude: number }>,
  right: Readonly<{ latitude: number; longitude: number }>,
): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left.latitude)) *
      Math.cos(radians(right.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function sharesExternalIdentifier(left: DuplicateCandidate, right: DuplicateCandidate): boolean {
  const leftIdentifiers = new Set(
    (left.externalIdentifiers ?? []).map(({ system, externalId }) => `${system}:${externalId}`),
  );
  return (right.externalIdentifiers ?? []).some(({ system, externalId }) =>
    leftIdentifiers.has(`${system}:${externalId}`),
  );
}

function classify(signals: DuplicateScore['signals']): DuplicateClassification {
  const certain = signals.some(({ strength }) => strength === 'CERTAIN');
  const strong = signals.filter(({ strength }) => strength === 'STRONG').length;
  return certain || strong >= 2 ? 'DUPLICATE' : strong === 1 ? 'REVIEW' : 'DISTINCT';
}

export function scoreDuplicatePair(
  left: DuplicateCandidate,
  right: DuplicateCandidate,
  thresholds: DuplicateThresholds = defaultDuplicateThresholds,
): DuplicateScore {
  const signals: DuplicateScore['signals'][number][] = [];
  if (sharesExternalIdentifier(left, right))
    signals.push({ source: 'EXTERNAL_IDENTIFIER', strength: 'CERTAIN' });

  const leftUrl = left.officialUrl ? normalizeOfficialUrl(left.officialUrl) : null;
  const rightUrl = right.officialUrl ? normalizeOfficialUrl(right.officialUrl) : null;
  if (leftUrl && leftUrl === rightUrl) signals.push({ source: 'OFFICIAL_URL', strength: 'STRONG' });

  const distanceM =
    left.coordinates && right.coordinates
      ? distanceMeters(left.coordinates, right.coordinates)
      : null;
  if (distanceM !== null && distanceM < thresholds.coordinateStrongDistanceM)
    signals.push({ source: 'COORDINATES', strength: 'STRONG' });
  else if (distanceM !== null && distanceM < thresholds.coordinateWeakDistanceM)
    signals.push({ source: 'COORDINATES', strength: 'WEAK' });

  const nameSimilarity = trigramSimilarity(left.name, right.name);
  if (nameSimilarity > thresholds.nameStrongSimilarity)
    signals.push({ source: 'NAME', strength: 'STRONG' });
  else if (nameSimilarity > thresholds.nameWeakSimilarity)
    signals.push({ source: 'NAME', strength: 'WEAK' });

  return { classification: classify(signals), signals, nameSimilarity, distanceM };
}

export function generateRegionCandidatePairs(
  candidates: readonly DuplicateCandidate[],
): readonly Readonly<[DuplicateCandidate, DuplicateCandidate]>[] {
  const buckets = new Map<string, DuplicateCandidate[]>();
  for (const candidate of candidates) {
    const bucket = buckets.get(candidate.regionCode) ?? [];
    bucket.push(candidate);
    buckets.set(candidate.regionCode, bucket);
  }
  return [...buckets.values()].flatMap((bucket) =>
    bucket.flatMap((candidate, index) =>
      bucket.slice(index + 1).map((other) => [candidate, other] as const),
    ),
  );
}
