import { z } from 'zod';

export const countryCodeSchema = z.enum(['DE', 'CH', 'AT']);
export const localeSchema = z.enum(['de', 'en']);
export const attractionStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
]);
export const translationStateSchema = z.enum(['SOURCE', 'TRANSLATED', 'NEEDS_REVIEW', 'STALE']);
export const relevanceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const verificationStateSchema = z.enum(['UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED']);
export const confidenceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const indoorOutdoorSchema = z.enum(['INDOOR', 'OUTDOOR', 'MIXED']);
export const suitabilitySchema = z.enum(['POOR', 'OK', 'GOOD', 'EXCELLENT']);
export const seasonSchema = z.enum(['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_YEAR']);
export const priceLevelSchema = z.enum(['FREE', 'LOW', 'MEDIUM', 'HIGH', 'PREMIUM']);
export const bookingRequirementSchema = z.enum(['NONE', 'RECOMMENDED', 'REQUIRED']);
export const strollerSuitabilitySchema = z.enum(['YES', 'PARTIAL', 'NO', 'UNKNOWN']);
export const wheelchairAccessSchema = z.enum(['FULL', 'PARTIAL', 'NONE', 'UNKNOWN']);
export const dogPolicySchema = z.enum(['ALLOWED', 'LEASHED', 'NO', 'UNKNOWN']);
export const visitorLanguageSchema = z.enum(['DE', 'EN', 'FR', 'IT']);
export const transportModeSchema = z.enum(['WALK', 'BICYCLE', 'PUBLIC_TRANSPORT', 'CAR']);
export const childAgeBandSchema = z.enum(['0-2', '3-5', '6-9', '10-13', '14+']);

export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const attractionLocalizationSchema = z.object({
  locale: localeSchema,
  name: z.string().trim(),
  slug: z.string().trim(),
  summary: z.string().trim().nullable(),
  description: z.string().trim().nullable(),
  practicalNotes: z.string().trim().nullable(),
  translationState: translationStateSchema,
});

export const criticalFactsSchema = z.object({
  name: verificationStateSchema,
  location: verificationStateSchema,
  hours: verificationStateSchema,
});

export const attractionSchema = z.object({
  id: z.string().uuid(),
  status: attractionStatusSchema,
  countryCode: countryCodeSchema,
  municipality: z.string().trim().min(1),
  regionCode: z.string().trim().min(1).nullable(),
  coordinates: coordinatesSchema.nullable(),
  categoryCodes: z.array(z.string().trim().min(1)),
  scopeException: z.boolean(),
  scopeExceptionReason: z.string().trim().nullable(),
  editorialRelevance: relevanceSchema,
  verificationState: verificationStateSchema,
  indoorOutdoor: indoorOutdoorSchema,
  rainSuitability: suitabilitySchema.nullable(),
  heatSuitability: suitabilitySchema.nullable(),
  seasons: z.array(seasonSchema),
  childAgeBands: z.array(childAgeBandSchema),
  priceLevel: priceLevelSchema.nullable(),
  bookingRequirement: bookingRequirementSchema.nullable(),
  strollerSuitable: strollerSuitabilitySchema,
  wheelchairAccess: wheelchairAccessSchema,
  dogPolicy: dogPolicySchema,
  visitorLanguages: z.array(visitorLanguageSchema),
  transportModes: z.array(transportModeSchema),
});

export type Attraction = z.infer<typeof attractionSchema>;
export type AttractionLocalization = z.infer<typeof attractionLocalizationSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type CriticalFacts = z.infer<typeof criticalFactsSchema>;
