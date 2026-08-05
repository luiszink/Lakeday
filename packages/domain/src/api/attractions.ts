import { z } from 'zod';

import { openStateSchema } from '../opening-hours/index.js';
import { filterSpecSchema } from '../filter/index.js';

export const attractionLocaleSchema = z.enum(['de', 'en']);

export const attractionListQuerySchema = z
  .object({
    bbox: z.string().trim().min(7).max(160).optional(),
    cursor: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    locale: attractionLocaleSchema.default('de'),
    q: z.string().trim().min(2).max(120).optional(),
  })
  .merge(filterSpecSchema)
  .strict();

export const attractionCardSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z
    .object({
      code: z.string().min(1),
      label: z.string().min(1),
    })
    .nullable(),
  region: z.object({
    code: z.string().min(1),
    name: z.string().min(1),
  }),
  municipality: z.string().min(1),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  priceLevel: z.string().nullable(),
  openState: openStateSchema,
  openDate: z.string().date().nullable(),
  openUntil: z
    .string()
    .regex(/^\d{2}:\d{2}$/u)
    .nullable(),
  typicalDuration: z
    .object({
      min: z.number().int().positive().nullable(),
      max: z.number().int().positive().nullable(),
    })
    .nullable(),
  freshness: z.object({
    level: z.enum(['FRESH', 'AGING', 'STALE', 'UNKNOWN']),
    lastVerifiedAt: z.string().datetime().nullable(),
  }),
  thumbnail: z
    .object({
      storagePath: z.string().min(1),
      attributionText: z.string().min(1),
    })
    .nullable(),
});

export const attractionListResponseSchema = z.object({
  items: z.array(attractionCardSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
  truncated: z.boolean().optional(),
});

export type AttractionListQuery = z.infer<typeof attractionListQuerySchema>;
export type AttractionListResponse = z.infer<typeof attractionListResponseSchema>;
