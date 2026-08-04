import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { seedGeoData } from '../src/geo-seed.js';
import { seedHolidayCalendars } from './holidays.js';
import { seedLicences } from './licences.js';
import { seedReviewProposals, reviewFixtureProposalIds } from './review.js';
import { seedVocabularies } from './vocabularies.js';
import { seedFixtures } from './fixtures/loader.js';

config({ path: '../../.env' });

const databaseUrl = process.env.DATABASE_URL;
const client = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const describeDatabase = databaseUrl ? describe : describe.skip;

afterAll(async () => {
  await client?.$disconnect();
});

describeDatabase('review proposal fixtures', () => {
  it('seeds six idempotent proposals across origins, fact classes, and merge review', async () => {
    await seedGeoData(client!);
    await seedVocabularies(client!);
    await seedLicences(client!);
    await seedHolidayCalendars(client!);
    await seedFixtures(client!);
    await seedReviewProposals(client!);
    await seedReviewProposals(client!);

    const proposals = await client!.changeProposal.findMany({
      where: { id: { in: reviewFixtureProposalIds } },
    });
    expect(proposals).toHaveLength(6);
    expect(new Set(proposals.map((proposal) => proposal.origin)).size).toBe(3);
    expect(new Set(proposals.map((proposal) => proposal.factKey)).size).toBe(6);
    expect(proposals.every((proposal) => proposal.status === 'PENDING')).toBe(true);
  });
});
