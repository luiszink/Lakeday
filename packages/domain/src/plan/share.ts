import { z } from 'zod';

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const startPointSchema = z.object({
  coordinates: coordinateSchema,
  label: z.string().trim().min(1).max(80).refine((value) => !/[\u0000-\u001F\u007F]/u.test(value), {
    message: 'Start point label contains control characters.',
  }),
});

export const planShareSchema = z.object({
  date: z.string().date().nullable().optional(),
  locale: z.enum(['de', 'en']),
  startPoint: startPointSchema.nullable().optional(),
  stops: z
    .array(
      z.object({
        attractionId: z.string().uuid(),
        plannedDurationMin: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1)
    .max(20)
    .superRefine((stops, context) => {
      if (new Set(stops.map((stop) => stop.attractionId)).size !== stops.length) {
        context.addIssue({ code: 'custom', message: 'Plan stops must be unique.' });
      }
    }),
});

export type PlanShareInput = z.infer<typeof planShareSchema>;