---
date: 2026-01-10
priority: P1
status: pending
review: pending
parent: ./plan.md
---

# Phase 05: API Endpoints + Cron Integration

## Context

- Parent: [Phase 07.5 Plan](./plan.md)
- Depends on: Phase 01-04

## Overview

Create API endpoints for write-back processing and queue status. Configure Vercel cron for 5-minute scheduled sync.

## Requirements

1. POST `/api/sync/write-back` - Process queue items
2. GET `/api/sync/queue` - Queue status and stats
3. Vercel cron config for 5-min schedule
4. CRON_SECRET protection for scheduled triggers
5. Log sync results to SyncLog

## Implementation

### 1. Write-Back API Endpoint

File: `src/app/api/sync/write-back/route.ts`

```typescript
/**
 * Write-Back Sync API
 *
 * POST - Process pending queue items (write DB changes to Sheets)
 *
 * Triggered by:
 * - Vercel cron (every 5 min)
 * - Manual admin trigger
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { basePrisma } from "@/lib/db";
import { logError, logInfo } from "@/lib/logger";
import {
  dequeue,
  markComplete,
  markFailed,
  resetStuck,
  cleanupCompleted,
  getQueueStats,
} from "@/lib/sync/write-back-queue";
import {
  updateSheetRows,
  appendSheetRow,
  type RowUpdate,
} from "@/lib/sync/sheets-writer";
import {
  mapRequestToRow,
  mapOperatorToRow,
  mapRevenueToRow,
  filterWritableValues,
} from "@/lib/sync/db-to-sheet-mappers";

const BATCH_SIZE = 25;

interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: {
  id: string;
  action: string;
  model: string;
  recordId: string;
  sheetRowIndex: number | null;
  payload: unknown;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { action, model, recordId, sheetRowIndex } = item;

    // DELETE: Just mark row as deleted (optional: clear row or add marker)
    if (action === "DELETE") {
      // For now, skip DELETE sync (Sheets doesn't support row deletion via API easily)
      // Could implement: update row with "DELETED" marker
      return { success: true };
    }

    // CREATE without sheetRowIndex: Append new row
    if (action === "CREATE" && !sheetRowIndex) {
      const record = await fetchFullRecord(model, recordId);
      if (!record) {
        return { success: false, error: "Record not found" };
      }

      const rowValues = mapRecordToRow(model, record);
      const filteredValues = filterWritableValues(model, rowValues);

      const newRowIndex = await appendSheetRow(model, filteredValues);

      // Update record with new sheetRowIndex
      await updateSheetRowIndex(model, recordId, newRowIndex);

      return { success: true };
    }

    // UPDATE or CREATE with existing row: Update in place
    if (sheetRowIndex) {
      const record = await fetchFullRecord(model, recordId);
      if (!record) {
        return { success: false, error: "Record not found" };
      }

      const rowValues = mapRecordToRow(model, record);
      const filteredValues = filterWritableValues(model, rowValues);

      const update: RowUpdate = {
        rowIndex: sheetRowIndex,
        values: filteredValues as (string | number | null)[],
      };

      await updateSheetRows(model, [update]);

      return { success: true };
    }

    return { success: false, error: "No row index for update" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Fetch full record with relations needed for mapping
 */
async function fetchFullRecord(
  model: string,
  recordId: string
): Promise<Record<string, unknown> | null> {
  switch (model) {
    case "Request":
      return basePrisma.request.findUnique({
        where: { id: recordId },
        include: { seller: { select: { name: true } } },
      }) as Promise<Record<string, unknown> | null>;

    case "Operator":
      return basePrisma.operator.findUnique({
        where: { id: recordId },
        include: { request: { select: { bookingCode: true } } },
      }) as Promise<Record<string, unknown> | null>;

    case "Revenue":
      return basePrisma.revenue.findUnique({
        where: { id: recordId },
        include: { request: { select: { bookingCode: true } } },
      }) as Promise<Record<string, unknown> | null>;

    default:
      return null;
  }
}

/**
 * Map record to sheet row based on model
 */
function mapRecordToRow(
  model: string,
  record: Record<string, unknown>
): (string | null)[] {
  switch (model) {
    case "Request":
      return mapRequestToRow(record as Parameters<typeof mapRequestToRow>[0]);
    case "Operator":
      return mapOperatorToRow(record as Parameters<typeof mapOperatorToRow>[0]);
    case "Revenue":
      return mapRevenueToRow(record as Parameters<typeof mapRevenueToRow>[0]);
    default:
      return [];
  }
}

/**
 * Update record's sheetRowIndex after append
 */
async function updateSheetRowIndex(
  model: string,
  recordId: string,
  rowIndex: number
): Promise<void> {
  switch (model) {
    case "Request":
      await basePrisma.request.update({
        where: { id: recordId },
        data: { sheetRowIndex: rowIndex },
      });
      break;
    case "Operator":
      await basePrisma.operator.update({
        where: { id: recordId },
        data: { sheetRowIndex: rowIndex },
      });
      break;
    case "Revenue":
      await basePrisma.revenue.update({
        where: { id: recordId },
        data: { sheetRowIndex: rowIndex },
      });
      break;
  }
}

/**
 * POST - Process write-back queue
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: Either admin user or cron secret
    const cronSecret = request.headers.get("Authorization")?.replace("Bearer ", "");
    const isCronTrigger = cronSecret === process.env.CRON_SECRET;

    if (!isCronTrigger) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!hasPermission(session.user.role as Role, "*")) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
    }

    logInfo("api/sync/write-back", "Starting write-back processing", {
      trigger: isCronTrigger ? "cron" : "manual",
    });

    // Reset stuck items first
    const resetCount = await resetStuck(10);
    if (resetCount > 0) {
      logInfo("api/sync/write-back", `Reset ${resetCount} stuck items`);
    }

    // Process queue in batches
    const result: ProcessResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };

    // Process up to 100 items per run (4 batches)
    for (let batch = 0; batch < 4; batch++) {
      const items = await dequeue(BATCH_SIZE);
      if (items.length === 0) break;

      result.processed += items.length;

      for (const item of items) {
        const outcome = await processQueueItem(item);

        if (outcome.success) {
          await markComplete(item.id);
          result.succeeded++;

          // Log success
          await basePrisma.syncLog.create({
            data: {
              sheetName: item.model,
              action: `WRITE_BACK_${item.action}`,
              recordId: item.recordId,
              rowIndex: item.sheetRowIndex,
              status: "SUCCESS",
            },
          });
        } else {
          await markFailed(item.id, outcome.error || "Unknown error");
          result.failed++;

          // Log failure
          await basePrisma.syncLog.create({
            data: {
              sheetName: item.model,
              action: `WRITE_BACK_${item.action}`,
              recordId: item.recordId,
              rowIndex: item.sheetRowIndex,
              status: "FAILED",
              errorMessage: outcome.error,
            },
          });
        }
      }
    }

    // Cleanup old completed items (weekly maintenance)
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 3) {
      const cleaned = await cleanupCompleted(7);
      logInfo("api/sync/write-back", `Cleaned up ${cleaned} old items`);
    }

    // Get final stats
    const stats = await getQueueStats();

    logInfo("api/sync/write-back", "Write-back completed", {
      ...result,
      queueStats: stats,
    });

    return NextResponse.json({
      success: true,
      result,
      queueStats: stats,
    });
  } catch (error) {
    logError("api/sync/write-back", error);
    return NextResponse.json(
      { success: false, error: "Write-back failed" },
      { status: 500 }
    );
  }
}
```

### 2. Queue Status API

File: `src/app/api/sync/queue/route.ts`

```typescript
/**
 * Sync Queue Status API
 *
 * GET - Get queue statistics and recent items
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getQueueStats } from "@/lib/sync/write-back-queue";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get queue statistics
    const stats = await getQueueStats();

    // Get recent failed items (last 10)
    const recentFailed = await prisma.syncQueue.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        model: true,
        action: true,
        recordId: true,
        lastError: true,
        retries: true,
        createdAt: true,
      },
    });

    // Get recent write-back logs (last 20)
    const recentLogs = await prisma.syncLog.findMany({
      where: {
        action: { startsWith: "WRITE_BACK" },
      },
      orderBy: { syncedAt: "desc" },
      take: 20,
    });

    // Check if user is admin for detailed view
    const isAdmin = hasPermission(session.user.role as Role, "*");

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentFailed: isAdmin ? recentFailed : [],
        recentLogs: isAdmin ? recentLogs : [],
        lastProcessed: recentLogs[0]?.syncedAt || null,
      },
    });
  } catch (error) {
    logError("api/sync/queue", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue status" },
      { status: 500 }
    );
  }
}
```

### 3. Vercel Cron Configuration

File: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/sync/write-back",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 4. Environment Variable

Add to `.env`:

```bash
# Cron secret for scheduled job authentication
CRON_SECRET=your-secure-random-string-here
```

Generate with:
```bash
openssl rand -hex 32
```

### 5. Optional: Manual Trigger UI

Add button to admin sync page:

```typescript
// In admin sync component
async function triggerWriteBack() {
  const response = await fetch("/api/sync/write-back", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const result = await response.json();
  console.log("Write-back result:", result);
}
```

## Success Criteria

1. `/api/sync/write-back` processes queue items
2. Items marked COMPLETED after successful write
3. Items marked FAILED with retry count after errors
4. Cron triggers every 5 minutes
5. CRON_SECRET required for cron requests
6. SyncLog records both success and failure
7. Queue status API shows stats and recent items

## Testing

```bash
# Manual trigger (as admin)
curl -X POST http://localhost:3000/api/sync/write-back \
  -H "Cookie: <session-cookie>"

# Cron trigger (with secret)
curl -X POST http://localhost:3000/api/sync/write-back \
  -H "Authorization: Bearer your-cron-secret"

# Check queue status
curl http://localhost:3000/api/sync/queue \
  -H "Cookie: <session-cookie>"
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cron secret leaked | High | Use env vars, rotate regularly |
| Queue backlog | Medium | Process 100 items/run, monitor stats |
| API timeout | Medium | Batch processing, 4x25 items max |
| Duplicate processing | Low | Atomic dequeue transaction |
