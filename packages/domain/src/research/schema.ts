import { z } from 'zod';

import {
  bookingRequirementSchema,
  childAgeBandSchema,
  countryCodeSchema,
  dogPolicySchema,
  indoorOutdoorSchema,
  priceLevelSchema,
  seasonSchema,
  strollerSuitabilitySchema,
  suitabilitySchema,
  transportModeSchema,
  wheelchairAccessSchema,
} from '../entities/attraction.js';

export const researchSchemaVersion = '1.0.0' as const;
export const researchSchemaId =
  'https://bodenseeguide.example/schemas/research-output/1.0.0' as const;

const nonEmptyString = z.string().trim().min(1);
const sourceTypeSchema = z.enum([
  'official_website',
  'tourism_org',
  'public_feed',
  'osm',
  'wikidata',
  'wikipedia',
  'other',
]);
const researchConfidenceSchema = z.enum(['low', 'medium', 'high']);
const evidenceStatusSchema = z.enum(['found', 'not_found', 'conflicting']);
const dateTimeSchema = z.string().datetime({ offset: true });
const urlSchema = z.url();

export const researchEvidenceSchema = z.strictObject({
  sourceUrl: urlSchema,
  sourceType: sourceTypeSchema,
  retrievedAt: dateTimeSchema,
  quoteOrData: nonEmptyString,
  note: nonEmptyString.optional(),
});

function evidenced<T extends z.ZodType>(valueSchema: T, critical = false) {
  return z
    .strictObject({
      value: valueSchema,
      status: evidenceStatusSchema,
      confidence: researchConfidenceSchema,
      evidence: z.array(researchEvidenceSchema),
      conflictNote: nonEmptyString.optional(),
    })
    .superRefine((input, context) => {
      if (input.status === 'found' && input.evidence.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['evidence'],
          message: 'Found values require at least one evidence entry.',
        });
      }
      if (input.status === 'conflicting' && !input.conflictNote) {
        context.addIssue({
          code: 'custom',
          path: ['conflictNote'],
          message: 'Conflicting values require a conflict note.',
        });
      }
      if (
        critical &&
        input.confidence === 'high' &&
        !input.evidence.some(
          (entry) => entry.sourceType === 'official_website' || entry.sourceType === 'tourism_org',
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['evidence'],
          message: 'High-confidence critical values require official or tourism evidence.',
        });
      }
    });
}

function evidencedValue<T extends z.ZodType>(valueSchema: T, critical = false) {
  return evidenced(valueSchema.nullable(), critical);
}

const coordinatesValueSchema = z.strictObject({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
});

const scopeCheckSchema = z
  .strictObject({
    withinBand: z.boolean(),
    estimatedShorelineDistanceM: z.number().finite().nonnegative().optional(),
    exceptionProposed: z.boolean().optional(),
    exceptionJustification: nonEmptyString.optional(),
  })
  .superRefine((input, context) => {
    if (input.exceptionProposed && !input.exceptionJustification) {
      context.addIssue({
        code: 'custom',
        path: ['exceptionJustification'],
        message: 'A proposed scope exception requires a justification.',
      });
    }
  });

const researchOpeningRuleSchema = z.strictObject({
  days: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])),
  opens: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u)
    .nullable(),
  closes: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u)
    .nullable(),
  holidays: z.enum(['AS_WEEKDAY', 'CLOSED', 'SPECIAL']),
});

const structuredOpeningHoursSchema = z
  .strictObject({
    validFrom: z.string().date(),
    validTo: z.string().date(),
    rules: z.array(researchOpeningRuleSchema),
  })
  .superRefine((input, context) => {
    if (input.validFrom > input.validTo) {
      context.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'Opening-hours validity must end on or after its start date.',
      });
    }
  });

const openingHoursValueSchema = z.union([
  structuredOpeningHoursSchema,
  z.strictObject({ hoursUnknown: z.literal(true) }),
]);

const exceptionalClosureSchema = z.strictObject({
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
  reason: nonEmptyString.optional(),
});

const priceSchema = z.strictObject({
  audience: z.enum(['ADULT', 'CHILD', 'FAMILY', 'SENIOR', 'GROUP', 'OTHER']),
  amount: z.number().finite().nonnegative(),
  currency: z.enum(['EUR', 'CHF']),
});

const nearestStopSchema = z.strictObject({
  name: nonEmptyString,
  distanceM: z.number().finite().nonnegative(),
});

const parkingSchema = z.enum(['ON_SITE', 'NEARBY', 'DIFFICULT', 'NONE']);
const seasonsValueSchema = z.array(seasonSchema).superRefine((seasons, context) => {
  if (seasons.includes('ALL_YEAR') && seasons.length > 1) {
    context.addIssue({
      code: 'custom',
      message: 'ALL_YEAR cannot be combined with another season.',
    });
  }
});

const researchSummarySchema = z
  .string()
  .trim()
  .refine((value) => {
    const wordCount = value.split(/\s+/u).filter(Boolean).length;
    return wordCount >= 40 && wordCount <= 80;
  }, 'Summaries must contain between 40 and 80 words.');

const researchMetaSchema = z.strictObject({
  sector: z.string().regex(/^BS-(?:0[1-9]|1[0-5])$/u),
  researchedAt: dateTimeSchema,
  agent: nonEmptyString,
  promptVersion: nonEmptyString,
  pipelineStep: z.enum(['discovery', 'details', 'verified', 'translated']).optional(),
});

const identitySchema = z.strictObject({
  candidateId: z.ulid(),
  nameDe: evidencedValue(nonEmptyString, true),
  officialWebsite: evidencedValue(urlSchema),
  externalIds: z
    .array(
      z.strictObject({
        system: z.enum(['osm', 'wikidata', 'official']),
        id: z.union([nonEmptyString, z.number().finite()]),
      }),
    )
    .optional(),
});

const geoSchema = z.strictObject({
  coordinates: evidencedValue(coordinatesValueSchema, true),
  countryCode: countryCodeSchema,
  municipality: evidencedValue(nonEmptyString),
  scopeCheck: scopeCheckSchema,
  suggestedRegionCode: z
    .enum([
      'UEBERLINGER_SEE',
      'OBERSEE_NORD',
      'BAYERN_UFER',
      'VORARLBERG_UFER',
      'OBERSEE_SUED',
      'THURGAU_UFER',
      'KONSTANZ_SEERHEIN',
      'UNTERSEE_NORD',
      'UNTERSEE_SUED',
    ])
    .optional(),
});

const classificationSchema = z.strictObject({
  primaryCategory: evidencedValue(nonEmptyString),
  subcategories: evidencedValue(z.array(nonEmptyString)),
  interests: evidencedValue(z.array(nonEmptyString)),
  audiences: evidencedValue(z.array(nonEmptyString)),
  childAgeBands: evidencedValue(z.array(childAgeBandSchema)),
  indoorOutdoor: evidencedValue(indoorOutdoorSchema),
  rainSuitability: evidencedValue(suitabilitySchema),
  heatSuitability: evidencedValue(suitabilitySchema),
  seasons: evidencedValue(seasonsValueSchema),
  typicalDurationMin: evidencedValue(z.number().int().nonnegative()),
  typicalDurationMax: evidencedValue(z.number().int().nonnegative()),
});

const practicalSchema = z.strictObject({
  openingHours: evidencedValue(openingHoursValueSchema, true),
  exceptionalClosures: evidencedValue(z.array(exceptionalClosureSchema), true),
  priceLevel: evidencedValue(priceLevelSchema),
  prices: evidencedValue(z.array(priceSchema), true),
  bookingRequirement: evidencedValue(bookingRequirementSchema),
  bookingUrl: evidencedValue(urlSchema),
  foodOnSite: evidencedValue(z.boolean()),
  cafeOnSite: evidencedValue(z.boolean()),
  picnicAllowed: evidencedValue(z.boolean()),
  toilets: evidencedValue(z.boolean()),
  strollerSuitable: evidencedValue(strollerSuitabilitySchema),
  wheelchairAccess: evidencedValue(wheelchairAccessSchema, true),
  wheelchairToilet: evidencedValue(z.boolean(), true),
  dogPolicy: evidencedValue(dogPolicySchema),
  visitorLanguages: evidencedValue(z.array(z.enum(['de', 'en', 'fr', 'it']))),
  transportModes: evidencedValue(z.array(transportModeSchema)),
  nearestStop: evidencedValue(nearestStopSchema),
  parking: evidencedValue(parkingSchema),
  bicycleAccess: evidencedValue(z.boolean()),
});

const translationMetaSchema = z.strictObject({
  translatedAt: dateTimeSchema,
  sourceLocale: z.literal('de'),
  promptVersion: nonEmptyString,
});

const germanLocalizationSchema = z.strictObject({
  name: nonEmptyString,
  summary: researchSummarySchema,
  description: nonEmptyString.optional(),
  practicalNotes: nonEmptyString.optional(),
});

const englishLocalizationSchema = z.strictObject({
  name: nonEmptyString,
  summary: researchSummarySchema,
  description: nonEmptyString.optional(),
  practicalNotes: nonEmptyString.optional(),
  translationMeta: translationMetaSchema,
});

const localizationsSchema = z.strictObject({
  de: germanLocalizationSchema,
  en: englishLocalizationSchema.optional(),
});

const duplicateCheckSchema = z.strictObject({
  checkedAgainst: nonEmptyString.optional(),
  candidates: z
    .array(
      z.strictObject({
        matchType: z.enum(['external_id', 'official_url', 'coordinates', 'name']),
        matchedId: z.union([nonEmptyString, z.number().finite()]),
        score: z.number().finite().min(0).max(1),
        resolution: z.enum(['distinct', 'duplicate', 'unclear']).optional(),
        reasoning: nonEmptyString.optional(),
      }),
    )
    .optional(),
});

const reviewFlagsSchema = z.array(
  z.strictObject({
    reason: z.enum([
      'low_confidence_critical_field',
      'conflicting_sources',
      'possible_duplicate',
      'scope_exception',
      'unmapped_signals',
      'other',
    ]),
    detail: nonEmptyString.optional(),
  }),
);

export const researchOutputSchema = z
  .strictObject({
    schemaVersion: z.string().regex(/^1\.\d+\.\d+$/u),
    researchMeta: researchMetaSchema,
    identity: identitySchema,
    geo: geoSchema,
    classification: classificationSchema,
    practical: practicalSchema.optional(),
    localizations: localizationsSchema,
    duplicateCheck: duplicateCheckSchema.optional(),
    unmappedSignals: z
      .array(
        z.strictObject({
          signal: nonEmptyString,
          sourceUrl: urlSchema,
          suggestedDimension: nonEmptyString.optional(),
        }),
      )
      .optional(),
    reviewFlags: reviewFlagsSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.localizations.en && input.researchMeta.pipelineStep !== 'translated') {
      context.addIssue({
        code: 'custom',
        path: ['researchMeta', 'pipelineStep'],
        message: 'English localization is accepted only at the translated pipeline step.',
      });
    }
  });

export type ResearchOutput = z.infer<typeof researchOutputSchema>;
export type ResearchEvidence = z.infer<typeof researchEvidenceSchema>;

export class UnsupportedResearchSchemaVersionError extends Error {
  readonly code = 'UNSUPPORTED_RESEARCH_SCHEMA_VERSION';
  readonly receivedVersion: string;

  constructor(receivedVersion: string) {
    super(`Unsupported research schema version: ${receivedVersion}. Supported major version: 1.`);
    this.name = 'UnsupportedResearchSchemaVersionError';
    this.receivedVersion = receivedVersion;
  }
}

function readSchemaVersion(input: unknown): string | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const version = (input as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === 'string' ? version : null;
}

export function parseResearchOutput(input: unknown): ResearchOutput {
  const version = readSchemaVersion(input);
  if (!version || !/^1\.\d+\.\d+$/u.test(version)) {
    throw new UnsupportedResearchSchemaVersionError(version ?? 'missing');
  }
  return researchOutputSchema.parse(input);
}

const generatedJsonSchema = z.toJSONSchema(researchOutputSchema, {
  target: 'draft-2020-12',
  unrepresentable: 'any',
});

export const researchOutputJsonSchema = {
  ...generatedJsonSchema,
  $id: researchSchemaId,
};
