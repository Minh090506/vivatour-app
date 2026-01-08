// ============================================
// Revenue History Utility
// Creates audit trail entries for revenue operations
// ============================================

import { prisma } from './db';
import type { Prisma } from '@prisma/client';

// History action types
export const REVENUE_HISTORY_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOCK_KT: 'LOCK_KT',
  UNLOCK_KT: 'UNLOCK_KT',
  LOCK_ADMIN: 'LOCK_ADMIN',
  UNLOCK_ADMIN: 'UNLOCK_ADMIN',
  LOCK_FINAL: 'LOCK_FINAL',
  UNLOCK_FINAL: 'UNLOCK_FINAL',
} as const;

export type RevenueHistoryAction =
  (typeof REVENUE_HISTORY_ACTIONS)[keyof typeof REVENUE_HISTORY_ACTIONS];

// Input interface
export interface RevenueHistoryInput {
  revenueId: string;
  action: RevenueHistoryAction;
  changes: Record<string, { before?: unknown; after?: unknown }>;
  userId: string;
}

/**
 * Create revenue history entry
 */
export async function createRevenueHistory(input: RevenueHistoryInput) {
  return prisma.revenueHistory.create({
    data: {
      revenueId: input.revenueId,
      action: input.action,
      changes: input.changes as Prisma.InputJsonValue,
      userId: input.userId,
    },
  });
}

/**
 * Get revenue history with user names
 */
export async function getRevenueHistory(revenueId: string) {
  const history = await prisma.revenueHistory.findMany({
    where: { revenueId },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch unique user IDs
  const userIds = Array.from(new Set(history.map((h) => h.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // Merge user names
  return history.map((h) => ({
    ...h,
    userName: userMap.get(h.userId) || 'Unknown',
  }));
}
