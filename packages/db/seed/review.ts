import { createHash } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import { fixtureIds } from './fixtures/data.js';

const reviewFixtures = [
  {
    proposalId: '00000000-0000-4000-8000-000000000301',
    sourceRecordId: '00000000-0000-4000-8000-000000000201',
    fixture: 'fixture-unknown-hours',
    factKey: 'OPENING_HOURS',
    origin: 'SCHEDULED_REFRESH',
    sourceType: 'OFFICIAL_WEBSITE',
    currentValue: { validFrom: '2026-01-01', validTo: '2027-12-31', hoursUnknown: true, rules: [] },
    proposedValue: {
      validFrom: '2026-01-01',
      validTo: '2027-12-31',
      hoursUnknown: false,
      rules: [
        {
          daysOfWeek: ['MON'],
          opens: '09:00',
          closes: '17:00',
          appliesOnPublicHolidays: 'AS_WEEKDAY',
          holidayCalendarCode: 'DE-BW',
        },
      ],
    },
  },
  {
    proposalId: '00000000-0000-4000-8000-000000000302',
    sourceRecordId: '00000000-0000-4000-8000-000000000202',
    fixture: 'fixture-chf-price',
    factKey: 'PRICE',
    origin: 'SCHEDULED_REFRESH',
    sourceType: 'OFFICIAL_WEBSITE',
    currentValue: { audience: 'ADULT', amount: 24, currency: 'CHF' },
    proposedValue: { audience: 'ADULT', amount: 26, currency: 'CHF', confidence: 'HIGH' },
  },
  {
    proposalId: '00000000-0000-4000-8000-000000000303',
    sourceRecordId: '00000000-0000-4000-8000-000000000203',
    fixture: 'fixture-lakeside_beach',
    factKey: 'WHEELCHAIR_ACCESS',
    origin: 'USER_REPORT',
    sourceType: 'OTHER',
    currentValue: 'FULL',
    proposedValue: 'PARTIAL',
  },
  {
    proposalId: '00000000-0000-4000-8000-000000000304',
    sourceRecordId: '00000000-0000-4000-8000-000000000204',
    fixture: 'fixture-near-duplicate-a',
    factKey: 'CONTACT',
    origin: 'RESEARCH_IMPORT',
    sourceType: 'OFFICIAL_WEBSITE',
    currentValue: { field: 'officialWebsite', value: 'https://example.invalid/old', textual: true },
    proposedValue: {
      field: 'officialWebsite',
      value: 'https://example.invalid/new',
      textual: true,
    },
  },
  {
    proposalId: '00000000-0000-4000-8000-000000000305',
    sourceRecordId: '00000000-0000-4000-8000-000000000205',
    fixture: 'fixture-scope-exception',
    factKey: 'CLOSURE',
    origin: 'SCHEDULED_REFRESH',
    sourceType: 'TOURISM_ORG',
    currentValue: null,
    proposedValue: {
      dateFrom: '2026-12-24',
      dateTo: '2026-12-26',
      reason: 'Winter closure',
      confidence: 'HIGH',
    },
  },
  {
    proposalId: '00000000-0000-4000-8000-000000000306',
    sourceRecordId: '00000000-0000-4000-8000-000000000206',
    fixture: 'fixture-near-duplicate-a',
    mergeFromFixture: 'fixture-near-duplicate-b',
    factKey: 'LOCATION',
    origin: 'RESEARCH_IMPORT',
    sourceType: 'OFFICIAL_WEBSITE',
    currentValue: null,
    proposedValue: { reason: 'Synthetic duplicate pair for merge review.' },
  },
] as const;

function contentHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function seedReviewProposals(client: PrismaClient): Promise<void> {
  for (const fixture of reviewFixtures) {
    const attractionId = fixtureIds[fixture.fixture];
    if (!attractionId) throw new Error(`Missing fixture for review proposal: ${fixture.fixture}`);
    const proposedValue = fixture.mergeFromFixture
      ? {
          ...fixture.proposedValue,
          mergeIntoId: attractionId,
          mergeFromId: fixtureIds[fixture.mergeFromFixture],
        }
      : fixture.proposedValue;

    await client.sourceRecord.upsert({
      where: { id: fixture.sourceRecordId },
      create: {
        id: fixture.sourceRecordId,
        attractionId,
        sourceUrl: `https://example.invalid/review/${fixture.proposalId}`,
        sourceType: fixture.sourceType,
        retrievedAt: new Date('2026-08-01T12:00:00.000Z'),
        contentHash: contentHash(proposedValue),
        rawPayload: { fixture: true, proposalId: fixture.proposalId, proposedValue },
      },
      update: {
        attractionId,
        sourceType: fixture.sourceType,
        contentHash: contentHash(proposedValue),
        rawPayload: { fixture: true, proposalId: fixture.proposalId, proposedValue },
      },
    });

    await client.changeProposal.upsert({
      where: { id: fixture.proposalId },
      create: {
        id: fixture.proposalId,
        attractionId,
        factKey: fixture.factKey,
        currentValue: fixture.currentValue,
        proposedValue,
        sourceRecordId: fixture.sourceRecordId,
        confidence: 'HIGH',
        origin: fixture.origin,
        status: 'PENDING',
      },
      update: {
        attractionId,
        factKey: fixture.factKey,
        currentValue: fixture.currentValue,
        proposedValue,
        sourceRecordId: fixture.sourceRecordId,
        confidence: 'HIGH',
        origin: fixture.origin,
        status: 'PENDING',
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
      },
    });
  }
}

export const reviewFixtureProposalIds = reviewFixtures.map(({ proposalId }) => proposalId);
