# Phase 4: Integration & Migration

**Owner**: Window 1
**Duration**: ~1 hour
**Depends on**: Phases 1-3 complete
**Purpose**: Final integration, data migration, testing

---

## Overview

Complete the implementation with data migration scripts, Google Sheets sync preservation, and end-to-end testing.

---

## Task 4.1: Lock Field Migration Script (20 min)

### File: `scripts/migrate-lock-tiers.ts` (NEW)

Migrate existing `isLocked` records to new 3-tier system.

```typescript
/**
 * Migration: Convert isLocked boolean to 3-tier lock system
 *
 * Strategy:
 * - isLocked=true → lockKT=true (map to tier 1)
 * - Preserve lockedAt and lockedBy metadata
 * - Run in batches to avoid memory issues
 *
 * Usage: npx ts-node scripts/migrate-lock-tiers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 100;

async function migrateOperatorLocks() {
  console.log('Migrating Operator lock fields...');

  // Count total locked operators
  const total = await prisma.operator.count({
    where: { isLocked: true },
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
}

async function migrateRevenueLocks() {
  console.log('Migrating Revenue lock fields...');

  const total = await prisma.revenue.count({
    where: { isLocked: true },
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

## Task 4.2: ID Backfill Script (20 min)

### File: `scripts/backfill-ids.ts` (NEW)

Populate new ID fields for existing records.

```typescript
/**
 * Backfill: Generate IDs for existing records
 *
 * - Request.requestId: Generated from seller + timestamp
 * - Operator.serviceId: Generated from bookingCode + timestamp
 * - Revenue.revenueId: Generated from bookingCode + timestamp + row
 *
 * Usage: npx ts-node scripts/backfill-ids.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  generateRequestId,
  generateServiceId,
  generateRevenueId,
  removeDiacritics,
  formatTimestamp,
} from '../src/lib/id-utils';

const prisma = new PrismaClient();

const BATCH_SIZE = 50;

async function backfillRequestIds() {
  console.log('Backfilling Request IDs...');

  const total = await prisma.request.count({
    where: { requestId: null },
  });
  console.log(`Found ${total} requests without requestId`);

  if (total === 0) return;

  let processed = 0;

  // Get requests with seller info
  const requests = await prisma.request.findMany({
    where: { requestId: null },
    select: {
      id: true,
      createdAt: true,
      seller: {
        select: {
          name: true,
          config: {
            select: { sellerCode: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const req of requests) {
    // Get seller code or generate from name
    const sellerCode =
      req.seller?.config?.sellerCode ||
      (req.seller?.name
        ? removeDiacritics(req.seller.name.charAt(0)).toUpperCase()
        : 'X');

    // Use original creation date for ID to maintain chronology
    const requestId = `${sellerCode}${formatTimestamp(req.createdAt)}`;

    await prisma.request.update({
      where: { id: req.id },
      data: { requestId },
    });

    processed++;
    if (processed % 100 === 0) {
      console.log(`Processed ${processed}/${total} requests`);
    }
  }

  console.log(`Backfilled ${processed} request IDs`);
}

async function backfillServiceIds() {
  console.log('Backfilling Operator Service IDs...');

  const total = await prisma.operator.count({
    where: { serviceId: null },
  });
  console.log(`Found ${total} operators without serviceId`);

  if (total === 0) return;

  let processed = 0;

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
      // Skip operators without booking code
      console.log(`Skipping operator ${op.id} - no booking code`);
      continue;
    }

    const serviceId = `${op.request.bookingCode}-${formatTimestamp(op.createdAt)}`;

    await prisma.operator.update({
      where: { id: op.id },
      data: { serviceId },
    });

    processed++;
    if (processed % 100 === 0) {
      console.log(`Processed ${processed}/${total} operators`);
    }
  }

  console.log(`Backfilled ${processed} service IDs`);
}

async function backfillRevenueIds() {
  console.log('Backfilling Revenue IDs...');

  const total = await prisma.revenue.count({
    where: { revenueId: null },
  });
  console.log(`Found ${total} revenues without revenueId`);

  if (total === 0) return;

  let processed = 0;

  // Group by request to handle row numbers
  const requests = await prisma.request.findMany({
    where: {
      revenues: {
        some: { revenueId: null },
      },
    },
    select: {
      id: true,
      bookingCode: true,
      revenues: {
        where: { revenueId: null },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  for (const req of requests) {
    if (!req.bookingCode) {
      console.log(`Skipping request ${req.id} revenues - no booking code`);
      continue;
    }

    let rowNum = 1;
    for (const rev of req.revenues) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateTime =
        rev.createdAt.getFullYear().toString() +
        pad(rev.createdAt.getMonth() + 1) +
        pad(rev.createdAt.getDate()) +
        pad(rev.createdAt.getHours()) +
        pad(rev.createdAt.getMinutes()) +
        pad(rev.createdAt.getSeconds());

      const revenueId = `${req.bookingCode}-${dateTime}-${rowNum}`;

      await prisma.revenue.update({
        where: { id: rev.id },
        data: { revenueId },
      });

      rowNum++;
      processed++;
    }

    if (processed % 100 === 0) {
      console.log(`Processed ${processed}/${total} revenues`);
    }
  }

  console.log(`Backfilled ${processed} revenue IDs`);
}

async function main() {
  console.log('Starting ID backfill...\n');

  try {
    await backfillRequestIds();
    console.log();
    await backfillServiceIds();
    console.log();
    await backfillRevenueIds();

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

## Task 4.3: Verify Google Sheets Sync (10 min)

### Check: `src/lib/sheet-mappers.ts`

Ensure `Request.code` is preserved as sync key.

```typescript
// Verify mapRequestRow function (around line 250-270)
// code field should still be mapped from Sheet column AR

return {
  code: requestId.trim(),           // ← Must remain as unique sync key
  bookingCode: bookingCode?.trim() || null,
  // requestId is NOT mapped from sheets - generated in-app
  // ... rest of fields
};
```

**No changes needed** - sync uses `code` field which stays separate from new `requestId`.

---

## Task 4.4: Type Updates (10 min)

### File: `src/types/index.ts`

Add types for new lock fields.

```typescript
// Add/update Operator type
export interface Operator {
  id: string;
  // ... existing fields ...

  // 3-tier lock fields
  lockKT: boolean;
  lockKTAt: Date | null;
  lockKTBy: string | null;
  lockAdmin: boolean;
  lockAdminAt: Date | null;
  lockAdminBy: string | null;
  lockFinal: boolean;
  lockFinalAt: Date | null;
  lockFinalBy: string | null;

  // New ID field
  serviceId: string | null;

  // Legacy (deprecated, kept for migration)
  isLocked?: boolean;
  lockedAt?: Date | null;
  lockedBy?: string | null;
}

// Add/update Revenue type
export interface Revenue {
  id: string;
  // ... existing fields ...

  // 3-tier lock fields
  lockKT: boolean;
  lockKTAt: Date | null;
  lockKTBy: string | null;
  lockAdmin: boolean;
  lockAdminAt: Date | null;
  lockAdminBy: string | null;
  lockFinal: boolean;
  lockFinalAt: Date | null;
  lockFinalBy: string | null;

  // Legacy (deprecated)
  isLocked?: boolean;
  lockedAt?: Date | null;
  lockedBy?: string | null;
}

// Add RevenueHistory type
export interface RevenueHistory {
  id: string;
  revenueId: string;
  action: string;
  changes: Record<string, unknown>;
  userId: string;
  createdAt: Date;
}

// Add Request type update
export interface Request {
  id: string;
  code: string;        // Sync key
  requestId: string | null;  // Business ID
  bookingCode: string | null;
  // ... rest
}
```

---

## Task 4.5: E2E Testing Checklist (Manual)

### Lock System Tests

```
□ Operator Lock Flow
  □ Lock KT tier (as ACCOUNTANT)
  □ Lock Admin tier (as ADMIN) - verify KT required first
  □ Lock Final tier (as ADMIN) - verify Admin required first
  □ Unlock Final tier (as ADMIN)
  □ Unlock Admin tier (as ADMIN) - verify Final unlocked first
  □ Unlock KT tier (as ADMIN/ACCOUNTANT)
  □ Permission denied for SELLER/OPERATOR to lock

□ Revenue Lock Flow
  □ Lock KT tier (as ACCOUNTANT)
  □ Lock Admin tier (as ADMIN)
  □ Lock Final tier (as ADMIN)
  □ Unlock in reverse order
  □ History entries created for each action

□ Batch Lock Period
  □ Preview shows correct count per tier
  □ Apply locks correct tier to all operators
  □ Skips already-locked records at that tier
  □ History entries created for all

□ Edit Blocking
  □ Cannot edit operator with any lock tier
  □ Cannot edit revenue with any lock tier
  □ Cannot delete locked records
```

### ID Generation Tests

```
□ Request
  □ requestId generated on create
  □ Format: {SellerCode}{yyyyMMddHHmmssSSS}
  □ Unique constraint enforced

□ Operator
  □ serviceId generated on create (if bookingCode exists)
  □ Format: {bookingCode}-{yyyyMMddHHmmssSSS}
  □ Unique constraint enforced

□ Revenue
  □ revenueId generated on create (if bookingCode exists)
  □ Format: {bookingCode}-{yyyyMMddHHmmss}-{row}
  □ Sequential row numbers within same booking
```

### UI Tests

```
□ Lock Tier Badge
  □ Shows all 3 tiers when showAll=true
  □ Shows only active tiers otherwise
  □ Correct colors per tier
  □ Tooltip shows timestamp

□ Lock Dialog
  □ Tier selector works
  □ Preview shows correct count
  □ Confirm applies lock
  □ Error handling for failures

□ History Panel
  □ Shows tier-specific actions
  □ Shows batch indicator
  □ Scrollable for long lists
```

---

## Task 4.6: Build Verification

```bash
# Run these commands in order
npm run build          # Full production build
npm run lint           # Code quality check
npx prisma generate    # Regenerate types

# If all pass, run migrations
npx ts-node scripts/migrate-lock-tiers.ts
npx ts-node scripts/backfill-ids.ts
```

---

## Verification Checklist

- [ ] Migration script runs without errors
- [ ] Backfill script runs without errors
- [ ] Existing locks migrated to lockKT
- [ ] New IDs generated for existing records
- [ ] Google Sheets sync still works
- [ ] Build passes with no errors
- [ ] Lint passes
- [ ] Manual E2E tests pass

---

## Rollback Plan

If issues occur after deployment:

1. **Schema rollback not recommended** - data may be lost
2. **Feature flag approach**:
   - Add `USE_3_TIER_LOCK` env variable
   - Conditionally use old isLocked or new tier fields
3. **Code revert**: Git revert to pre-implementation commit
4. **Data restore**: Backup database before migration

---

## Post-Implementation

1. Monitor error logs for lock/unlock failures
2. Check history entries are being created
3. Verify batch operations complete fully
4. Remove deprecated `isLocked` field in future release
5. Update API documentation with new endpoints
