import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';
import { URL } from 'node:url';

const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

if (!shadowDatabaseUrl) {
  throw new Error('SHADOW_DATABASE_URL is required for prisma migrate diff.');
}

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const { Client } = require('pg');

const shadowDatabase = new URL(shadowDatabaseUrl);
const shadowDatabaseName = decodeURIComponent(shadowDatabase.pathname.slice(1));
if (!/^[A-Za-z0-9_]+$/.test(shadowDatabaseName)) {
  throw new Error('SHADOW_DATABASE_URL must contain a simple PostgreSQL database name.');
}

shadowDatabase.pathname = '/postgres';
shadowDatabase.search = '';
const adminClient = new Client({ connectionString: shadowDatabase.toString() });

try {
  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE "${shadowDatabaseName}"`);
} catch (error) {
  if (error.code !== '42P04') {
    throw error;
  }
} finally {
  await adminClient.end();
}

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
