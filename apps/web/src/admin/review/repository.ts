import {
  ChangeProposalStatus,
  Confidence,
  FactKey,
  Prisma,
  SourceType,
  UpdateStatus,
  updateAttractionPoint,
} from '@lake/db';
import { applyProposalDecision, openingScheduleSchema, type ReviewDecision } from '@lake/domain';

import { database } from '../../auth/database';

export class ReviewProposalConflictError extends Error {
  constructor() {
    super('This proposal has already been decided.');
  }
}

export class ReviewProposalNotFoundError extends Error {
  constructor() {
    super('Review proposal not found.');
  }
}

export class ReviewProposalValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const safetyFactKeys = new Set<FactKey>([
  FactKey.OPENING_HOURS,
  FactKey.CLOSURE,
  FactKey.WHEELCHAIR_ACCESS,
  FactKey.LOCATION,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTextualProposal(factKey: FactKey, proposedValue: unknown) {
  return factKey === FactKey.CONTACT || (isRecord(proposedValue) && proposedValue.textual === true);
}

function dateAtStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function timeAt(time: string | null) {
  return time ? new Date(`1970-01-01T${time}:00.000Z`) : null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string')
    throw new ReviewProposalValidationError(`${field} must be a string.`);
  return value;
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean')
    throw new ReviewProposalValidationError(`${field} must be a boolean.`);
  return value;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new ReviewProposalValidationError(`${field} must be an object.`);
  return value;
}

function asJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null) {
    throw new ReviewProposalValidationError('The reviewed value cannot be null JSON.');
  }
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    throw new ReviewProposalValidationError('The reviewed value cannot be stored as JSON.');
  }
}

function mergeRequest(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.mergeIntoId !== 'string' ||
    typeof value.mergeFromId !== 'string'
  ) {
    return null;
  }
  return {
    mergeIntoId: value.mergeIntoId,
    mergeFromId: value.mergeFromId,
    reason: typeof value.reason === 'string' ? value.reason : 'Reviewer-approved duplicate merge.',
  };
}

async function applyDuplicateMerge(
  transaction: Prisma.TransactionClient,
  value: unknown,
  reviewerId: string,
  now: Date,
) {
  const request = mergeRequest(value);
  if (!request || request.mergeIntoId === request.mergeFromId) {
    throw new ReviewProposalValidationError('A merge requires two distinct attraction IDs.');
  }
  const attractions = await transaction.attraction.findMany({
    where: { id: { in: [request.mergeIntoId, request.mergeFromId] } },
    select: { id: true, createdAt: true },
  });
  if (attractions.length !== 2) {
    throw new ReviewProposalValidationError('Both attractions must exist before merging.');
  }
  const [first, second] = attractions;
  const keep = first!.createdAt.getTime() <= second!.createdAt.getTime() ? first! : second!;
  const merged = keep.id === first!.id ? second! : first!;

  const mergedExternalIds = await transaction.externalIdentifier.findMany({
    where: { attractionId: merged.id },
    select: { id: true, system: true, externalId: true },
  });
  for (const externalId of mergedExternalIds) {
    const conflict = await transaction.externalIdentifier.findUnique({
      where: {
        system_externalId: { system: externalId.system, externalId: externalId.externalId },
      },
      select: { attractionId: true },
    });
    if (!conflict || conflict.attractionId === merged.id) {
      await transaction.externalIdentifier.update({
        where: { id: externalId.id },
        data: { attractionId: keep.id },
      });
    }
  }

  await transaction.attractionAlias.upsert({
    where: { mergedFromId: merged.id },
    create: {
      mergedIntoId: keep.id,
      mergedFromId: merged.id,
      reason: request.reason,
      mergedAt: now,
      mergedById: reviewerId,
    },
    update: {
      mergedIntoId: keep.id,
      reason: request.reason,
      mergedAt: now,
      mergedById: reviewerId,
    },
  });
  await transaction.attraction.update({ where: { id: merged.id }, data: { status: 'ARCHIVED' } });
  return { mergedIntoId: keep.id, mergedFromId: merged.id };
}

async function applyApprovedFact(
  transaction: Prisma.TransactionClient,
  attractionId: string,
  factKey: FactKey,
  value: unknown,
  sourceRecordId: string,
) {
  switch (factKey) {
    case FactKey.WHEELCHAIR_ACCESS:
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { wheelchairAccess: asString(value, 'wheelchairAccess') as never },
      });
      return;
    case FactKey.DOG_POLICY:
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { dogPolicy: asString(value, 'dogPolicy') as never },
      });
      return;
    case FactKey.FOOD_ON_SITE:
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { foodOnSite: asBoolean(value, 'foodOnSite') },
      });
      return;
    case FactKey.CAFE_ON_SITE:
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { cafeOnSite: asBoolean(value, 'cafeOnSite') },
      });
      return;
    case FactKey.PICNIC_ALLOWED:
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { picnicAllowed: asBoolean(value, 'picnicAllowed') },
      });
      return;
    case FactKey.TOILETS:
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { toilets: asBoolean(value, 'toilets') },
      });
      return;
    case FactKey.BOOKING_REQUIREMENT:
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { bookingRequirement: asString(value, 'bookingRequirement') as never },
      });
      return;
    case FactKey.LOCATION: {
      const location = asObject(value, 'location');
      const latitude = location.latitude;
      const longitude = location.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new ReviewProposalValidationError(
          'location requires numeric latitude and longitude.',
        );
      }
      await updateAttractionPoint(transaction, attractionId, { latitude, longitude });
      return;
    }
    case FactKey.CONTACT: {
      const contact = asObject(value, 'contact');
      const field = asString(contact.field, 'contact.field');
      const contactValue = contact.value === null ? null : asString(contact.value, 'contact.value');
      if (!['officialWebsite', 'bookingUrl', 'nearestStopName'].includes(field)) {
        throw new ReviewProposalValidationError(
          'contact.field is not editable by review decisions.',
        );
      }
      await transaction.attraction.update({
        where: { id: attractionId },
        data: { [field]: contactValue },
      });
      return;
    }
    case FactKey.PRICE: {
      const price = asObject(value, 'price');
      const audience = asString(price.audience, 'price.audience') as never;
      const amount = price.amount;
      if (typeof amount !== 'number' || amount < 0) {
        throw new ReviewProposalValidationError('price.amount must be a non-negative number.');
      }
      const currency = asString(price.currency, 'price.currency') as never;
      await transaction.priceInfo.deleteMany({ where: { attractionId, audience } });
      await transaction.priceInfo.create({
        data: {
          attractionId,
          audience,
          amount,
          currency,
          validFrom: typeof price.validFrom === 'string' ? dateAtStart(price.validFrom) : null,
          validTo: typeof price.validTo === 'string' ? dateAtStart(price.validTo) : null,
          note: price.note === null ? null : typeof price.note === 'string' ? price.note : null,
          sourceRecordId,
          lastCheckedAt: new Date(),
          confidence: (price.confidence ?? Confidence.MEDIUM) as never,
        },
      });
      return;
    }
    case FactKey.CLOSURE: {
      const closure = asObject(value, 'closure');
      const dateFrom = asString(closure.dateFrom, 'closure.dateFrom');
      const dateTo = asString(closure.dateTo, 'closure.dateTo');
      await transaction.exceptionalClosure.create({
        data: {
          attractionId,
          dateFrom: dateAtStart(dateFrom),
          dateTo: dateAtStart(dateTo),
          reason:
            closure.reason === null
              ? null
              : typeof closure.reason === 'string'
                ? closure.reason
                : null,
          sourceRecordId,
          lastCheckedAt: new Date(),
          confidence: (closure.confidence ?? Confidence.MEDIUM) as never,
        },
      });
      return;
    }
    case FactKey.OPENING_HOURS: {
      const schedule = openingScheduleSchema.parse(value);
      await transaction.openingSchedule.deleteMany({ where: { attractionId } });
      await transaction.openingSchedule.create({
        data: {
          attractionId,
          validFrom: dateAtStart(schedule.validFrom),
          validTo: dateAtStart(schedule.validTo),
          hoursUnknown: schedule.hoursUnknown,
          rules: {
            create: schedule.rules.map((rule) => ({
              daysOfWeek: rule.daysOfWeek,
              opens: timeAt(rule.opens),
              closes: timeAt(rule.closes),
              appliesOnPublicHolidays: rule.appliesOnPublicHolidays,
              holidayCalendarCode: rule.holidayCalendarCode,
            })),
          },
        },
      });
      return;
    }
    default:
      throw new ReviewProposalValidationError(`Unsupported fact key: ${factKey}.`);
  }
}

function impactScore(proposal: {
  attraction: { status: string };
  factKey: FactKey;
  confidence: string;
}) {
  return (
    (proposal.attraction.status === 'PUBLISHED' ? 100 : 0) +
    (safetyFactKeys.has(proposal.factKey) ? 50 : 0) +
    (proposal.confidence === 'HIGH' ? 10 : proposal.confidence === 'MEDIUM' ? 5 : 0)
  );
}

export async function listReviewProposals(
  filters: Readonly<{
    origin?: string;
    factKey?: string;
    attractionStatus?: string;
  }>,
) {
  const proposals = await database.changeProposal.findMany({
    where: {
      status: ChangeProposalStatus.PENDING,
      ...(filters.origin ? { origin: filters.origin as never } : {}),
      ...(filters.factKey ? { factKey: filters.factKey as never } : {}),
      ...(filters.attractionStatus
        ? { attraction: { status: filters.attractionStatus as never } }
        : {}),
    },
    include: {
      attraction: {
        select: {
          status: true,
          municipality: true,
          localizations: { select: { locale: true, name: true } },
        },
      },
      sourceRecord: { select: { sourceUrl: true, sourceType: true } },
    },
    take: 200,
  });

  return proposals
    .sort(
      (left, right) =>
        impactScore(right) - impactScore(left) ||
        left.createdAt.getTime() - right.createdAt.getTime(),
    )
    .map((proposal) => ({
      id: proposal.id,
      factKey: proposal.factKey,
      origin: proposal.origin,
      confidence: proposal.confidence,
      status: proposal.status,
      currentValue: proposal.currentValue,
      proposedValue: proposal.proposedValue,
      createdAt: proposal.createdAt,
      attraction: proposal.attraction,
      sourceRecord: proposal.sourceRecord,
    }));
}

export async function getReviewProposal(id: string) {
  const proposal = await database.changeProposal.findUnique({
    where: { id },
    include: {
      attraction: {
        include: {
          localizations: true,
          factProvenances: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      },
      sourceRecord: true,
    },
  });
  if (!proposal) throw new ReviewProposalNotFoundError();
  return proposal;
}

export async function applyReviewDecision(
  id: string,
  reviewerId: string,
  decision: ReviewDecision,
  now = new Date(),
) {
  return database.$transaction(async (transaction) => {
    const proposal = await transaction.changeProposal.findUnique({
      where: { id },
      include: { attraction: { select: { id: true, status: true } }, sourceRecord: true },
    });
    if (!proposal) throw new ReviewProposalNotFoundError();

    const result = applyProposalDecision(
      {
        status: proposal.status,
        currentValue: proposal.currentValue,
        proposedValue: proposal.proposedValue,
        isTextual: isTextualProposal(proposal.factKey, proposal.proposedValue),
      },
      decision,
    );
    if (!result.ok) throw new ReviewProposalConflictError();

    let mergeResult: { mergedIntoId: string; mergedFromId: string } | null = null;
    if (result.value.status === 'APPROVED') {
      if (!proposal.sourceRecordId) {
        throw new ReviewProposalValidationError('Approved proposals require a source record.');
      }
      if (proposal.factKey === FactKey.LOCATION && mergeRequest(result.value.finalValue)) {
        mergeResult = await applyDuplicateMerge(
          transaction,
          result.value.finalValue,
          reviewerId,
          now,
        );
      } else {
        await applyApprovedFact(
          transaction,
          proposal.attractionId,
          proposal.factKey,
          result.value.finalValue,
          proposal.sourceRecordId,
        );
      }
    }

    await transaction.changeProposal.update({
      where: { id },
      data: {
        status: result.value.status,
        reviewedById: reviewerId,
        reviewedAt: now,
        reviewNote: decision.reviewNote ?? null,
      },
    });

    if (proposal.sourceRecordId) {
      await transaction.factProvenance.upsert({
        where: {
          attractionId_factKey_sourceRecordId: {
            attractionId: proposal.attractionId,
            factKey: proposal.factKey,
            sourceRecordId: proposal.sourceRecordId,
          },
        },
        create: {
          attractionId: proposal.attractionId,
          factKey: proposal.factKey,
          sourceRecordId: proposal.sourceRecordId,
          sourceType: proposal.sourceRecord?.sourceType ?? SourceType.OTHER,
          lastCheckedAt: now,
          nextRefreshAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          confidence: proposal.confidence,
          updateStatus: result.value.status === 'APPROVED' ? UpdateStatus.FRESH : UpdateStatus.DUE,
          detectedChange: asJsonValue({
            currentValue: proposal.currentValue,
            finalValue: result.value.finalValue,
          }),
          reviewerDecision: result.value.reviewerDecision,
          reviewedById: reviewerId,
          reviewedAt: now,
        },
        update: {
          lastCheckedAt: now,
          confidence: proposal.confidence,
          updateStatus: result.value.status === 'APPROVED' ? UpdateStatus.FRESH : UpdateStatus.DUE,
          detectedChange: asJsonValue({
            currentValue: proposal.currentValue,
            finalValue: result.value.finalValue,
          }),
          reviewerDecision: result.value.reviewerDecision,
          reviewedById: reviewerId,
          reviewedAt: now,
        },
      });
    }

    if (result.value.invalidateEnglishTranslation) {
      await transaction.attractionLocalization.updateMany({
        where: { attractionId: proposal.attractionId, locale: 'en' },
        data: { translationState: 'STALE' },
      });
    }

    if (result.value.supersedePending) {
      await transaction.changeProposal.updateMany({
        where: {
          attractionId: proposal.attractionId,
          factKey: proposal.factKey,
          status: ChangeProposalStatus.PENDING,
          id: { not: proposal.id },
        },
        data: {
          status: ChangeProposalStatus.SUPERSEDED,
          reviewedById: reviewerId,
          reviewedAt: now,
          reviewNote: `Superseded by approved proposal ${proposal.id}.`,
        },
      });
    }

    return {
      proposalId: proposal.id,
      status: result.value.status,
      factKey: proposal.factKey,
      translationInvalidated: result.value.invalidateEnglishTranslation,
      merge: mergeResult,
    };
  });
}
