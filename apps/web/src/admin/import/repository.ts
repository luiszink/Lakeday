import { createHash, randomUUID } from 'node:crypto';

import {
  AttractionStatus,
  Confidence,
  FactKey,
  Prisma,
  SourceType,
  UpdateStatus,
  assignRegion,
  computeShorelineDistanceM,
  createAttractionShell,
  readShorelineBandKm,
  readWgs84Point,
  updateAttractionPoint,
} from '@lake/db';
import {
  buildResearchImportPlan,
  validateResearchRecord,
  type ResearchEvidence,
  type ResearchImportCandidate,
  type ResearchImportPlan,
  type ResearchImportProposal,
  type ResearchOutput,
} from '@lake/domain';

import { database } from '../../auth/database';

type EvidenceEnvelope = Readonly<{
  status: 'found' | 'not_found' | 'conflicting';
  confidence: 'low' | 'medium' | 'high';
  evidence: readonly ResearchEvidence[];
}>;

type ApprovedOrigin = Readonly<{
  id: string;
  originUrl: string;
  sourceType: SourceType;
  refreshCadenceHours: number | null;
}>;

type EvidenceFact = Readonly<{
  path: string;
  factKey: FactKey | null;
  envelope: EvidenceEnvelope;
}>;

type ResolvedEvidence = Readonly<{
  fact: EvidenceFact;
  evidence: ResearchEvidence;
  origin: ApprovedOrigin;
}>;

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

export class SourceOriginNotApprovedError extends Error {
  readonly path: string;

  constructor(path: string, sourceUrl: string) {
    super(`No approved source origin matches ${sourceUrl}.`);
    this.name = 'SourceOriginNotApprovedError';
    this.path = path;
  }
}

const sourceTypeMap: Record<ResearchEvidence['sourceType'], SourceType> = {
  official_website: SourceType.OFFICIAL_WEBSITE,
  tourism_org: SourceType.TOURISM_ORG,
  public_feed: SourceType.PUBLIC_FEED,
  osm: SourceType.OSM,
  wikidata: SourceType.WIKIDATA,
  wikipedia: SourceType.WIKIPEDIA,
  other: SourceType.OTHER,
};

const childAgeBandMap = {
  '0-2': 'AGE_0_2',
  '3-5': 'AGE_3_5',
  '6-9': 'AGE_6_9',
  '10-13': 'AGE_10_13',
  '14+': 'AGE_14_PLUS',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function foundValue<T>(field: Readonly<{ status: string; value: T | null }> | undefined): T | null {
  return field?.status === 'found' ? field.value : null;
}

function confidenceValue(value: 'low' | 'medium' | 'high'): Confidence {
  return value.toUpperCase() as Confidence;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null) return {};
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function sourceOriginMatches(origin: ApprovedOrigin, evidence: ResearchEvidence) {
  if (origin.sourceType !== sourceTypeMap[evidence.sourceType]) return false;
  try {
    return new URL(origin.originUrl).origin === new URL(evidence.sourceUrl).origin;
  } catch {
    return false;
  }
}

function evidenceFacts(record: ResearchOutput): readonly EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const add = (path: string, factKey: FactKey | null, envelope: unknown) => {
    if (isRecord(envelope) && Array.isArray(envelope.evidence)) {
      facts.push({ path, factKey, envelope: envelope as EvidenceEnvelope });
    }
  };

  add('identity.nameDe', null, record.identity.nameDe);
  add('identity.officialWebsite', FactKey.CONTACT, record.identity.officialWebsite);
  add('geo.coordinates', FactKey.LOCATION, record.geo.coordinates);
  add('geo.municipality', null, record.geo.municipality);
  for (const [field, value] of Object.entries(record.classification)) {
    add(`classification.${field}`, null, value);
  }
  if (record.practical) {
    add('practical.openingHours', FactKey.OPENING_HOURS, record.practical.openingHours);
    add('practical.exceptionalClosures', FactKey.CLOSURE, record.practical.exceptionalClosures);
    add('practical.prices', FactKey.PRICE, record.practical.prices);
    add(
      'practical.bookingRequirement',
      FactKey.BOOKING_REQUIREMENT,
      record.practical.bookingRequirement,
    );
    add('practical.bookingUrl', FactKey.CONTACT, record.practical.bookingUrl);
    add('practical.foodOnSite', FactKey.FOOD_ON_SITE, record.practical.foodOnSite);
    add('practical.cafeOnSite', FactKey.CAFE_ON_SITE, record.practical.cafeOnSite);
    add('practical.picnicAllowed', FactKey.PICNIC_ALLOWED, record.practical.picnicAllowed);
    add('practical.toilets', FactKey.TOILETS, record.practical.toilets);
    add('practical.wheelchairAccess', FactKey.WHEELCHAIR_ACCESS, record.practical.wheelchairAccess);
    add('practical.dogPolicy', FactKey.DOG_POLICY, record.practical.dogPolicy);
  }
  return facts;
}

async function approvedOrigins(): Promise<readonly ApprovedOrigin[]> {
  return database.sourceOrigin.findMany({
    where: { approvalState: 'APPROVED' },
    select: { id: true, originUrl: true, sourceType: true, refreshCadenceHours: true },
  });
}

async function resolveEvidence(
  record: ResearchOutput,
  origins: readonly ApprovedOrigin[],
): Promise<readonly ResolvedEvidence[]> {
  const resolved: ResolvedEvidence[] = [];
  for (const fact of evidenceFacts(record)) {
    for (const [index, evidence] of fact.envelope.evidence.entries()) {
      const origin = origins.find((candidate) => sourceOriginMatches(candidate, evidence));
      if (!origin)
        throw new SourceOriginNotApprovedError(
          `${fact.path}.evidence.${index}`,
          evidence.sourceUrl,
        );
      resolved.push({ fact, evidence, origin });
    }
  }
  return resolved;
}

async function listExistingCandidates(): Promise<readonly ResearchImportCandidate[]> {
  const attractions = await database.attraction.findMany({
    where: { status: { not: AttractionStatus.ARCHIVED } },
    select: {
      id: true,
      status: true,
      regionCode: true,
      officialWebsite: true,
      localizations: { where: { locale: 'de' }, select: { name: true }, take: 1 },
      externalIdentifiers: { select: { system: true, externalId: true } },
    },
  });
  const points = await Promise.all(
    attractions.map(async (attraction) => ({
      id: attraction.id,
      point: await readWgs84Point(database, attraction.id),
    })),
  );
  const pointById = new Map(points.map(({ id, point }) => [id, point]));
  return attractions.map((attraction) => ({
    id: attraction.id,
    status: attraction.status,
    regionCode: attraction.regionCode,
    name: attraction.localizations[0]?.name ?? attraction.id,
    officialUrl: attraction.officialWebsite,
    coordinates: pointById.get(attraction.id) ?? null,
    externalIdentifiers: attraction.externalIdentifiers.map(({ system, externalId }) => ({
      system,
      externalId,
    })),
  }));
}

function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ß/gu, 'ss')
      .toLocaleLowerCase('de-DE')
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '') || 'attraction'
  );
}

async function uniqueSlug(
  transaction: Prisma.TransactionClient,
  locale: 'de' | 'en',
  name: string,
  attractionId: string,
  candidateId: string,
) {
  const base = slugify(name);
  const existing = await transaction.attractionLocalization.findFirst({
    where: { locale, slug: base, attractionId: { not: attractionId } },
    select: { id: true },
  });
  return existing ? `${base}-${candidateId.slice(-6).toLowerCase()}` : base;
}

function latestEvidenceDate(evidence: readonly ResolvedEvidence[]) {
  const timestamps = evidence.map(({ evidence: item }) => Date.parse(item.retrievedAt));
  const latest = Math.max(...timestamps);
  return Number.isFinite(latest) ? new Date(latest) : null;
}

function overallConfidence(record: ResearchOutput): Confidence {
  const fields: Array<{ confidence: 'low' | 'medium' | 'high' }> = [
    record.identity.nameDe,
    record.geo.coordinates,
  ];
  if (record.practical) {
    fields.push(record.practical.openingHours, record.practical.wheelchairAccess);
  }
  if (fields.some(({ confidence }) => confidence === 'low')) return Confidence.LOW;
  if (fields.every(({ confidence }) => confidence === 'high')) return Confidence.HIGH;
  return Confidence.MEDIUM;
}

function scalarData(
  record: ResearchOutput,
  plan: ResearchImportPlan,
  shorelineDistanceM: number,
  verifiedAt: Date | null,
): Prisma.AttractionUncheckedUpdateInput {
  const classification = record.classification;
  const practical = record.practical;
  const countryCode = record.geo.countryCode;
  const municipality = foundValue(record.geo.municipality);
  const indoorOutdoor = foundValue(classification.indoorOutdoor) ?? 'MIXED';
  const data: Prisma.AttractionUncheckedUpdateInput = {
    status: AttractionStatus.DRAFT,
    countryCode,
    municipality: municipality ?? '',
    regionCode: plan.regionCode!,
    shorelineDistanceM: Math.round(shorelineDistanceM),
    scopeException: record.geo.scopeCheck.exceptionProposed === true,
    scopeExceptionReason: record.geo.scopeCheck.exceptionJustification ?? null,
    indoorOutdoor,
    seasons: foundValue(classification.seasons) ?? [],
    childAgeBands: (foundValue(classification.childAgeBands) ?? []).map(
      (ageBand) => childAgeBandMap[ageBand],
    ),
    visitorLanguages: (foundValue(practical?.visitorLanguages) ?? []).map((language) =>
      language.toUpperCase(),
    ) as never,
    transportModes: foundValue(practical?.transportModes) ?? [],
    bookingRequirement: foundValue(practical?.bookingRequirement) ?? 'NONE',
    editorialImportance: 0.5,
    verificationState:
      record.identity.nameDe.confidence === 'high' && record.geo.coordinates.confidence === 'high'
        ? 'PARTIALLY_VERIFIED'
        : 'UNVERIFIED',
    confidence: overallConfidence(record),
    lastVerifiedAt: verifiedAt,
  };

  const nullableFields = [
    ['rainSuitability', foundValue(classification.rainSuitability)],
    ['heatSuitability', foundValue(classification.heatSuitability)],
    ['typicalDurationMin', foundValue(classification.typicalDurationMin)],
    ['typicalDurationMax', foundValue(classification.typicalDurationMax)],
    ['priceLevel', foundValue(practical?.priceLevel)],
    ['bookingUrl', foundValue(practical?.bookingUrl)],
    ['officialWebsite', foundValue(record.identity.officialWebsite)],
    ['foodOnSite', foundValue(practical?.foodOnSite)],
    ['cafeOnSite', foundValue(practical?.cafeOnSite)],
    ['picnicAllowed', foundValue(practical?.picnicAllowed)],
    ['toilets', foundValue(practical?.toilets)],
    ['strollerSuitable', foundValue(practical?.strollerSuitable)],
    ['wheelchairAccess', foundValue(practical?.wheelchairAccess)],
    ['wheelchairToilet', foundValue(practical?.wheelchairToilet)],
    ['dogPolicy', foundValue(practical?.dogPolicy)],
    ['nearestStopName', foundValue(practical?.nearestStop)?.name],
    ['nearestStopDistanceM', foundValue(practical?.nearestStop)?.distanceM],
    ['parkingAvailability', foundValue(practical?.parking)],
    ['bicycleAccess', foundValue(practical?.bicycleAccess)],
  ] as const;
  for (const [key, value] of nullableFields) {
    if (value !== null && value !== undefined) data[key] = value as never;
  }
  return data;
}

async function replaceLocalizations(
  transaction: Prisma.TransactionClient,
  record: ResearchOutput,
  attractionId: string,
) {
  const germanSlug = await uniqueSlug(
    transaction,
    'de',
    record.localizations.de.name,
    attractionId,
    record.identity.candidateId,
  );
  await transaction.attractionLocalization.upsert({
    where: { attractionId_locale: { attractionId, locale: 'de' } },
    create: {
      attractionId,
      locale: 'de',
      name: record.localizations.de.name,
      slug: germanSlug,
      summary: record.localizations.de.summary,
      description: record.localizations.de.description ?? null,
      practicalNotes: record.localizations.de.practicalNotes ?? null,
      translationState: 'SOURCE',
    },
    update: {
      name: record.localizations.de.name,
      slug: germanSlug,
      summary: record.localizations.de.summary,
      description: record.localizations.de.description ?? null,
      practicalNotes: record.localizations.de.practicalNotes ?? null,
      translationState: 'SOURCE',
    },
  });
  if (record.localizations.en) {
    const englishSlug = await uniqueSlug(
      transaction,
      'en',
      record.localizations.en.name,
      attractionId,
      record.identity.candidateId,
    );
    await transaction.attractionLocalization.upsert({
      where: { attractionId_locale: { attractionId, locale: 'en' } },
      create: {
        attractionId,
        locale: 'en',
        name: record.localizations.en.name,
        slug: englishSlug,
        summary: record.localizations.en.summary,
        description: record.localizations.en.description ?? null,
        practicalNotes: record.localizations.en.practicalNotes ?? null,
        translationState: 'TRANSLATED',
      },
      update: {
        name: record.localizations.en.name,
        slug: englishSlug,
        summary: record.localizations.en.summary,
        description: record.localizations.en.description ?? null,
        practicalNotes: record.localizations.en.practicalNotes ?? null,
        translationState: 'TRANSLATED',
      },
    });
  }
}

async function replaceTaxonomyRelations(
  transaction: Prisma.TransactionClient,
  record: ResearchOutput,
  attractionId: string,
) {
  const categoryCodes = [
    foundValue(record.classification.primaryCategory),
    ...(foundValue(record.classification.subcategories) ?? []),
  ].filter((code): code is string => Boolean(code));
  const categories = await transaction.category.findMany({
    where: { code: { in: [...new Set(categoryCodes)] } },
    select: { id: true, code: true },
  });
  if (categories.length !== new Set(categoryCodes).size) {
    throw new ImportValidationError('One or more category codes are not seeded.');
  }
  await transaction.attractionCategory.deleteMany({ where: { attractionId } });
  await transaction.attractionCategory.createMany({
    data: categories.map((category) => ({
      attractionId,
      categoryId: category.id,
      isPrimary: category.code === categoryCodes[0],
    })),
  });

  const interestCodes = foundValue(record.classification.interests) ?? [];
  const interests = await transaction.interest.findMany({
    where: { code: { in: interestCodes } },
    select: { id: true },
  });
  if (interests.length !== new Set(interestCodes).size)
    throw new ImportValidationError('One or more interest codes are not seeded.');
  await transaction.attractionInterest.deleteMany({ where: { attractionId } });
  await transaction.attractionInterest.createMany({
    data: interests.map(({ id }) => ({ attractionId, interestId: id })),
  });

  const audienceCodes = foundValue(record.classification.audiences) ?? [];
  const audiences = await transaction.audience.findMany({
    where: { code: { in: audienceCodes } },
    select: { id: true },
  });
  if (audiences.length !== new Set(audienceCodes).size)
    throw new ImportValidationError('One or more audience codes are not seeded.');
  await transaction.attractionAudience.deleteMany({ where: { attractionId } });
  await transaction.attractionAudience.createMany({
    data: audiences.map(({ id }) => ({ attractionId, audienceId: id })),
  });
}

function recordIdForFact(
  records: readonly Readonly<{ factKey: FactKey | null; id: string }>[],
  factKey: FactKey,
) {
  return records.find((record) => record.factKey === factKey)?.id ?? records[0]?.id ?? null;
}

async function replacePracticalRelations(
  transaction: Prisma.TransactionClient,
  record: ResearchOutput,
  attractionId: string,
  sourceRecords: readonly Readonly<{ factKey: FactKey | null; id: string }>[],
) {
  const practical = record.practical;
  if (!practical) return;
  const openingHours = foundValue(practical.openingHours);
  if (openingHours) {
    await transaction.openingSchedule.deleteMany({ where: { attractionId } });
    if ('hoursUnknown' in openingHours) {
      await transaction.openingSchedule.create({
        data: {
          attractionId,
          validFrom: new Date('1970-01-01T00:00:00.000Z'),
          validTo: new Date('2999-12-31T00:00:00.000Z'),
          hoursUnknown: true,
        },
      });
    } else {
      await transaction.openingSchedule.create({
        data: {
          attractionId,
          validFrom: new Date(`${openingHours.validFrom}T00:00:00.000Z`),
          validTo: new Date(`${openingHours.validTo}T00:00:00.000Z`),
          hoursUnknown: false,
          rules: {
            create: openingHours.rules.map((rule) => ({
              daysOfWeek: rule.days,
              opens: rule.opens ? new Date(`1970-01-01T${rule.opens}:00.000Z`) : null,
              closes: rule.closes ? new Date(`1970-01-01T${rule.closes}:00.000Z`) : null,
              appliesOnPublicHolidays: rule.holidays,
              holidayCalendarCode: null,
            })),
          },
        },
      });
    }
  }

  const closures = foundValue(practical.exceptionalClosures);
  if (closures) {
    await transaction.exceptionalClosure.deleteMany({ where: { attractionId } });
    const sourceRecordId = recordIdForFact(sourceRecords, FactKey.CLOSURE);
    await transaction.exceptionalClosure.createMany({
      data: closures.map((closure) => ({
        attractionId,
        dateFrom: new Date(`${closure.dateFrom}T00:00:00.000Z`),
        dateTo: new Date(`${closure.dateTo}T00:00:00.000Z`),
        reason: closure.reason ?? null,
        sourceRecordId,
        lastCheckedAt: new Date(),
        confidence: confidenceValue(practical.exceptionalClosures.confidence),
      })),
    });
  }

  const prices = foundValue(practical.prices);
  if (prices) {
    await transaction.priceInfo.deleteMany({ where: { attractionId } });
    const sourceRecordId = recordIdForFact(sourceRecords, FactKey.PRICE);
    await transaction.priceInfo.createMany({
      data: prices.map((price) => ({
        attractionId,
        audience: price.audience,
        amount: price.amount,
        currency: price.currency,
        sourceRecordId,
        lastCheckedAt: new Date(),
        confidence: confidenceValue(practical.prices.confidence),
      })),
    });
  }
}

async function persistEvidence(
  transaction: Prisma.TransactionClient,
  resolvedEvidence: readonly ResolvedEvidence[],
  attractionId: string,
) {
  const records: Array<{ factKey: FactKey | null; id: string }> = [];
  for (const item of resolvedEvidence) {
    const id = randomUUID();
    await transaction.sourceRecord.create({
      data: {
        id,
        attractionId,
        sourceOriginId: item.origin.id,
        sourceUrl: item.evidence.sourceUrl,
        sourceType: item.origin.sourceType,
        retrievedAt: new Date(item.evidence.retrievedAt),
        contentHash: createHash('sha256')
          .update(
            `${item.evidence.sourceUrl}\n${item.evidence.retrievedAt}\n${item.evidence.quoteOrData}`,
          )
          .digest('hex'),
        rawPayload: jsonValue(item.evidence),
        licenceNote: null,
      },
    });
    records.push({ factKey: item.fact.factKey, id });
    if (item.fact.factKey) {
      const nextRefreshAt = new Date(
        Date.parse(item.evidence.retrievedAt) +
          (item.origin.refreshCadenceHours ?? 24 * 30) * 60 * 60 * 1_000,
      );
      await transaction.factProvenance.create({
        data: {
          attractionId,
          factKey: item.fact.factKey,
          sourceRecordId: id,
          sourceType: item.origin.sourceType,
          lastCheckedAt: new Date(item.evidence.retrievedAt),
          nextRefreshAt,
          confidence: confidenceValue(item.fact.envelope.confidence),
          updateStatus:
            item.fact.envelope.status === 'conflicting'
              ? UpdateStatus.IN_REVIEW
              : UpdateStatus.FRESH,
          detectedChange: Prisma.JsonNull,
        },
      });
    }
  }
  return records;
}

async function persistProposals(
  transaction: Prisma.TransactionClient,
  proposals: readonly ResearchImportProposal[],
  sourceRecords: readonly Readonly<{ factKey: FactKey | null; id: string }>[],
  attractionId: string,
) {
  const proposalIds: string[] = [];
  for (const proposal of proposals) {
    const sourceRecordId = recordIdForFact(sourceRecords, proposal.factKey as FactKey);
    const created = await transaction.changeProposal.create({
      data: {
        attractionId,
        factKey: proposal.factKey as FactKey,
        currentValue:
          proposal.currentValue === null ? Prisma.JsonNull : jsonValue(proposal.currentValue),
        proposedValue: jsonValue(proposal.proposedValue),
        sourceRecordId,
        confidence: proposal.confidence as Confidence,
        origin: 'RESEARCH_IMPORT',
        status: 'PENDING',
        reviewNote: proposal.reason,
      },
    });
    proposalIds.push(created.id);
  }
  return proposalIds;
}

export type PersistedImportResult = Readonly<{
  action: ResearchImportPlan['action'];
  attractionId: string | null;
  candidateId: string;
  reasons: readonly string[];
  duplicate: ResearchImportPlan['duplicate'];
  proseMatches: ResearchImportPlan['proseMatches'];
  proposalIds: readonly string[];
}>;

export type ResearchImportBatchSummary = Readonly<{
  total: number;
  created: number;
  updated: number;
  held: number;
  rejected: number;
}>;

export async function recordResearchImportBatch(
  adminUserId: string,
  dryRun: boolean,
  summary: ResearchImportBatchSummary,
) {
  return database.researchImportBatch.create({
    data: { adminUserId, dryRun, ...summary },
    select: { id: true, createdAt: true },
  });
}

export async function listResearchImportBatches() {
  return database.researchImportBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      dryRun: true,
      total: true,
      created: true,
      updated: true,
      held: true,
      rejected: true,
      createdAt: true,
      adminUser: { select: { email: true } },
    },
  });
}

export async function persistResearchImport(
  record: ResearchOutput,
  plan: ResearchImportPlan,
  resolvedEvidence: readonly ResolvedEvidence[],
): Promise<PersistedImportResult> {
  if (plan.action === 'REJECT') {
    return {
      action: plan.action,
      attractionId: null,
      candidateId: plan.candidateId,
      reasons: plan.reasons,
      duplicate: plan.duplicate,
      proseMatches: plan.proseMatches,
      proposalIds: [],
    };
  }

  const attractionId = plan.targetAttractionId ?? randomUUID();
  let proposalIds: readonly string[] = [];
  await database.$transaction(async (transaction) => {
    if (plan.action === 'CREATE') {
      const point = foundValue(record.geo.coordinates);
      if (!point) throw new ImportValidationError('Coordinates are required to create a draft.');
      await createAttractionShell(transaction, {
        id: attractionId,
        point: { latitude: point.lat, longitude: point.lon },
        countryCode: record.geo.countryCode,
        municipality: foundValue(record.geo.municipality) ?? '',
        regionCode: plan.regionCode!,
        indoorOutdoor: foundValue(record.classification.indoorOutdoor) ?? 'MIXED',
      });
    }

    const sourceRecords = await persistEvidence(transaction, resolvedEvidence, attractionId);
    if (plan.action === 'CREATE' || plan.action === 'UPDATE') {
      const verifiedAt = latestEvidenceDate(resolvedEvidence);
      await transaction.attraction.update({
        where: { id: attractionId },
        data: scalarData(record, plan, plan.shorelineDistanceM, verifiedAt),
      });
      const point = foundValue(record.geo.coordinates);
      if (point)
        await updateAttractionPoint(transaction, attractionId, {
          latitude: point.lat,
          longitude: point.lon,
        });
      await replaceLocalizations(transaction, record, attractionId);
      await replaceTaxonomyRelations(transaction, record, attractionId);
      await replacePracticalRelations(transaction, record, attractionId, sourceRecords);
    }

    const proposals =
      plan.action === 'HOLD'
        ? plan.proposals
        : plan.proposals.filter((item) => item.confidence === 'LOW');
    if (proposals.length > 0) {
      proposalIds = await persistProposals(transaction, proposals, sourceRecords, attractionId);
    }
  });

  return {
    action: plan.action,
    attractionId,
    candidateId: plan.candidateId,
    reasons: plan.reasons,
    duplicate: plan.duplicate,
    proseMatches: plan.proseMatches,
    proposalIds,
  };
}

export async function prepareResearchImport(record: ResearchOutput) {
  const validation = validateResearchRecord(record);
  if (!validation.valid || !validation.record) {
    throw new ImportValidationError(
      validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '),
    );
  }
  const coordinates = foundValue(record.geo.coordinates);
  if (!coordinates) throw new ImportValidationError('Coordinates must be found before import.');
  const [shorelineDistanceM, assignedRegionCode, existingCandidates, origins] = await Promise.all([
    computeShorelineDistanceM(database, { latitude: coordinates.lat, longitude: coordinates.lon }),
    assignRegion(database, { latitude: coordinates.lat, longitude: coordinates.lon }),
    listExistingCandidates(),
    approvedOrigins(),
  ]);
  const resolvedEvidence = await resolveEvidence(record, origins);
  const plan = buildResearchImportPlan(record, {
    assignedRegionCode,
    shorelineDistanceM,
    inScope: shorelineDistanceM <= readShorelineBandKm() * 1_000,
    existingCandidates,
  });
  return { plan, resolvedEvidence };
}
