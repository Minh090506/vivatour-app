/**
 * Migration: Convert isLocked boolean to 3-tier lock system
 *
 * Strategy:
 * - isLocked=true + lockKT=false → lockKT=true (map to tier 1)
 * - Preserve lockedAt and lockedBy metadata
 * - Run in batches to avoid memory issues
 *
 * Usage: npx ts-node scripts/migrate-lock-tiers.ts
 */

import { prisma } from '../src/lib/db';

const BATCH_SIZE = 100;

async function migrateOperatorLocks() {
  console.log('Migrating Operator lock fields...');

  // Count total locked operators that need migration
  const total = await prisma.operator.count({
    where: {
      isLocked: true,
      lockKT: false,
    },
  });
  console.log(`Found ${total} locked operators to migrate`);

  if (total === 0) {
    console.log('No operators to migrate');
    return { migrated: 0, total: 0 };
  }

  let processed = 0;
  let cursor: string | undefined;

  while (processed < total) {
    const operators = await prisma.operator.findMany({
      where: { isLocked: true, lockKT: false },
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: {
        id: true,
        isLocked: true,
        lockedAt: true,
        lockedBy: true,
      },
      orderBy: { id: 'asc' },
    });

    if (operators.length === 0) break;

    // Update in transaction
    await prisma.$transaction(
      operators.map((op) =>
        prisma.operator.update({
          where: { id: op.id },
          data: {
            lockKT: true,
            lockKTAt: op.lockedAt,
            lockKTBy: op.lockedBy,
            // Keep isLocked for backward compat during transition
          },
        })
      )
    );

    processed += operators.length;
    cursor = operators[operators.length - 1].id;
    console.log(`Migrated ${processed}/${total} operators`);
  }

  console.log('Operator lock migration complete');
  return { migrated: processed, total };
}

async function migrateRevenueLocks() {
  console.log('Migrating Revenue lock fields...');

  const total = await prisma.revenue.count({
    where: {
      isLocked: true,
      lockKT: false,
    },
  });
  console.log(`Found ${total} locked revenues to migrate`);

  if (total === 0) {
    console.log('No revenues to migrate');
    return { migrated: 0, total: 0 };
  }

  let processed = 0;
  let cursor: string | undefined;

  while (processed < total) {
    const revenues = await prisma.revenue.findMany({
      where: { isLocked: true, lockKT: false },
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      select: {
        id: true,
        isLocked: true,
        lockedAt: true,
        lockedBy: true,
      },
      orderBy: { id: 'asc' },
    });

    if (revenues.length === 0) break;

    await prisma.$transaction(
      revenues.map((rev) =>
        prisma.revenue.update({
          where: { id: rev.id },
          data: {
            lockKT: true,
            lockKTAt: rev.lockedAt,
            lockKTBy: rev.lockedBy,
          },
        })
      )
    );

    processed += revenues.length;
    cursor = revenues[revenues.length - 1].id;
    console.log(`Migrated ${processed}/${total} revenues`);
  }

  console.log('Revenue lock migration complete');
  return { migrated: processed, total };
}

async function showStats() {
  console.log('\n=== Migration Stats ===');

  // Operators
  const opTotal = await prisma.operator.count();
  const opLegacyLocked = await prisma.operator.count({ where: { isLocked: true } });
  const opLockKT = await prisma.operator.count({ where: { lockKT: true } });
  const opLockAdmin = await prisma.operator.count({ where: { lockAdmin: true } });
  const opLockFinal = await prisma.operator.count({ where: { lockFinal: true } });

  console.log('Operators:');
  console.log(`  Total: ${opTotal}`);
  console.log(`  isLocked (legacy): ${opLegacyLocked}`);
  console.log(`  lockKT: ${opLockKT}`);
  console.log(`  lockAdmin: ${opLockAdmin}`);
  console.log(`  lockFinal: ${opLockFinal}`);

  // Revenues
  const revTotal = await prisma.revenue.count();
  const revLegacyLocked = await prisma.revenue.count({ where: { isLocked: true } });
  const revLockKT = await prisma.revenue.count({ where: { lockKT: true } });
  const revLockAdmin = await prisma.revenue.count({ where: { lockAdmin: true } });
  const revLockFinal = await prisma.revenue.count({ where: { lockFinal: true } });

  console.log('\nRevenues:');
  console.log(`  Total: ${revTotal}`);
  console.log(`  isLocked (legacy): ${revLegacyLocked}`);
  console.log(`  lockKT: ${revLockKT}`);
  console.log(`  lockAdmin: ${revLockAdmin}`);
  console.log(`  lockFinal: ${revLockFinal}`);
}

async function main() {
  console.log('=== Lock Tier Migration ===\n');
  console.log('Starting lock tier migration...\n');

  try {
    // Show before stats
    await showStats();
    console.log('\n');

    const opResult = await migrateOperatorLocks();
    console.log();
    const revResult = await migrateRevenueLocks();

    // Show after stats
    await showStats();

    console.log('\n=== Summary ===');
    console.log(`Operators migrated: ${opResult.migrated}/${opResult.total}`);
    console.log(`Revenues migrated: ${revResult.migrated}/${revResult.total}`);
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
