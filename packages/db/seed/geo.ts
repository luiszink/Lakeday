import { PrismaClient } from '@prisma/client';
import process from 'node:process';

import { seedGeoData } from '../src/geo-seed.js';
import { seedHolidayCalendars } from './holidays.js';
import { seedLicences } from './licences.js';
import { seedVocabularies } from './vocabularies.js';

const argumentsAfterCommand = process.argv.slice(2);
const seedGroup = argumentsAfterCommand.length === 0 ? undefined : argumentsAfterCommand[1];
if (
  argumentsAfterCommand.length > 0 &&
  (argumentsAfterCommand.length !== 2 ||
    argumentsAfterCommand[0] !== '--only' ||
    !['geo', 'vocabularies', 'holidays', 'licences'].includes(seedGroup!))
) {
  throw new Error('Supported seed groups: geo, vocabularies, holidays, licences.');
}

const client = new PrismaClient();

try {
  if (!seedGroup || seedGroup === 'geo') await seedGeoData(client);
  if (!seedGroup || seedGroup === 'vocabularies') await seedVocabularies(client);
  if (!seedGroup || seedGroup === 'holidays') await seedHolidayCalendars(client);
  if (!seedGroup || seedGroup === 'licences') await seedLicences(client);
} finally {
  await client.$disconnect();
}
