import { PrismaClient } from '@lake/db';

const globalForDatabase = globalThis as typeof globalThis & {
  lakePrisma?: PrismaClient;
};

export const database = globalForDatabase.lakePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.lakePrisma = database;
}
