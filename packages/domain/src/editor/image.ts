import { z } from 'zod';

export const imageUploadMetadataSchema = z.object({
  altDe: z.string().trim().min(1).max(300),
  altEn: z.string().trim().min(1).max(300),
  attributionText: z.string().trim().min(1).max(500),
  licenceId: z.uuid(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  sourceUrl: z.url().nullable(),
});

export type ImageUploadMetadata = z.infer<typeof imageUploadMetadataSchema>;
