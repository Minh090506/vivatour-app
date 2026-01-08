# Phase 01: Revenue History Utility

## Context Links
- [Main Plan](./plan.md)
- Related: `src/lib/lock-utils.ts`, `src/lib/operator-history.ts`

## Overview

Create utility module for RevenueHistory CRUD operations - mirrors existing operator-history.ts pattern.

## Requirements

1. `RevenueHistoryInput` interface for create params
2. `createRevenueHistory()` - insert history record
3. `getRevenueHistory()` - fetch history with user names

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/operator-history.ts` | Reference pattern |
| `prisma/schema.prisma` | RevenueHistory model definition |
| `src/config/lock-config.ts` | Action labels/colors |

## Implementation Steps

### 1. Create src/lib/revenue-history.ts

```typescript
// File: src/lib/revenue-history.ts

import { prisma } from './db';

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

export type RevenueHistoryAction = (typeof REVENUE_HISTORY_ACTIONS)[keyof typeof REVENUE_HISTORY_ACTIONS];

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
      changes: input.changes,
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
  const userIds = [...new Set(history.map((h) => h.userId))];
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
```

## Todo List

- [x] Create `src/lib/revenue-history.ts` file
- [x] Define `REVENUE_HISTORY_ACTIONS` constant
- [x] Define `RevenueHistoryAction` type
- [x] Define `RevenueHistoryInput` interface
- [x] Implement `createRevenueHistory()` function
- [x] Implement `getRevenueHistory()` function with user name join

## Success Criteria

1. Module exports all types and functions
2. createRevenueHistory saves valid records to DB
3. getRevenueHistory returns entries with userName field
4. No TypeScript errors, follows code standards

## Status

**COMPLETED** - 2026-01-08T16:40:00Z
- File created and implemented
- All functions tested and working
