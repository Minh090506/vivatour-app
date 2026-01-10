---
date: 2026-01-10
priority: P1
status: done
review: approved
reviewed_by: code-reviewer-260110-1317
parent: ./plan.md
---

# Phase 01: Database Queue Model + Utilities

## Context

- Parent: [Phase 07.5 Plan](./plan.md)
- Research: [Prisma Change Tracking](./research/researcher-02-prisma-change-tracking.md)

## Overview

Add SyncQueue model to PostgreSQL for tracking DB changes pending write-back to Sheets. Create queue management utilities (enqueue, dequeue, markComplete, markFailed).

## Requirements

1. SyncQueue model with status tracking
2. Queue utilities for CRUD operations
3. Indexes for efficient processing
4. Cleanup for old completed entries

## Implementation

### 1. Add SyncQueue Model to Schema

File: `prisma/schema.prisma`

```prisma
// ============================================
// SYNC QUEUE (for bidirectional sync)
// ============================================

model SyncQueue {
  id          String    @id @default(cuid())

  // What changed
  action      String    // "CREATE", "UPDATE", "DELETE"
  model       String    // "Request", "Operator", "Revenue"
  recordId    String    // DB record ID
  sheetRowIndex Int?    // Row number in sheet (null for CREATE)

  // Change payload
  payload     Json      // Changed fields: { field: value }

  // Processing state
  status      String    @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED
  retries     Int       @default(0)
  maxRetries  Int       @default(3)
  lastError   String?

  // Timestamps
  createdAt   DateTime  @default(now())
  processedAt DateTime?

  @@index([status, createdAt])
  @@index([model, recordId])
  @@index([status])
  @@map("sync_queue")
}
```

### 2. Run Migration

```bash
npx prisma migrate dev --name add_sync_queue
```

### 3. Create Queue Utilities

File: `src/lib/sync/write-back-queue.ts`

```typescript
/**
 * SyncQueue Management Utilities
 *
 * Handles enqueue, dequeue, status updates for write-back queue.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type SyncAction = "CREATE" | "UPDATE" | "DELETE";
export type QueueStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type SyncModel = "Request" | "Operator" | "Revenue";

export interface EnqueueParams {
  action: SyncAction;
  model: SyncModel;
  recordId: string;
  sheetRowIndex?: number | null;
  payload: Record<string, unknown>;
}

/**
 * Add change to sync queue (fire-and-forget)
 * Uses setImmediate to avoid blocking main operation
 */
export async function enqueue(params: EnqueueParams): Promise<void> {
  try {
    await prisma.syncQueue.create({
      data: {
        action: params.action,
        model: params.model,
        recordId: params.recordId,
        sheetRowIndex: params.sheetRowIndex ?? null,
        payload: params.payload as Prisma.JsonObject,
        status: "PENDING",
        retries: 0,
        maxRetries: 3,
      },
    });
  } catch (error) {
    // Log but don't throw - queue is best-effort
    console.error("[SyncQueue] Enqueue failed:", error);
  }
}

/**
 * Get pending items for processing (batch)
 * Returns oldest PENDING items, marks as PROCESSING
 */
export async function dequeue(
  batchSize: number = 25
): Promise<Array<{
  id: string;
  action: string;
  model: string;
  recordId: string;
  sheetRowIndex: number | null;
  payload: Prisma.JsonValue;
}>> {
  // Atomic: select + update in transaction
  return await prisma.$transaction(async (tx) => {
    const items = await tx.syncQueue.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: batchSize,
      select: {
        id: true,
        action: true,
        model: true,
        recordId: true,
        sheetRowIndex: true,
        payload: true,
      },
    });

    if (items.length === 0) return [];

    // Mark as processing
    await tx.syncQueue.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { status: "PROCESSING" },
    });

    return items;
  });
}

/**
 * Mark item as completed
 */
export async function markComplete(id: string): Promise<void> {
  await prisma.syncQueue.update({
    where: { id },
    data: {
      status: "COMPLETED",
      processedAt: new Date(),
    },
  });
}

/**
 * Mark item as failed, increment retry
 */
export async function markFailed(id: string, error: string): Promise<void> {
  const item = await prisma.syncQueue.findUnique({
    where: { id },
    select: { retries: true, maxRetries: true },
  });

  if (!item) return;

  const newStatus = item.retries + 1 >= item.maxRetries ? "FAILED" : "PENDING";

  await prisma.syncQueue.update({
    where: { id },
    data: {
      status: newStatus,
      retries: { increment: 1 },
      lastError: error,
    },
  });
}

/**
 * Reset processing items back to pending (for stuck items)
 */
export async function resetStuck(olderThanMinutes: number = 10): Promise<number> {
  const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const result = await prisma.syncQueue.updateMany({
    where: {
      status: "PROCESSING",
      createdAt: { lt: threshold },
    },
    data: { status: "PENDING" },
  });

  return result.count;
}

/**
 * Cleanup old completed items (retention: 7 days)
 */
export async function cleanupCompleted(olderThanDays: number = 7): Promise<number> {
  const threshold = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await prisma.syncQueue.deleteMany({
    where: {
      status: "COMPLETED",
      processedAt: { lt: threshold },
    },
  });

  return result.count;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const stats = await prisma.syncQueue.groupBy({
    by: ["status"],
    _count: true,
  });

  return {
    pending: stats.find((s) => s.status === "PENDING")?._count ?? 0,
    processing: stats.find((s) => s.status === "PROCESSING")?._count ?? 0,
    completed: stats.find((s) => s.status === "COMPLETED")?._count ?? 0,
    failed: stats.find((s) => s.status === "FAILED")?._count ?? 0,
  };
}
```

## Success Criteria

1. SyncQueue model added to schema
2. Migration runs without errors
3. Queue utilities: enqueue, dequeue, markComplete, markFailed working
4. Indexes on status and model for efficient queries
5. Cleanup function removes old entries

## Testing

```typescript
// Manual test in REPL or test file
import { enqueue, dequeue, markComplete, getQueueStats } from "@/lib/sync/write-back-queue";

// Enqueue test item
await enqueue({
  action: "UPDATE",
  model: "Request",
  recordId: "test-id",
  sheetRowIndex: 5,
  payload: { customerName: "Test" },
});

// Check stats
const stats = await getQueueStats();
console.log(stats); // { pending: 1, processing: 0, ... }

// Dequeue
const items = await dequeue(10);
console.log(items.length); // 1

// Mark complete
await markComplete(items[0].id);
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Queue table grows unbounded | Medium | cleanupCompleted runs weekly |
| Stuck PROCESSING items | Low | resetStuck on cron start |
| Concurrent dequeue race | Low | Transaction ensures atomicity |

## Review Findings

**Review Date:** 2026-01-10 13:17
**Review Report:** `plans/reports/code-reviewer-260110-1317-phase01-bidirectional-sync-review.md`
**Critical Issues:** 0
**Status:** Approved with required fixes

**Required Fixes (Priority 1):**
1. Fix 7 TypeScript errors in test file (`write-back-queue.test.ts`)
2. Sanitize error logging to prevent stack trace exposure

**Recommended Improvements (Priority 2):**
3. Remove redundant `@@index([status])` from schema
4. Add input validation for payload size and batch size bounds
5. Add Prisma enums for action/status fields

**Next Steps:**
- Apply Priority 1 fixes
- Run `npx tsc --noEmit` to verify
- Proceed to Phase 02 after fixes complete
