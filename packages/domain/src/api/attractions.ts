import { z } from 'zod';

import { openStateSchema } from '../opening-hours/index.js';
import { filterSpecSchema } from '../filter/index.js';

export const attractionLocaleSchema = z.enum(['de', 'en']);

const attractionIdsQuerySchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, context) => {
    const ids = [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
    if (ids.length > 100) {
      context.addIssue({ code: 'too_big', maximum: 100, origin: 'array', inclusive: true });
      return z.NEVER;
    }
    if (ids.some((id) => !z.string().uuid().safeParse(id).success)) {
      context.addIssue({ code: 'custom', message: 'ids must contain UUIDs.' });
      return z.NEVER;
    }
    return ids;
  });

export const attractionListQuerySchema = z
  .object({
    bbox: z.string().trim().min(7).max(160).optional(),
    cursor: z.string().trim().min(1).optional(),
    ids: attractionIdsQuerySchema.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    locale: attractionLocaleSchema.default('de'),
    q: z.string().trim().min(2).max(120).optional(),
    sort: z.enum(['distance', 'relevance']).optional(),
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
      altDe: z.string().min(1),
      altEn: z.string().min(1),
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
  zeroResultHints: z
    .array(
      z.object({
        filter: z.string().min(1),
        count: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

export type AttractionListQuery = z.infer<typeof attractionListQuerySchema>;
export type AttractionListResponse = z.infer<typeof attractionListResponseSchema>;
