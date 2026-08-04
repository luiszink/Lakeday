import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

if (!shadowDatabaseUrl) {
  throw new Error('SHADOW_DATABASE_URL is required for prisma migrate diff.');
}

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const result = spawnSync(
  process.execPath,
  [
    prismaCli,
    'migrate',
    'diff',
    '--from-migrations',
    'prisma/migrations',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--shadow-database-url',
    shadowDatabaseUrl,
    '--exit-code',
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
