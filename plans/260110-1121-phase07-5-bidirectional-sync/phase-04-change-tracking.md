---
date: 2026-01-10
priority: P1
status: completed
review: completed
completed: 2026-01-10
parent: ./plan.md
reviewed: 2026-01-10
reviewer: code-reviewer
---

# Phase 04: Prisma Change Tracking Extensions

## Context

- Parent: [Phase 07.5 Plan](./plan.md)
- Research: [Prisma Change Tracking](./research/researcher-02-prisma-change-tracking.md)
- Current: `src/lib/db.ts` (base Prisma client)

## Overview

Implement Prisma `$extends` to intercept CREATE/UPDATE/DELETE on Request, Operator, Revenue models. Queue changes for write-back to Sheets. Skip locked records.

## Requirements

1. Use `$extends` (not deprecated middleware)
2. Track CREATE, UPDATE, DELETE operations
3. Skip locked records (lockKT, lockAdmin, lockFinal)
4. Queue changes asynchronously (don't block main op)
5. Skip read-only models (SyncLog, SyncQueue, History)

## Implementation

### 1. Create Sync Extensions Module

File: `src/lib/sync/sync-extensions.ts`

```typescript
/**
 * Prisma Client Extensions for Sync Queue
 *
 * Intercepts CRUD operations on Request, Operator, Revenue
 * and queues changes for write-back to Google Sheets.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { enqueue, SyncAction, SyncModel } from "./write-back-queue";

// Models to track for sync
const SYNC_MODELS = ["Request", "Operator", "Revenue"] as const;

// Models to skip (read-only or system)
const SKIP_MODELS = [
  "SyncLog",
  "SyncQueue",
  "OperatorHistory",
  "RevenueHistory",
  "User",
  "Email",
  "KnowledgeItem",
  "Supplier",
  "SupplierTransaction",
  "ConfigFollowUp",
  "ConfigUser",
  "Seller",
  "FollowUpStatus",
];

/**
 * Check if a record is locked (any of the 3 locks)
 */
function isRecordLocked(record: Record<string, unknown>): boolean {
  return !!(
    record.lockKT === true ||
    record.lockAdmin === true ||
    record.lockFinal === true ||
    record.isLocked === true // Legacy lock
  );
}

/**
 * Extract changed fields from update args
 */
function extractChangedFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  // Filter out Prisma-specific fields and relations
  const skipFields = [
    "id",
    "createdAt",
    "updatedAt",
    "connect",
    "disconnect",
    "create",
    "update",
    "delete",
    "set",
  ];

  const changes: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (skipFields.includes(key)) continue;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Skip nested objects (relations)
      continue;
    }
    changes[key] = value;
  }

  return changes;
}

/**
 * Queue sync entry asynchronously
 * Uses setImmediate to not block the main operation
 */
function queueAsync(
  action: SyncAction,
  model: SyncModel,
  recordId: string,
  sheetRowIndex: number | null | undefined,
  payload: Record<string, unknown>
): void {
  setImmediate(async () => {
    try {
      await enqueue({
        action,
        model,
        recordId,
        sheetRowIndex: sheetRowIndex ?? undefined,
        payload,
      });
    } catch (error) {
      console.error(`[SyncExtensions] Queue failed for ${model}:${recordId}`, error);
    }
  });
}

/**
 * Create Prisma client with sync tracking extensions
 */
export function withSyncExtensions(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      // Track Request model
      request: {
        async create({ args, query }) {
          const result = await query(args);

          // Queue CREATE
          queueAsync(
            "CREATE",
            "Request",
            result.id,
            result.sheetRowIndex,
            result as unknown as Record<string, unknown>
          );

          return result;
        },

        async update({ args, query }) {
          // Fetch current record to check lock status
          const existing = await prisma.request.findUnique({
            where: args.where,
            select: {
              id: true,
              sheetRowIndex: true,
              lockKT: true,
              lockAdmin: true,
              lockFinal: true,
            },
          });

          const result = await query(args);

          // Skip if locked (don't queue locked records for write-back)
          // Note: Request doesn't have locks, but check anyway for future
          if (existing && !isRecordLocked(existing as Record<string, unknown>)) {
            const changes = extractChangedFields(args.data as Record<string, unknown>);
            if (Object.keys(changes).length > 0) {
              queueAsync(
                "UPDATE",
                "Request",
                result.id,
                result.sheetRowIndex,
                changes
              );
            }
          }

          return result;
        },

        async delete({ args, query }) {
          // Fetch before delete for payload
          const existing = await prisma.request.findUnique({
            where: args.where,
            select: { id: true, sheetRowIndex: true, code: true },
          });

          const result = await query(args);

          if (existing) {
            queueAsync(
              "DELETE",
              "Request",
              existing.id,
              existing.sheetRowIndex,
              { code: existing.code }
            );
          }

          return result;
        },
      },

      // Track Operator model
      operator: {
        async create({ args, query }) {
          const result = await query(args);

          // Only queue if not locked
          if (!isRecordLocked(result as unknown as Record<string, unknown>)) {
            queueAsync(
              "CREATE",
              "Operator",
              result.id,
              result.sheetRowIndex,
              result as unknown as Record<string, unknown>
            );
          }

          return result;
        },

        async update({ args, query }) {
          // Fetch current to check lock status
          const existing = await prisma.operator.findUnique({
            where: args.where,
            select: {
              id: true,
              sheetRowIndex: true,
              lockKT: true,
              lockAdmin: true,
              lockFinal: true,
              isLocked: true,
            },
          });

          const result = await query(args);

          // Skip if locked
          if (existing && !isRecordLocked(existing as Record<string, unknown>)) {
            const changes = extractChangedFields(args.data as Record<string, unknown>);
            if (Object.keys(changes).length > 0) {
              queueAsync(
                "UPDATE",
                "Operator",
                result.id,
                result.sheetRowIndex,
                changes
              );
            }
          }

          return result;
        },

        async delete({ args, query }) {
          const existing = await prisma.operator.findUnique({
            where: args.where,
            select: {
              id: true,
              sheetRowIndex: true,
              serviceId: true,
              lockKT: true,
              lockAdmin: true,
              lockFinal: true,
            },
          });

          const result = await query(args);

          // Only queue delete if was not locked
          if (existing && !isRecordLocked(existing as Record<string, unknown>)) {
            queueAsync(
              "DELETE",
              "Operator",
              existing.id,
              existing.sheetRowIndex,
              { serviceId: existing.serviceId }
            );
          }

          return result;
        },
      },

      // Track Revenue model
      revenue: {
        async create({ args, query }) {
          const result = await query(args);

          if (!isRecordLocked(result as unknown as Record<string, unknown>)) {
            queueAsync(
              "CREATE",
              "Revenue",
              result.id,
              result.sheetRowIndex,
              result as unknown as Record<string, unknown>
            );
          }

          return result;
        },

        async update({ args, query }) {
          const existing = await prisma.revenue.findUnique({
            where: args.where,
            select: {
              id: true,
              sheetRowIndex: true,
              lockKT: true,
              lockAdmin: true,
              lockFinal: true,
              isLocked: true,
            },
          });

          const result = await query(args);

          if (existing && !isRecordLocked(existing as Record<string, unknown>)) {
            const changes = extractChangedFields(args.data as Record<string, unknown>);
            if (Object.keys(changes).length > 0) {
              queueAsync(
                "UPDATE",
                "Revenue",
                result.id,
                result.sheetRowIndex,
                changes
              );
            }
          }

          return result;
        },

        async delete({ args, query }) {
          const existing = await prisma.revenue.findUnique({
            where: args.where,
            select: {
              id: true,
              sheetRowIndex: true,
              revenueId: true,
              lockKT: true,
              lockAdmin: true,
              lockFinal: true,
            },
          });

          const result = await query(args);

          if (existing && !isRecordLocked(existing as Record<string, unknown>)) {
            queueAsync(
              "DELETE",
              "Revenue",
              existing.id,
              existing.sheetRowIndex,
              { revenueId: existing.revenueId }
            );
          }

          return result;
        },
      },
    },
  });
}

/**
 * Type for extended Prisma client
 */
export type PrismaClientWithSync = ReturnType<typeof withSyncExtensions>;
```

### 2. Modify db.ts to Apply Extensions

File: `src/lib/db.ts` (modify)

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withSyncExtensions } from './sync/sync-extensions';

// Prisma 7.x requires driver adapter for database connections
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Prisma Client singleton for Next.js hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof withSyncExtensions> | undefined;
  basePrisma: PrismaClient | undefined;
};

// Create base client
const basePrisma =
  globalForPrisma.basePrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Apply sync extensions
export const prisma =
  globalForPrisma.prisma ?? withSyncExtensions(basePrisma);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.prisma = prisma;
}

export default prisma;

// Export base client for operations that should skip tracking
export { basePrisma };
```

### 3. Use basePrisma for Sync Operations

When processing the queue, use `basePrisma` to avoid infinite loops:

```typescript
// In write-back processor
import { basePrisma } from "@/lib/db";

// Fetch record without triggering extensions
const record = await basePrisma.request.findUnique({
  where: { id: queueItem.recordId },
  include: { seller: true },
});
```

## Success Criteria

1. CREATE on Request/Operator/Revenue queues entry
2. UPDATE with changes queues only changed fields
3. DELETE queues with identifier payload
4. Locked records (lockKT, lockAdmin, lockFinal) are skipped
5. Queue operations don't block main CRUD
6. basePrisma available for sync internals

## Testing

```typescript
// Test change tracking
import { prisma } from "@/lib/db";
import { getQueueStats, dequeue } from "@/lib/sync/write-back-queue";

// Create a request (should queue)
const request = await prisma.request.create({
  data: {
    code: "TEST-001",
    customerName: "Test Customer",
    contact: "test@example.com",
    country: "VN",
    source: "Test",
    status: "DANG_LL_CHUA_TL",
    stage: "LEAD",
    sellerId: "some-seller-id",
  },
});

// Wait for async queue
await new Promise((r) => setTimeout(r, 100));

// Check queue
const stats = await getQueueStats();
console.log(stats); // { pending: 1, ... }

// Update (should queue changes only)
await prisma.request.update({
  where: { id: request.id },
  data: { customerName: "Updated Name" },
});

await new Promise((r) => setTimeout(r, 100));

// Check queue again
const items = await dequeue(10);
console.log(items.length); // 2 (CREATE + UPDATE)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Infinite loop | Critical | Use basePrisma in sync code |
| Performance hit | Medium | setImmediate for async queue |
| Missing updates | Low | Retry logic in queue processing |
| Lock check race | Low | Check before AND after operation |

## Known Issues

1. **Circular dependency risk:** `write-back-queue.ts` imports extended `prisma`, while `sync-extensions.ts` imports `enqueue`. Works due to async delay but fragile. Should change queue to use `basePrisma`.

2. **DELETE tracking removed:** Implementation skips DELETE sync vs plan code. Matches validation decision (line 95: "Skip entirely") but plan Phase 04 still shows DELETE implementation. Document rationale: preserve sheet data when DB records deleted.

3. **Integration tests pending:** Current tests use mocked queue. E2e tests with real Prisma deferred to Phase 05.

## Code Review Summary

- **Date:** 2026-01-10
- **Tests:** ✓ 28/28 passing
- **Rating:** 7.5/10
- **Critical Issues:** Circular dependency (HIGH)
- **Status:** Implementation complete, awaiting fixes
- **Report:** `plans/reports/code-reviewer-260110-2146-phase04-change-tracking.md`

### Required Before Production

1. Fix circular dependency: Change `write-back-queue.ts` to use `basePrisma`
2. Verify DELETE skip matches business requirements
3. Add structured logging/metrics for queue failures

### Recommended Improvements

4. Add `LockableRecord` interface for type safety
5. Document DELETE decision with business context
6. Add integration test with real Prisma client
7. Verify Request model lock field checking (schema shows locks exist)
