# Phase 4: Integration & Migration

**Owner**: Window 1
**Duration**: ~20 min
**Depends on**: Phases 1-3 complete
**Purpose**: Data migration, build verification

---

## Overview

Complete implementation with data migration scripts and build verification.

---

## Task 4.1: Lock Field Migration Script (8 min)

### File: `scripts/migrate-lock-tiers.ts` (NEW)

Migrate existing `isLocked` records to new 3-tier system.

```typescript
/**
 * Migration: Convert isLocked boolean to 3-tier lock system
 *
 * Strategy:
 * - isLocked=true → lockKT=true (map to tier 1)
 * - Preserve lockedAt and lockedBy metadata
 *
 * Usage: npx ts-node scripts/migrate-lock-tiers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 100;

async function migrateOperatorLocks() {
  console.log('Migrating Operator lock fields...');

  const total = await prisma.operator.count({
    where: { isLocked: true, lockKT: false },
  });
  console.log(`Found ${total} locked operators to migrate`);

  if (total === 0) {
    console.log('No operators to migrate');
    return;
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
          },
        })
      )
    );

    processed += operators.length;
    cursor = operators[operators.length - 1].id;
    console.log(`Migrated ${processed}/${total} operators`);
  }

  console.log('Operator lock migration complete');
}

async function migrateRevenueLocks() {
  console.log('Migrating Revenue lock fields...');

  const total = await prisma.revenue.count({
    where: { isLocked: true, lockKT: false },
  });
  console.log(`Found ${total} locked revenues to migrate`);

  if (total === 0) {
    console.log('No revenues to migrate');
    return;
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
}

async function main() {
  console.log('Starting lock tier migration...\n');

  try {
    await migrateOperatorLocks();
    console.log();
    await migrateRevenueLocks();

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

---

## Task 4.2: ServiceId Backfill Script (8 min)

### File: `scripts/backfill-service-ids.ts` (NEW)

Generate serviceId for existing operators.

```typescript
/**
 * Backfill: Generate serviceId for existing operators
 *
 * Format: {bookingCode}-{createdAt timestamp}
 *
 * Usage: npx ts-node scripts/backfill-service-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function formatTimestamp(date: Date): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds()) +
    pad(date.getMilliseconds(), 3)
  );
}

async function backfillServiceIds() {
  console.log('Backfilling Operator Service IDs...');

  const total = await prisma.operator.count({
    where: { serviceId: null },
  });
  console.log(`Found ${total} operators without serviceId`);

  if (total === 0) return;

  let processed = 0;
  let skipped = 0;

  const operators = await prisma.operator.findMany({
    where: { serviceId: null },
    select: {
      id: true,
      createdAt: true,
      request: {
        select: { bookingCode: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const op of operators) {
    if (!op.request?.bookingCode) {
      console.log(`Skipping operator ${op.id} - no booking code`);
      skipped++;
      continue;
    }

    const serviceId = `${op.request.bookingCode}-${formatTimestamp(op.createdAt)}`;

    try {
      await prisma.operator.update({
        where: { id: op.id },
        data: { serviceId },
      });

      processed++;
      if (processed % 100 === 0) {
        console.log(`Processed ${processed}/${total} operators`);
      }
    } catch (error) {
      // Handle unique constraint violations (duplicate timestamp)
      console.error(`Failed to update operator ${op.id}:`, error);
    }
  }

  console.log(`Backfilled ${processed} service IDs, skipped ${skipped}`);
}

async function main() {
  console.log('Starting serviceId backfill...\n');

  try {
    await backfillServiceIds();
    console.log('\nBackfill completed successfully!');
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

---

## Task 4.3: Build Verification (4 min)

Run verification commands in order:

```bash
# 1. Generate Prisma types
npx prisma generate

# 2. TypeScript check
npx tsc --noEmit

# 3. Lint check
npm run lint

# 4. Build check
npm run build
```

### Common Issues & Fixes

**Issue: Missing lock tier fields on Prisma types**
```bash
# Fix: Regenerate types
npx prisma generate
```

**Issue: Import errors for lock-utils or lock-config**
```bash
# Fix: Check file paths and exports
# Ensure src/lib/lock-utils.ts exports LockTier type
# Ensure src/config/lock-config.ts exports constants
```

**Issue: Type mismatch on Operator/Revenue interfaces**
```typescript
// Fix: Update src/types/index.ts to include all lock tier fields
// Ensure both boolean and Date|null fields are present
```

---

## Task 4.4: Run Migration Scripts

After build passes:

```bash
# 1. Migrate existing locks to tier 1
npx ts-node scripts/migrate-lock-tiers.ts

# 2. Backfill service IDs
npx ts-node scripts/backfill-service-ids.ts
```

---

## Verification Checklist

- [ ] Schema pushed with no errors
- [ ] Prisma types regenerated
- [ ] TypeScript check passes (no errors)
- [ ] Lint passes
- [ ] Build passes
- [ ] Lock migration script runs
- [ ] ServiceId backfill script runs
- [ ] Existing locked records now have lockKT=true
- [ ] Operators with bookingCode have serviceId

---

## Post-Implementation Testing

### Manual Tests

```
□ Operator Lock Flow
  □ Lock KT tier (as ACCOUNTANT)
  □ Lock Admin tier (as ADMIN) - verify KT required first
  □ Lock Final tier (as ADMIN) - verify Admin required first
  □ Unlock Final tier (as ADMIN)
  □ Unlock Admin tier (as ADMIN) - verify Final unlocked first
  □ Unlock KT tier (as ADMIN/ACCOUNTANT)

□ Revenue Lock Flow
  □ Lock KT tier (as ACCOUNTANT)
  □ Lock/unlock flow same as operator
  □ History entries visible in panel

□ UI Components
  □ Lock tier badge shows correct colors
  □ Lock dialog tier selector works
  □ History panel displays tier actions
```

---

## Rollback Plan

If issues occur:

1. **Code revert**: Git revert to pre-implementation commit
2. **Data rollback**: Existing `isLocked` field preserved, can continue using single-tier
3. **Schema rollback**: Remove new fields with `prisma db push` (data loss warning)

---

## Next Steps After Implementation

1. Monitor error logs for lock/unlock failures
2. Verify history entries being created
3. Consider removing legacy `isLocked` field in future release
4. Update API documentation
