/**
 * Prisma Client Extensions for Sync Queue
 *
 * Intercepts CRUD operations on Request, Operator, Revenue
 * and queues changes for write-back to Google Sheets.
 *
 * Key behaviors:
 * - Uses setImmediate for async queue (non-blocking)
 * - Skips locked records (lockKT, lockAdmin, lockFinal)
 * - Skips system models (SyncLog, SyncQueue, History)
 * - DELETE operations are NOT synced (per business decision: sheet data preserved)
 *
 * NOTE: Internal queries use the base prisma client passed to withSyncExtensions
 * to avoid recursive extension calls.
 */

import { PrismaClient } from "@prisma/client";
import { enqueue, SyncAction, SyncModel } from "./write-back-queue";

/**
 * Interface for records that can be locked
 * Used for type-safe lock checking in extensions
 */
interface LockableRecord {
  lockKT?: boolean;
  lockAdmin?: boolean;
  lockFinal?: boolean;
  isLocked?: boolean; // Legacy lock field
}

/**
 * Check if a record is locked (any of the 3-tier locks or legacy)
 * Locked records should NOT be synced back to sheets
 */
function isRecordLocked(record: LockableRecord): boolean {
  return !!(
    record.lockKT === true ||
    record.lockAdmin === true ||
    record.lockFinal === true ||
    record.isLocked === true // Legacy lock
  );
}

/**
 * Extract changed fields from update args
 * Filters Prisma-specific fields and relations
 */
function extractChangedFields(
  data: Record<string, unknown>
): Record<string, unknown> {
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
    // Skip nested objects (relations)
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
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
      console.error(
        `[SyncExtensions] Queue failed for ${model}:${recordId}`,
        error
      );
    }
  });
}

/**
 * Create Prisma client with sync tracking extensions
 *
 * Tracks CREATE, UPDATE, DELETE on Request, Operator, Revenue.
 * Skipped: locked records, bulk operations (updateMany/deleteMany)
 */
export function withSyncExtensions(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      // Track Request model
      request: {
        async create({ args, query }) {
          const result = await query(args);
          const record = result as { id: string; sheetRowIndex?: number | null };

          // Queue CREATE
          queueAsync(
            "CREATE",
            "Request",
            record.id,
            record.sheetRowIndex,
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
            },
          });

          const result = await query(args);
          const record = result as { id: string; sheetRowIndex?: number | null };

          // Request doesn't have locks, always queue changes
          if (existing) {
            const changes = extractChangedFields(
              args.data as Record<string, unknown>
            );
            if (Object.keys(changes).length > 0) {
              queueAsync(
                "UPDATE",
                "Request",
                record.id,
                record.sheetRowIndex,
                changes
              );
            }
          }

          return result;
        },

        /**
         * DELETE: Intentionally NOT synced to Google Sheets
         *
         * Business decision: When records are deleted from webapp,
         * the corresponding sheet row is preserved. This prevents
         * accidental data loss and maintains historical records in sheets.
         * Sheet cleanup is handled manually or via separate process.
         */
        async delete({ args, query }) {
          return await query(args);
        },
      },

      // Track Operator model
      operator: {
        async create({ args, query }) {
          const result = await query(args);
          const record = result as { id: string; sheetRowIndex?: number | null };

          // Only queue if not locked (check all lock tiers)
          if (!isRecordLocked(result as LockableRecord)) {
            queueAsync(
              "CREATE",
              "Operator",
              record.id,
              record.sheetRowIndex,
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
          const record = result as { id: string; sheetRowIndex?: number | null };

          // Skip if locked
          if (existing && !isRecordLocked(existing as LockableRecord)) {
            const changes = extractChangedFields(
              args.data as Record<string, unknown>
            );
            if (Object.keys(changes).length > 0) {
              queueAsync(
                "UPDATE",
                "Operator",
                record.id,
                record.sheetRowIndex,
                changes
              );
            }
          }

          return result;
        },

        // DELETE: Not synced (see Request.delete comment for rationale)
        async delete({ args, query }) {
          return await query(args);
        },
      },

      // Track Revenue model
      revenue: {
        async create({ args, query }) {
          const result = await query(args);
          const record = result as { id: string; sheetRowIndex?: number | null };

          if (!isRecordLocked(result as LockableRecord)) {
            queueAsync(
              "CREATE",
              "Revenue",
              record.id,
              record.sheetRowIndex,
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
          const record = result as { id: string; sheetRowIndex?: number | null };

          if (existing && !isRecordLocked(existing as LockableRecord)) {
            const changes = extractChangedFields(
              args.data as Record<string, unknown>
            );
            if (Object.keys(changes).length > 0) {
              queueAsync(
                "UPDATE",
                "Revenue",
                record.id,
                record.sheetRowIndex,
                changes
              );
            }
          }

          return result;
        },

        // DELETE: Not synced (see Request.delete comment for rationale)
        async delete({ args, query }) {
          return await query(args);
        },
      },
    },
  });
}

/**
 * Type for extended Prisma client
 */
export type PrismaClientWithSync = ReturnType<typeof withSyncExtensions>;
