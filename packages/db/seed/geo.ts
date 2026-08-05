import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { seedGeoData } from '../src/geo-seed.js';
import { seedFixtures } from './fixtures/loader.js';
import { seedHolidayCalendars } from './holidays.js';
import { seedLicences } from './licences.js';
import { seedReviewProposals } from './review.js';
import { seedVocabularies } from './vocabularies.js';
import { seedAdminUser } from './admin.js';

const workspaceEnv = (name: string) => fileURLToPath(new URL(`../../../${name}`, import.meta.url));
config({ path: workspaceEnv('.env') });
config({ path: workspaceEnv('.env.local'), override: true });

const argumentsAfterCommand = process.argv.slice(2);
const seedGroup = argumentsAfterCommand.length === 0 ? undefined : argumentsAfterCommand[1];
if (
  argumentsAfterCommand.length > 0 &&
  (argumentsAfterCommand.length !== 2 ||
    argumentsAfterCommand[0] !== '--only' ||
    !['admin', 'geo', 'vocabularies', 'holidays', 'licences', 'fixtures', 'review'].includes(
      seedGroup!,
    ))
) {
  throw new Error(
    'Supported seed groups: admin, geo, vocabularies, holidays, licences, fixtures, review.',
  );
}

const client = new PrismaClient();

try {
  if (!seedGroup || seedGroup === 'admin') await seedAdminUser(client);
  if (!seedGroup || seedGroup === 'geo') await seedGeoData(client);
  if (!seedGroup || seedGroup === 'vocabularies') await seedVocabularies(client);
  if (!seedGroup || seedGroup === 'holidays') await seedHolidayCalendars(client);
  if (!seedGroup || seedGroup === 'licences') await seedLicences(client);
  if (!seedGroup || seedGroup === 'fixtures') await seedFixtures(client);
  if (!seedGroup || seedGroup === 'review') await seedReviewProposals(client);
} finally {
  await client.$disconnect();
}
