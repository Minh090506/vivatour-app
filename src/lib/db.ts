import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withSyncExtensions, PrismaClientWithSync } from './sync/sync-extensions';

// Prisma 7.x requires driver adapter for database connections
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Prisma Client singleton for Next.js hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithSync | undefined;
  basePrisma: PrismaClient | undefined;
};

// Create base Prisma client (without sync extensions)
const createBasePrisma = () =>
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

/**
 * Base Prisma client without sync extensions.
 * Use for sync operations to avoid infinite loops.
 */
export const basePrisma = globalForPrisma.basePrisma ?? createBasePrisma();

/**
 * Extended Prisma client with sync tracking.
 * Automatically queues changes for write-back to Google Sheets.
 */
export const prisma = globalForPrisma.prisma ?? withSyncExtensions(basePrisma);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.prisma = prisma;
}

export default prisma;
