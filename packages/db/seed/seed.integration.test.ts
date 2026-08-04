import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { isPublicHoliday, seedHolidayCalendars } from './holidays.js';
import { seedLicences } from './licences.js';
import { seedVocabularies, vocabularyCodes } from './vocabularies.js';

config({ path: '../../.env' });

const databaseUrl = process.env.DATABASE_URL;
const client = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const describeDatabase = databaseUrl ? describe : describe.skip;

afterAll(async () => {
  await client?.$disconnect();
});

describeDatabase('vocabulary and calendar seed data', () => {
  it('loads every vocabulary with German and English labels idempotently', async () => {
    await seedVocabularies(client!);
    await seedVocabularies(client!);

    const [categories, interests, audiences] = await Promise.all([
      client!.category.findMany({ select: { code: true, labelDe: true, labelEn: true } }),
      client!.interest.findMany({ select: { code: true, labelDe: true, labelEn: true } }),
      client!.audience.findMany({ select: { code: true, labelDe: true, labelEn: true } }),
    ]);

    expect(categories.map(({ code }) => code).sort()).toEqual(
      [...vocabularyCodes.categories].sort(),
    );
    expect(interests.map(({ code }) => code).sort()).toEqual([...vocabularyCodes.interests].sort());
    expect(audiences.map(({ code }) => code).sort()).toEqual([...vocabularyCodes.audiences].sort());
    expect(
      [...categories, ...interests, ...audiences].every(
        ({ labelDe, labelEn }) => labelDe.length > 0 && labelEn.length > 0,
      ),
    ).toBe(true);
  });

  it('loads licences and holiday calendars idempotently', async () => {
    await seedLicences(client!);
    await seedHolidayCalendars(client!);
    await seedLicences(client!);
    await seedHolidayCalendars(client!);

    await expect(client!.licence.count()).resolves.toBe(4);
    await expect(client!.holidayCalendar.count()).resolves.toBe(4);
  });

  it('keeps country-specific public holidays distinct', () => {
    expect(isPublicHoliday('DE-BW', '2026-05-25')).toBe(true);
    expect(isPublicHoliday('CH-TG', '2026-05-25')).toBe(false);
    expect(isPublicHoliday('CH-TG', '2026-08-01')).toBe(true);
    expect(isPublicHoliday('DE-BW', '2026-08-01')).toBe(false);
    expect(isPublicHoliday('AT-VBG', '2026-08-01')).toBe(false);
  });
});
