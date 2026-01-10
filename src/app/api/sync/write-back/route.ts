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
import { timingSafeEqual } from "crypto";
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
  type RequestRecord,
  type OperatorRecord,
  type RevenueRecord,
} from "@/lib/sync/db-to-sheet-mappers";

const BATCH_SIZE = 25;

interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

interface QueueItem {
  id: string;
  action: string;
  model: string;
  recordId: string;
  sheetRowIndex: number | null;
  payload: unknown;
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
      return mapRequestToRow(record as unknown as RequestRecord);
    case "Operator":
      return mapOperatorToRow(record as unknown as OperatorRecord);
    case "Revenue":
      return mapRevenueToRow(record as unknown as RevenueRecord);
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
 * Process a single queue item
 */
async function processQueueItem(
  item: QueueItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const { action, model, recordId, sheetRowIndex } = item;

    // DELETE: Skip entirely (per plan - don't modify Sheets on DB delete)
    if (action === "DELETE") {
      return { success: true };
    }

    // CREATE without sheetRowIndex: Append new row
    if (action === "CREATE" && !sheetRowIndex) {
      const record = await fetchFullRecord(model, recordId);
      if (!record) {
        // Record not found - mark as completed (orphan item)
        return { success: true };
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
        // Record not found - mark as completed (orphan item)
        return { success: true };
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
 * POST - Process write-back queue
 */
/**
 * Timing-safe comparison to prevent timing attacks on cron secret
 */
function verifyCronSecret(provided: string | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;

  try {
    const providedBuffer = Buffer.from(provided, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth: Either admin user or cron secret (timing-safe)
    const cronSecret = request.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    const isCronTrigger = verifyCronSecret(cronSecret);

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
        const outcome = await processQueueItem(item as QueueItem);

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
