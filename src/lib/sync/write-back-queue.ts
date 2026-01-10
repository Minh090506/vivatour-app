/**
 * SyncQueue Management Utilities
 *
 * Handles enqueue, dequeue, status updates for write-back queue.
 * Queue enables bidirectional sync: DB changes -> Google Sheets.
 *
 * NOTE: Uses basePrisma to avoid circular dependency with sync-extensions.
 * The sync-extensions module imports this file, so we must not import
 * the extended prisma client here.
 */

import { basePrisma as prisma } from "@/lib/db";
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

export interface QueueItem {
  id: string;
  action: string;
  model: string;
  recordId: string;
  sheetRowIndex: number | null;
  payload: Prisma.JsonValue;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * Add change to sync queue (fire-and-forget)
 * Catches errors internally - queue is best-effort
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
 * Returns oldest PENDING items, marks as PROCESSING atomically
 */
export async function dequeue(batchSize: number = 25): Promise<QueueItem[]> {
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
 * Mark item as failed, increment retry counter
 * Returns to PENDING if retries remaining, else FAILED
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
 * Reset stuck PROCESSING items back to PENDING
 * For items processing longer than threshold (crash recovery)
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
 * Cleanup old completed items (retention policy)
 * Default: 7 days
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
 * Get queue statistics by status
 */
export async function getQueueStats(): Promise<QueueStats> {
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

/**
 * Get failed items with error details
 */
export async function getFailedItems(
  limit: number = 10
): Promise<Array<{
  id: string;
  model: string;
  action: string;
  recordId: string;
  lastError: string | null;
  retries: number;
  createdAt: Date;
}>> {
  return prisma.syncQueue.findMany({
    where: { status: "FAILED" },
    orderBy: { createdAt: "desc" },
    take: limit,
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
}

/**
 * Retry a failed item by resetting status
 */
export async function retryFailed(id: string): Promise<void> {
  await prisma.syncQueue.update({
    where: { id },
    data: {
      status: "PENDING",
      retries: 0,
      lastError: null,
    },
  });
}

/**
 * Delete a queue item (for manual cleanup)
 */
export async function deleteQueueItem(id: string): Promise<void> {
  await prisma.syncQueue.delete({
    where: { id },
  });
}
