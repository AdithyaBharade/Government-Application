import { PrismaClient } from '@prisma/client';

/**
 * Interactive transactions run each query as a separate round trip. Against a remote (Neon, US-East)
 * database through the pooler that is ~1 s per query from India, so a workflow action with 6–8
 * queries blows past Prisma's 5 s default and is rolled back with a 500. Give them room.
 */
export const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10_000, timeout: 30_000 },
});
