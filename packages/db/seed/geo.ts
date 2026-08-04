import { PrismaClient } from '@prisma/client';
import process from 'node:process';

import { seedGeoData } from '../src/geo-seed.js';

const argumentsAfterCommand = process.argv.slice(2);
if (
  argumentsAfterCommand.length > 0 &&
  (argumentsAfterCommand.length !== 2 ||
    argumentsAfterCommand[0] !== '--only' ||
    argumentsAfterCommand[1] !== 'geo')
) {
  throw new Error('Only `--only geo` is supported until additional seed groups exist.');
}

const client = new PrismaClient();

try {
  await seedGeoData(client);
} finally {
  await client.$disconnect();
}
