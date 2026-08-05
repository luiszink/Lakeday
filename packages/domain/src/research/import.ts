import {
  scoreDuplicatePair,
  type DuplicateCandidate,
  type DuplicateScore,
} from '../dedup/index.js';

import type { ResearchOutput } from './schema.js';

export type ResearchImportAction = 'CREATE' | 'UPDATE' | 'HOLD' | 'REJECT';
export type ResearchImportFactKey =
  | 'OPENING_HOURS'
  | 'PRICE'
  | 'CLOSURE'
  | 'WHEELCHAIR_ACCESS'
  | 'FOOD_ON_SITE'
  | 'CAFE_ON_SITE'
  | 'PICNIC_ALLOWED'
  | 'TOILETS'
  | 'DOG_POLICY'
  | 'BOOKING_REQUIREMENT'
  | 'LOCATION'
  | 'CONTACT';
export type ResearchImportConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type ResearchImportCandidate = DuplicateCandidate &
  Readonly<{
    status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
  }>;

export type ResearchImportContext = Readonly<{
  assignedRegionCode: string | null;
  shorelineDistanceM: number;
  inScope: boolean;
  existingCandidates: readonly ResearchImportCandidate[];
}>;

export type ResearchImportProposal = Readonly<{
  factKey: ResearchImportFactKey;
  currentValue: unknown;
  proposedValue: unknown;
  confidence: ResearchImportConfidence;
  reason: string;
}>;

export type ResearchImportPlan = Readonly<{
  action: ResearchImportAction;
  targetAttractionId: string | null;
  candidateId: string;
  regionCode: string | null;
  shorelineDistanceM: number;
  duplicate: Readonly<{ candidateId: string; score: DuplicateScore }> | null;
  reasons: readonly string[];
  proposals: readonly ResearchImportProposal[];
}>;

function foundValue<T>(field: Readonly<{ status: string; value: T | null }>): T | null {
  return field.status === 'found' ? field.value : null;
}

function candidateFromRecord(
  record: ResearchOutput,
  regionCode: string,
): DuplicateCandidate | null {
  const name = foundValue(record.identity.nameDe);
  const coordinates = foundValue(record.geo.coordinates);
  const municipality = foundValue(record.geo.municipality);
  if (!name || !coordinates || !municipality) return null;
  const officialWebsite = foundValue(record.identity.officialWebsite);
  return {
    id: record.identity.candidateId,
    regionCode,
    name,
    officialUrl: officialWebsite,
    coordinates: { latitude: coordinates.lat, longitude: coordinates.lon },
    externalIdentifiers: (record.identity.externalIds ?? []).map(({ system, id }) => ({
      system,
      externalId: String(id),
    })),
  };
}

function duplicateRank(score: DuplicateScore) {
  const classificationRank =
    score.classification === 'DUPLICATE' ? 3 : score.classification === 'REVIEW' ? 2 : 1;
  const strongSignals = score.signals.filter(({ strength }) => strength === 'STRONG').length;
  return [classificationRank, strongSignals, score.nameSimilarity];
}

function bestDuplicate(
  candidate: DuplicateCandidate,
  existingCandidates: readonly ResearchImportCandidate[],
) {
  return (
    existingCandidates
      .map((existing) => ({ candidate: existing, score: scoreDuplicatePair(candidate, existing) }))
      .sort((left, right) => {
        const leftRank = duplicateRank(left.score);
        const rightRank = duplicateRank(right.score);
        for (let index = 0; index < leftRank.length; index += 1) {
          if (leftRank[index] !== rightRank[index]) return rightRank[index]! - leftRank[index]!;
        }
        return left.candidate.id.localeCompare(right.candidate.id);
      })[0] ?? null
  );
}

function confidenceFromEvidence(field: { confidence: 'low' | 'medium' | 'high' }) {
  return field.confidence.toUpperCase() as ResearchImportConfidence;
}

function proposal(
  factKey: ResearchImportFactKey,
  currentValue: unknown,
  proposedValue: unknown,
  confidence: ResearchImportConfidence,
  reason: string,
): ResearchImportProposal {
  return { factKey, currentValue, proposedValue, confidence, reason };
}

export function collectResearchFacts(record: ResearchOutput): readonly ResearchImportProposal[] {
  const facts: ResearchImportProposal[] = [];
  const coordinates = foundValue(record.geo.coordinates);
  if (coordinates) {
    facts.push(
      proposal(
        'LOCATION',
        null,
        { latitude: coordinates.lat, longitude: coordinates.lon },
        confidenceFromEvidence(record.geo.coordinates),
        'Research evidence supplied a location.',
      ),
    );
  }

  const officialWebsite = foundValue(record.identity.officialWebsite);
  if (officialWebsite) {
    facts.push(
      proposal(
        'CONTACT',
        null,
        { field: 'officialWebsite', value: officialWebsite },
        confidenceFromEvidence(record.identity.officialWebsite),
        'Research evidence supplied an official website.',
      ),
    );
  }

  const practical = record.practical;
  if (!practical) return facts;
  const openingHours = foundValue(practical.openingHours);
  if (openingHours) {
    const value =
      'hoursUnknown' in openingHours
        ? openingHours
        : {
            validFrom: openingHours.validFrom,
            validTo: openingHours.validTo,
            hoursUnknown: false,
            rules: openingHours.rules.map((rule) => ({
              daysOfWeek: rule.days,
              opens: rule.opens,
              closes: rule.closes,
              appliesOnPublicHolidays: rule.holidays,
              holidayCalendarCode: null,
            })),
          };
    facts.push(
      proposal(
        'OPENING_HOURS',
        null,
        value,
        confidenceFromEvidence(practical.openingHours),
        'Research evidence supplied opening hours.',
      ),
    );
  }

  const prices = foundValue(practical.prices);
  if (prices?.[0]) {
    facts.push(
      proposal(
        'PRICE',
        null,
        prices[0],
        confidenceFromEvidence(practical.prices),
        'Research evidence supplied a price.',
      ),
    );
  }

  const closures = foundValue(practical.exceptionalClosures);
  if (closures?.[0]) {
    facts.push(
      proposal(
        'CLOSURE',
        null,
        closures[0],
        confidenceFromEvidence(practical.exceptionalClosures),
        'Research evidence supplied an exceptional closure.',
      ),
    );
  }

  const booleanFacts: readonly Readonly<{
    field: keyof typeof practical;
    factKey: ResearchImportFactKey;
  }>[] = [
    { field: 'wheelchairAccess', factKey: 'WHEELCHAIR_ACCESS' },
    { field: 'foodOnSite', factKey: 'FOOD_ON_SITE' },
    { field: 'cafeOnSite', factKey: 'CAFE_ON_SITE' },
    { field: 'picnicAllowed', factKey: 'PICNIC_ALLOWED' },
    { field: 'toilets', factKey: 'TOILETS' },
    { field: 'dogPolicy', factKey: 'DOG_POLICY' },
    { field: 'bookingRequirement', factKey: 'BOOKING_REQUIREMENT' },
  ];
  for (const { field, factKey } of booleanFacts) {
    const value = foundValue(practical[field] as { status: string; value: unknown });
    if (value !== null) {
      facts.push(
        proposal(
          factKey,
          null,
          value,
          confidenceFromEvidence(practical[field]),
          `Research evidence supplied ${field}.`,
        ),
      );
    }
  }
  return facts;
}

function reviewFlagProposals(record: ResearchOutput): readonly ResearchImportProposal[] {
  return (record.reviewFlags ?? []).map((flag) =>
    proposal(
      flag.reason === 'scope_exception' || flag.reason === 'possible_duplicate'
        ? 'LOCATION'
        : flag.reason === 'low_confidence_critical_field'
          ? 'OPENING_HOURS'
          : 'CONTACT',
      null,
      { reason: flag.reason, detail: flag.detail ?? null },
      'LOW',
      flag.detail ?? `Research review flag: ${flag.reason}.`,
    ),
  );
}

export function buildResearchImportPlan(
  record: ResearchOutput,
  context: ResearchImportContext,
): ResearchImportPlan {
  const regionCode = context.assignedRegionCode ?? record.geo.suggestedRegionCode ?? null;
  const candidate = regionCode ? candidateFromRecord(record, regionCode) : null;
  const reasons: string[] = [];
  const proposals = [...collectResearchFacts(record), ...reviewFlagProposals(record)];

  if (!candidate) {
    return {
      action: 'REJECT',
      targetAttractionId: null,
      candidateId: record.identity.candidateId,
      regionCode,
      shorelineDistanceM: context.shorelineDistanceM,
      duplicate: null,
      reasons: ['A found name, coordinates, municipality, and assigned region are required.'],
      proposals,
    };
  }
  if (!context.inScope && record.geo.scopeCheck.exceptionProposed !== true) {
    return {
      action: 'REJECT',
      targetAttractionId: null,
      candidateId: record.identity.candidateId,
      regionCode,
      shorelineDistanceM: context.shorelineDistanceM,
      duplicate: null,
      reasons: ['Coordinates are outside the product scope and no exception was proposed.'],
      proposals,
    };
  }

  const duplicate = bestDuplicate(candidate, context.existingCandidates);
  if (!duplicate || duplicate.score.classification === 'DISTINCT') {
    if (record.reviewFlags?.length) reasons.push('Review flags require human review.');
    return {
      action: 'CREATE',
      targetAttractionId: null,
      candidateId: record.identity.candidateId,
      regionCode,
      shorelineDistanceM: context.shorelineDistanceM,
      duplicate: null,
      reasons,
      proposals,
    };
  }

  reasons.push(
    duplicate.score.classification === 'DUPLICATE'
      ? 'A duplicate candidate was found.'
      : 'A possible duplicate requires reviewer confirmation.',
  );
  const targetAttractionId = duplicate.candidate.id;
  const action =
    duplicate.score.classification === 'REVIEW' || duplicate.candidate.status === 'PUBLISHED'
      ? 'HOLD'
      : 'UPDATE';
  return {
    action,
    targetAttractionId,
    candidateId: record.identity.candidateId,
    regionCode,
    shorelineDistanceM: context.shorelineDistanceM,
    duplicate: { candidateId: duplicate.candidate.id, score: duplicate.score },
    reasons,
    proposals,
  };
}
