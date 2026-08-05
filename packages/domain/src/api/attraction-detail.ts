import { z } from 'zod';

import {
  exceptionalClosureSchema,
  openingScheduleSchema,
  openStateSchema,
} from '../opening-hours/index.js';
import { coordinatesSchema } from '../entities/attraction.js';
import { attractionLocaleSchema } from './attractions.js';

export const attractionDetailQuerySchema = z.object({
  date: z.string().date().optional(),
  locale: attractionLocaleSchema.default('de'),
});

const localizedTextSchema = z.object({
  description: z.string().nullable(),
  name: z.string().min(1),
  practicalNotes: z.string().nullable(),
  slug: z.string().min(1),
  summary: z.string().nullable(),
});

const priceInfoSchema = z.object({
  amount: z.number().finite().nonnegative(),
  audience: z.string().min(1),
  currency: z.string().min(1),
  note: z.string().nullable(),
  validFrom: z.string().date().nullable(),
  validTo: z.string().date().nullable(),
});

const imageSchema = z.object({
  altDe: z.string().min(1),
  altEn: z.string().min(1),
  attributionText: z.string().min(1),
  licence: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  storagePath: z.string().min(1),
});

const freshnessFactSchema = z.object({
  factKey: z.string().min(1),
  lastCheckedAt: z.string().datetime().nullable(),
  status: z.string().min(1),
});

const nearbyAttractionSchema = z.object({
  category: z.string().nullable(),
  distanceM: z.number().finite().nonnegative().nullable(),
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const attractionDetailResponseSchema = z.object({
  aliases: z.array(z.object({ id: z.string().uuid(), slug: z.string().min(1) })),
  bookingRequirement: z.string().nullable(),
  bookingUrl: z.string().url().nullable(),
  categories: z.array(z.object({ code: z.string().min(1), label: z.string().min(1) })),
  coordinates: coordinatesSchema.nullable(),
  countryCode: z.string().min(1),
  dogPolicy: z.string().nullable(),
  exceptionalClosures: z.array(exceptionalClosureSchema),
  factFreshness: z.array(freshnessFactSchema),
  foodOnSite: z.boolean().nullable(),
  cafeOnSite: z.boolean().nullable(),
  heatSuitability: z.string().nullable(),
  id: z.string().uuid(),
  images: z.array(imageSchema),
  indoorOutdoor: z.string(),
  nearestStopDistanceM: z.number().int().nonnegative().nullable(),
  nearestStopName: z.string().nullable(),
  lastVerifiedAt: z.string().datetime().nullable(),
  localization: localizedTextSchema,
  municipality: z.string().min(1),
  nearby: z.array(nearbyAttractionSchema),
  openState: openStateSchema,
  openDate: z.string().date(),
  openingSchedule: openingScheduleSchema.nullable(),
  parkingAvailability: z.string().nullable(),
  parkingNote: z.string().nullable(),
  bicycleAccess: z.boolean().nullable(),
  bicycleNote: z.string().nullable(),
  prices: z.array(priceInfoSchema),
  picnicAllowed: z.boolean().nullable(),
  officialWebsite: z.string().url().nullable(),
  priceLevel: z.string().nullable(),
  region: z.object({ code: z.string().min(1), name: z.string().min(1) }),
  rainSuitability: z.string().nullable(),
  seasons: z.array(z.string()),
  strollerSuitable: z.string().nullable(),
  typicalDuration: z
    .object({
      max: z.number().int().positive().nullable(),
      min: z.number().int().positive().nullable(),
    })
    .nullable(),
  toilets: z.boolean().nullable(),
  transportModes: z.array(z.string()),
  visitorLanguages: z.array(z.string()),
  wheelchairAccess: z.string().nullable(),
  wheelchairToilet: z.boolean().nullable(),
});

export type AttractionDetailQuery = z.infer<typeof attractionDetailQuerySchema>;
export type AttractionDetailResponse = z.infer<typeof attractionDetailResponseSchema>;
