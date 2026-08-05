import { readFileSync } from 'node:fs';

import type { ResearchOutput } from '@lake/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { database } from '../../auth/database';
import {
  persistResearchImport,
  prepareResearchImport,
  SourceOriginNotApprovedError,
} from './repository';

const describeDatabase =
  process.env.DATABASE_URL && process.env.RUN_IMPORT_INTEGRATION === '1' ? describe : describe.skip;

const fixture = JSON.parse(
  readFileSync(
    new URL('../../../../../packages/domain/test/fixtures/research/valid.json', import.meta.url),
    'utf8',
  ),
) as ResearchOutput;

beforeAll(async () => {
  const licence = await database.licence.upsert({
    where: { spdxOrName: 'CC-BY-4.0' },
    create: {
      spdxOrName: 'CC-BY-4.0',
      attributionRequired: true,
      commercialUseAllowed: true,
      shareAlike: false,
    },
    update: {},
    select: { id: true },
  });
  for (const sourceType of ['OFFICIAL_WEBSITE', 'TOURISM_ORG'] as const) {
    await database.sourceOrigin.upsert({
      where: { originUrl_sourceType: { originUrl: 'https://example.com', sourceType } },
      create: {
        originUrl: 'https://example.com',
        sourceType,
        licenceId: licence.id,
        approvalState: 'APPROVED',
        health: 'HEALTHY',
      },
      update: { approvalState: 'APPROVED', licenceId: licence.id },
    });
  }
  const region = await database.region.upsert({
    where: { code: 'OBERSEE_NORD' },
    create: { code: 'OBERSEE_NORD', nameDe: 'Obersee Nord', nameEn: 'Northern Obersee' },
    update: {},
    select: { code: true },
  });
  const category = await database.category.upsert({
    where: { code: 'CULTURE_HISTORY' },
    create: {
      code: 'CULTURE_HISTORY',
      level: 'PRIMARY',
      labelDe: 'Kultur und Geschichte',
      labelEn: 'Culture and history',
    },
    update: {},
    select: { id: true },
  });
  await database.category.upsert({
    where: { code: 'museum' },
    create: {
      code: 'museum',
      level: 'SUB',
      parentCategoryId: category.id,
      labelDe: 'Museum',
      labelEn: 'Museum',
    },
    update: { parentCategoryId: category.id },
  });
  for (const [code, label] of [
    ['history', 'History'],
    ['architecture', 'Architecture'],
  ] as const) {
    await database.interest.upsert({
      where: { code },
      create: { code, labelDe: label, labelEn: label },
      update: {},
    });
  }
  for (const [code, label] of [
    ['families', 'Families'],
    ['couples', 'Couples'],
  ] as const) {
    await database.audience.upsert({
      where: { code },
      create: { code, labelDe: label, labelEn: label },
      update: {},
    });
  }
  expect(region.code).toBe('OBERSEE_NORD');
});

afterAll(async () => {
  const localizations = await database.attractionLocalization.findMany({
    where: { slug: { contains: 'stadtmuseum-konstanz' } },
    select: { attractionId: true },
  });
  await database.attraction.deleteMany({
    where: { id: { in: localizations.map(({ attractionId }) => attractionId) } },
  });
  await database.sourceOrigin.deleteMany({ where: { originUrl: 'https://example.com' } });
  await database.$disconnect();
});

describeDatabase('research import repository integration', () => {
  it('creates a draft with source records and fact provenance', async () => {
    const prepared = await prepareResearchImport(fixture);
    expect(prepared.plan.action).toBe('CREATE');
    const result = await persistResearchImport(fixture, prepared.plan, prepared.resolvedEvidence);

    expect(result.action).toBe('CREATE');
    const attraction = await database.attraction.findUnique({
      where: { id: result.attractionId! },
      include: { localizations: true, sourceRecords: true, factProvenances: true },
    });
    expect(attraction).toMatchObject({ id: result.attractionId, status: 'DRAFT' });
    expect(attraction?.localizations).toHaveLength(2);
    expect(attraction?.sourceRecords.length).toBeGreaterThan(0);
    expect(attraction?.factProvenances.length).toBeGreaterThan(0);
  });

  it('holds published duplicates and creates proposals without changing the attraction', async () => {
    const first = await prepareResearchImport(fixture);
    const created = await persistResearchImport(fixture, first.plan, first.resolvedEvidence);
    await database.attraction.update({
      where: { id: created.attractionId! },
      data: { status: 'PUBLISHED' },
    });

    const prepared = await prepareResearchImport(fixture);
    expect(prepared.plan.action).toBe('HOLD');
    const result = await persistResearchImport(fixture, prepared.plan, prepared.resolvedEvidence);
    const [attraction, proposals] = await Promise.all([
      database.attraction.findUnique({
        where: { id: created.attractionId! },
        select: { status: true },
      }),
      database.changeProposal.findMany({
        where: { attractionId: created.attractionId!, status: 'PENDING' },
      }),
    ]);

    expect(result.action).toBe('HOLD');
    expect(attraction?.status).toBe('PUBLISHED');
    expect(proposals.length).toBeGreaterThan(0);
  });

  it('rejects evidence when its source origin is not approved', async () => {
    await database.sourceOrigin.update({
      where: {
        originUrl_sourceType: { originUrl: 'https://example.com', sourceType: 'OFFICIAL_WEBSITE' },
      },
      data: { approvalState: 'PENDING' },
    });
    await expect(prepareResearchImport(fixture)).rejects.toBeInstanceOf(
      SourceOriginNotApprovedError,
    );
    await database.sourceOrigin.update({
      where: {
        originUrl_sourceType: { originUrl: 'https://example.com', sourceType: 'OFFICIAL_WEBSITE' },
      },
      data: { approvalState: 'APPROVED' },
    });
  });
});
