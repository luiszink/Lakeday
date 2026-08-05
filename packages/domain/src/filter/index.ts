import { z } from 'zod';

const csv = z
  .string()
  .trim()
  .min(1)
  .transform((value) => [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ])
  .refine((values) => values.length <= 30, 'A filter may contain at most 30 values.');

const trueFlag = z.literal('1').transform(() => true);
const enumCsv = csv.refine(
  (values) => values.every((value) => /^[a-z0-9][a-z0-9_+-]*$/i.test(value)),
  'Filter values must be stable vocabulary codes.',
);

function isIsoDate(value: string) {
  const date = value.slice('date:'.length);
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

const openFilter = z
  .string()
  .refine(
    (value) => value === 'now' || (/^date:\d{4}-\d{2}-\d{2}$/u.test(value) && isIsoDate(value)),
    'open must be now or date:YYYY-MM-DD.',
  );

const near = z
  .string()
  .trim()
  .transform((value, context) => {
    const coordinates = value.split(',');
    const latitude = Number(coordinates[0]);
    const longitude = Number(coordinates[1]);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      context.addIssue({ code: 'custom', message: 'near must be latitude,longitude.' });
      return z.NEVER;
    }
    return {
      latitude: Math.round(latitude * 1_000) / 1_000,
      longitude: Math.round(longitude * 1_000) / 1_000,
    };
  });

export const filterSpecSchema = z
  .object({
    age: enumCsv.optional(),
    audience: enumCsv.optional(),
    cafe: trueFlag.optional(),
    cat: enumCsv.optional(),
    dogs: trueFlag.optional(),
    dur: enumCsv.optional(),
    food: trueFlag.optional(),
    heat: z.enum(['ok', 'good', 'excellent']).optional(),
    interest: enumCsv.optional(),
    io: enumCsv.optional(),
    lang: enumCsv.optional(),
    mode: enumCsv.optional(),
    near: near.optional(),
    noresv: trueFlag.optional(),
    open: openFilter.optional(),
    picnic: trueFlag.optional(),
    price: enumCsv.optional(),
    r: z.coerce
      .number()
      .int()
      .refine((value) => [1, 2, 5, 10, 25, 50].includes(value))
      .optional(),
    rain: z.enum(['ok', 'good', 'excellent']).optional(),
    region: enumCsv.optional(),
    season: enumCsv.optional(),
    stroller: trueFlag.optional(),
    wheelchair: trueFlag.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.near && value.r === undefined) {
      context.addIssue({ code: 'custom', path: ['r'], message: 'r is required when near is set.' });
    }
    if (value.r !== undefined && !value.near) {
      context.addIssue({
        code: 'custom',
        path: ['near'],
        message: 'near is required when r is set.',
      });
    }
  });

export type FilterSpec = z.infer<typeof filterSpecSchema>;
