import { createHash, randomUUID } from 'node:crypto';

import {
  AttractionStatus,
  ChildAgeBand,
  Prisma,
  assignRegion,
  computeShorelineDistanceM,
  createAttractionShell,
  isShorelineMunicipality,
  readShorelineBandKm,
  readWgs84Point,
  updateAttractionPoint,
} from '@lake/db';
import {
  attractionEditorPayloadSchema,
  isInScope,
  publishAttraction,
  type Attraction,
  type AttractionEditorPayload,
  type ScopeGeometry,
} from '@lake/domain';

import { database } from '../../auth/database';

const relevanceImportance = {
  LOW: 0.25,
  MEDIUM: 0.5,
  HIGH: 0.9,
} as const;

const childAgeBandToDatabase: Record<
  AttractionEditorPayload['childAgeBands'][number],
  ChildAgeBand
> = {
  '0-2': ChildAgeBand.AGE_0_2,
  '3-5': ChildAgeBand.AGE_3_5,
  '6-9': ChildAgeBand.AGE_6_9,
  '10-13': ChildAgeBand.AGE_10_13,
  '14+': ChildAgeBand.AGE_14_PLUS,
};

const childAgeBandFromDatabase: Record<
  ChildAgeBand,
  AttractionEditorPayload['childAgeBands'][number]
> = {
  [ChildAgeBand.AGE_0_2]: '0-2',
  [ChildAgeBand.AGE_3_5]: '3-5',
  [ChildAgeBand.AGE_6_9]: '6-9',
  [ChildAgeBand.AGE_10_13]: '10-13',
  [ChildAgeBand.AGE_14_PLUS]: '14+',
};

export class AttractionConflictError extends Error {
  constructor() {
    super('The attraction was changed by another editor.');
  }
}

export class AttractionNotFoundError extends Error {
  constructor() {
    super('Attraction not found.');
  }
}

export class AttractionValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type EditorContext = Readonly<{
  id: string;
  regionCode: string;
  shorelineDistanceM: number;
  assignedRegionCode: string | null;
  inScope: boolean;
  domainAttraction: Attraction;
  scopeGeometry: ScopeGeometry;
}>;

function dateAtStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function timeAt(time: string | null) {
  return time ? new Date(`1970-01-01T${time}:00.000Z`) : null;
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeValue(time: Date | null) {
  return time ? time.toISOString().slice(11, 16) : null;
}

function decimalValue(value: Prisma.Decimal | number) {
  return typeof value === 'number' ? value : value.toNumber();
}

function relevanceFromImportance(
  value: Prisma.Decimal | number,
): AttractionEditorPayload['editorialRelevance'] {
  const importance = decimalValue(value);
  return importance >= 0.75 ? 'HIGH' : importance >= 0.4 ? 'MEDIUM' : 'LOW';
}

function toDomainAttraction(
  payload: AttractionEditorPayload,
  id: string,
  regionCode: string,
  status: Attraction['status'] = payload.status,
): Attraction {
  return {
    id,
    status,
    countryCode: payload.countryCode,
    municipality: payload.municipality,
    regionCode,
    coordinates: { latitude: payload.latitude, longitude: payload.longitude },
    categoryCodes: payload.categoryCodes,
    scopeException: payload.scopeException,
    scopeExceptionReason: payload.scopeExceptionReason,
    editorialRelevance: payload.editorialRelevance,
    verificationState: payload.verificationState,
    indoorOutdoor: payload.indoorOutdoor,
    rainSuitability: payload.rainSuitability,
    heatSuitability: payload.heatSuitability,
    seasons: payload.seasons,
    childAgeBands: payload.childAgeBands,
    priceLevel: payload.priceLevel,
    bookingRequirement: payload.bookingRequirement,
    strollerSuitable: payload.strollerSuitable ?? 'UNKNOWN',
    wheelchairAccess: payload.wheelchairAccess ?? 'UNKNOWN',
    dogPolicy: payload.dogPolicy ?? 'UNKNOWN',
    visitorLanguages: payload.visitorLanguages,
    transportModes: payload.transportModes,
  };
}

async function buildEditorContext(
  payload: AttractionEditorPayload,
  status: Attraction['status'] = payload.status,
): Promise<EditorContext> {
  const id = payload.id ?? randomUUID();
  const point = { latitude: payload.latitude, longitude: payload.longitude };
  const [shorelineDistanceM, assignedRegionCode, shorelineMunicipality] = await Promise.all([
    computeShorelineDistanceM(database, point),
    assignRegion(database, point),
    isShorelineMunicipality(database, payload.municipality),
  ]);
  const regionCode = assignedRegionCode ?? payload.regionCode;
  const domainAttraction = toDomainAttraction(payload, id, regionCode, status);
  const scopeGeometry: ScopeGeometry = {
    isWithinShorelineBand: () => shorelineDistanceM <= readShorelineBandKm() * 1_000,
    isShorelineMunicipality: () => shorelineMunicipality,
  };

  return {
    id,
    regionCode,
    shorelineDistanceM,
    assignedRegionCode,
    inScope: isInScope(domainAttraction, scopeGeometry),
    domainAttraction,
    scopeGeometry,
  };
}

function scalarData(
  payload: AttractionEditorPayload,
  context: EditorContext,
): Prisma.AttractionUncheckedUpdateInput {
  return {
    status: payload.status,
    countryCode: payload.countryCode,
    municipality: payload.municipality,
    regionCode: context.regionCode,
    shorelineDistanceM: context.shorelineDistanceM,
    scopeException: payload.scopeException,
    scopeExceptionReason: payload.scopeExceptionReason,
    indoorOutdoor: payload.indoorOutdoor,
    rainSuitability: payload.rainSuitability,
    heatSuitability: payload.heatSuitability,
    seasons: payload.seasons,
    typicalDurationMin: payload.typicalDurationMin,
    typicalDurationMax: payload.typicalDurationMax,
    priceLevel: payload.priceLevel,
    bookingRequirement: payload.bookingRequirement,
    bookingUrl: payload.bookingUrl,
    officialWebsite: payload.officialWebsite,
    childAgeBands: payload.childAgeBands.map((ageBand) => childAgeBandToDatabase[ageBand]),
    foodOnSite: payload.foodOnSite,
    cafeOnSite: payload.cafeOnSite,
    picnicAllowed: payload.picnicAllowed,
    toilets: payload.toilets,
    strollerSuitable: payload.strollerSuitable,
    wheelchairAccess: payload.wheelchairAccess,
    wheelchairToilet: payload.wheelchairToilet,
    dogPolicy: payload.dogPolicy,
    visitorLanguages: payload.visitorLanguages,
    transportModes: payload.transportModes,
    nearestStopName: payload.nearestStopName,
    nearestStopDistanceM: payload.nearestStopDistanceM,
    parkingAvailability: payload.parkingAvailability,
    parkingNote: payload.parkingNote,
    bicycleAccess: payload.bicycleAccess,
    bicycleNote: payload.bicycleNote,
    editorialImportance: relevanceImportance[payload.editorialRelevance],
    verificationState: payload.verificationState,
  };
}

async function replaceRelations(
  client: Prisma.TransactionClient,
  payload: AttractionEditorPayload,
  attractionId: string,
) {
  const categories = await client.category.findMany({
    where: { code: { in: payload.categoryCodes } },
    select: { id: true, code: true },
  });
  if (categories.length !== new Set(payload.categoryCodes).size) {
    throw new AttractionValidationError('One or more category codes do not exist.');
  }

  await client.attractionCategory.deleteMany({ where: { attractionId } });
  await client.attractionCategory.createMany({
    data: categories.map((category, index) => ({
      attractionId,
      categoryId: category.id,
      isPrimary: index === 0,
    })),
  });

  for (const localization of payload.localizations) {
    await client.attractionLocalization.upsert({
      where: { attractionId_locale: { attractionId, locale: localization.locale } },
      create: { attractionId, ...localization },
      update: {
        name: localization.name,
        slug: localization.slug,
        summary: localization.summary,
        description: localization.description,
        practicalNotes: localization.practicalNotes,
        translationState: localization.translationState,
      },
    });
  }

  await client.openingSchedule.deleteMany({ where: { attractionId } });
  if (payload.openingSchedule) {
    const schedule = await client.openingSchedule.create({
      data: {
        attractionId,
        validFrom: dateAtStart(payload.openingSchedule.validFrom),
        validTo: dateAtStart(payload.openingSchedule.validTo),
        hoursUnknown: payload.openingSchedule.hoursUnknown,
        rules: {
          create: payload.openingSchedule.rules.map((rule) => ({
            daysOfWeek: rule.daysOfWeek,
            opens: timeAt(rule.opens),
            closes: timeAt(rule.closes),
            appliesOnPublicHolidays: rule.appliesOnPublicHolidays,
            holidayCalendarCode: rule.holidayCalendarCode,
          })),
        },
      },
      select: { id: true },
    });
    if (!schedule.id) throw new AttractionValidationError('Opening schedule could not be saved.');
  }

  await client.exceptionalClosure.deleteMany({ where: { attractionId } });
  if (payload.closures.length > 0) {
    await client.exceptionalClosure.createMany({
      data: payload.closures.map((closure) => ({
        attractionId,
        dateFrom: dateAtStart(closure.dateFrom),
        dateTo: dateAtStart(closure.dateTo),
        confidence: 'MEDIUM',
      })),
    });
  }

  await client.priceInfo.deleteMany({ where: { attractionId } });
  if (payload.prices.length > 0) {
    await client.priceInfo.createMany({
      data: payload.prices.map((price) => ({
        attractionId,
        audience: price.audience,
        amount: price.amount,
        currency: price.currency,
        validFrom: price.validFrom ? dateAtStart(price.validFrom) : null,
        validTo: price.validTo ? dateAtStart(price.validTo) : null,
        note: price.note,
        confidence: price.confidence,
      })),
    });
  }
}

export async function calculateEditorScope(payloadInput: AttractionEditorPayload) {
  const payload = attractionEditorPayloadSchema.parse(payloadInput);
  const context = await buildEditorContext(payload);
  return {
    shorelineDistanceM: context.shorelineDistanceM,
    assignedRegionCode: context.assignedRegionCode,
    regionCode: context.regionCode,
    inScope: context.inScope,
  };
}

export async function validateEditorPublish(payloadInput: AttractionEditorPayload) {
  const payload = attractionEditorPayloadSchema.parse(payloadInput);
  const context = await buildEditorContext(payload, 'PUBLISHED');
  return {
    context,
    result: publishAttraction(
      context.domainAttraction,
      payload.localizations,
      payload.criticalFacts,
      context.scopeGeometry,
    ),
  };
}

export async function saveAttractionEditor(
  payloadInput: AttractionEditorPayload,
  actorId: string,
): Promise<{ id: string; updatedAt: Date }> {
  const payload = attractionEditorPayloadSchema.parse(payloadInput);
  const context = await buildEditorContext(payload);
  const data = scalarData(payload, context);

  await database.$transaction(async (transaction) => {
    if (payload.id) {
      const current = await transaction.attraction.findUnique({
        where: { id: payload.id },
        select: { updatedAt: true },
      });
      if (!current) throw new AttractionNotFoundError();
      if (
        !payload.expectedUpdatedAt ||
        current.updatedAt.getTime() !== Date.parse(payload.expectedUpdatedAt)
      ) {
        throw new AttractionConflictError();
      }
      const updated = await transaction.attraction.updateMany({
        where: { id: payload.id, updatedAt: current.updatedAt },
        data,
      });
      if (updated.count !== 1) throw new AttractionConflictError();
      await updateAttractionPoint(transaction, payload.id, {
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
    } else {
      await createAttractionShell(transaction, {
        id: context.id,
        point: { latitude: payload.latitude, longitude: payload.longitude },
        countryCode: payload.countryCode,
        municipality: payload.municipality,
        regionCode: context.regionCode,
        indoorOutdoor: payload.indoorOutdoor,
      });
      await transaction.attraction.update({ where: { id: context.id }, data });
    }

    await replaceRelations(transaction, payload, context.id);
    await transaction.sourceRecord.create({
      data: {
        attractionId: context.id,
        sourceUrl: `admin://user/${actorId}`,
        sourceType: 'OTHER',
        retrievedAt: new Date(),
        contentHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
  });

  const saved = await database.attraction.findUnique({
    where: { id: context.id },
    select: { id: true, updatedAt: true },
  });
  if (!saved) throw new AttractionNotFoundError();
  return saved;
}

export async function listAttractions(
  filters: Readonly<{
    status?: string;
    regionCode?: string;
    query?: string;
  }>,
) {
  const where: Prisma.AttractionWhereInput = {};
  if (
    filters.status &&
    Object.values(AttractionStatus).includes(filters.status as AttractionStatus)
  ) {
    where.status = filters.status as AttractionStatus;
  }
  if (filters.regionCode) where.regionCode = filters.regionCode;
  if (filters.query) {
    where.localizations = {
      some: {
        OR: [
          { name: { contains: filters.query, mode: 'insensitive' } },
          { slug: { contains: filters.query, mode: 'insensitive' } },
        ],
      },
    };
  }

  return database.attraction.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      status: true,
      municipality: true,
      regionCode: true,
      updatedAt: true,
      localizations: {
        orderBy: { locale: 'asc' },
        select: { locale: true, name: true, slug: true },
      },
    },
  });
}

export async function getAttractionEditor(id: string) {
  const [record, coordinates] = await Promise.all([
    database.attraction.findUnique({
      where: { id },
      include: {
        localizations: true,
        categories: { include: { category: { select: { code: true } } } },
        openingSchedule: { include: { rules: true } },
        closures: true,
        prices: true,
      },
    }),
    readWgs84Point(database, id),
  ]);
  if (!record || !coordinates) throw new AttractionNotFoundError();

  const localizationByLocale = new Map(record.localizations.map((item) => [item.locale, item]));
  const localizations = (['de', 'en'] as const).map((locale) => {
    const item = localizationByLocale.get(locale);
    return {
      locale,
      name: item?.name ?? '',
      slug: item?.slug ?? '',
      summary: item?.summary ?? null,
      description: item?.description ?? null,
      practicalNotes: item?.practicalNotes ?? null,
      translationState: item?.translationState ?? 'SOURCE',
    };
  });
  const openingSchedule = record.openingSchedule
    ? {
        validFrom: dateValue(record.openingSchedule.validFrom),
        validTo: dateValue(record.openingSchedule.validTo),
        hoursUnknown: record.openingSchedule.hoursUnknown,
        rules: record.openingSchedule.rules.map((rule) => ({
          daysOfWeek: rule.daysOfWeek,
          opens: timeValue(rule.opens),
          closes: timeValue(rule.closes),
          appliesOnPublicHolidays: rule.appliesOnPublicHolidays,
          holidayCalendarCode: rule.holidayCalendarCode,
        })),
      }
    : null;

  return attractionEditorPayloadSchema.parse({
    id: record.id,
    expectedUpdatedAt: record.updatedAt.toISOString(),
    status: record.status,
    countryCode: record.countryCode,
    municipality: record.municipality,
    regionCode: record.regionCode,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    scopeException: record.scopeException,
    scopeExceptionReason: record.scopeExceptionReason,
    editorialRelevance: relevanceFromImportance(record.editorialImportance),
    verificationState: record.verificationState,
    indoorOutdoor: record.indoorOutdoor,
    rainSuitability: record.rainSuitability,
    heatSuitability: record.heatSuitability,
    seasons: record.seasons,
    typicalDurationMin: record.typicalDurationMin,
    typicalDurationMax: record.typicalDurationMax,
    priceLevel: record.priceLevel,
    bookingRequirement: record.bookingRequirement,
    bookingUrl: record.bookingUrl,
    officialWebsite: record.officialWebsite,
    childAgeBands: record.childAgeBands.map((ageBand) => childAgeBandFromDatabase[ageBand]),
    foodOnSite: record.foodOnSite,
    cafeOnSite: record.cafeOnSite,
    picnicAllowed: record.picnicAllowed,
    toilets: record.toilets,
    strollerSuitable: record.strollerSuitable,
    wheelchairAccess: record.wheelchairAccess,
    wheelchairToilet: record.wheelchairToilet,
    dogPolicy: record.dogPolicy,
    visitorLanguages: record.visitorLanguages,
    transportModes: record.transportModes,
    nearestStopName: record.nearestStopName,
    nearestStopDistanceM: record.nearestStopDistanceM,
    parkingAvailability: record.parkingAvailability,
    parkingNote: record.parkingNote,
    bicycleAccess: record.bicycleAccess,
    bicycleNote: record.bicycleNote,
    categoryCodes: record.categories.map((item) => item.category.code),
    localizations,
    criticalFacts: {
      name: record.verificationState,
      location: record.verificationState,
      hours: record.openingSchedule?.hoursUnknown ? 'UNVERIFIED' : record.verificationState,
    },
    openingSchedule,
    closures: record.closures.map((closure) => ({
      dateFrom: dateValue(closure.dateFrom),
      dateTo: dateValue(closure.dateTo),
    })),
    prices: record.prices.map((price) => ({
      audience: price.audience,
      amount: decimalValue(price.amount),
      currency: price.currency,
      validFrom: price.validFrom ? dateValue(price.validFrom) : null,
      validTo: price.validTo ? dateValue(price.validTo) : null,
      note: price.note,
      confidence: price.confidence,
    })),
  });
}
