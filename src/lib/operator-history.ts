// Operator history helper - audit trail for all operator changes
import { prisma } from './db';
import type { Prisma } from '@prisma/client';

// Base actions + tier-specific lock actions (LOCK_KT, UNLOCK_ADMIN, etc.)
export type HistoryAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOCK'
  | 'UNLOCK'
  | 'APPROVE'
  | 'ARCHIVE'
  | 'UNARCHIVE'
  | 'LOCK_KT'
  | 'UNLOCK_KT'
  | 'LOCK_ADMIN'
  | 'UNLOCK_ADMIN'
  | 'LOCK_FINAL'
  | 'UNLOCK_FINAL';

interface HistoryEntry {
  operatorId: string;
  action: HistoryAction | string; // Allow string for flexibility with tier actions
  changes: Record<string, unknown>; // Flexible for both before/after and direct values
  userId: string;
}

/**
 * Create a new history entry for an operator
 */
export async function createOperatorHistory(entry: HistoryEntry) {
  return prisma.operatorHistory.create({
    data: {
      operatorId: entry.operatorId,
      action: entry.action,
      changes: entry.changes as Prisma.InputJsonValue,
      userId: entry.userId,
    },
  });
}

/**
 * Get history for a specific operator
 */
export async function getOperatorHistory(operatorId: string, limit = 20) {
  return prisma.operatorHistory.findMany({
    where: { operatorId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Diff two objects and return only changed fields
 * Compares JSON stringified values to handle Date and Decimal comparisons
 */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  // Fields to ignore in diff (metadata fields)
  const ignoreFields = ['updatedAt', 'createdAt', 'history', 'request', 'supplierRef', 'user'];

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (ignoreFields.includes(key)) continue;

    const beforeVal = before[key];
    const afterVal = after[key];

    // Compare stringified values to handle Date/Decimal
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes[key] = { before: beforeVal, after: afterVal };
    }
  }

  return changes;
}
