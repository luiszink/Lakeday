import { z } from 'zod';

export const reportRequestSchema = z.object({
  attractionId: z.string().uuid(),
  category: z.enum([
    'WRONG_HOURS',
    'WRONG_PRICE',
    'CLOSED',
    'ACCESS_ISSUE',
    'INCORRECT_INFO',
    'OTHER',
  ]),
  honeypot: z.string().max(200).optional().default(''),
  locale: z.enum(['de', 'en']),
  message: z.string().trim().max(1_000).optional().default(''),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;
