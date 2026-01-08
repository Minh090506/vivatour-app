# Phase 1: Foundation

**Owner**: Window 1
**Duration**: ~45 min
**Blocking**: All other phases depend on this

---

## Overview

Foundation phase establishes schema changes and utility modules required by all subsequent phases.

---

## Task 1.1: Schema Changes (20 min)

### File: `prisma/schema.prisma`

#### 1.1.1 Add Lock Tier Fields to Operator (after line 150)

```prisma
model Operator {
  // ... existing fields (lines 119-170) ...

  // KEEP existing single lock fields (backward compat):
  // isLocked        Boolean   @default(false)
  // lockedAt        DateTime?
  // lockedBy        String?

  // ADD 3-tier lock fields (after lockedBy, ~line 151):
  lockKT          Boolean   @default(false)
  lockKTAt        DateTime?
  lockKTBy        String?
  lockAdmin       Boolean   @default(false)
  lockAdminAt     DateTime?
  lockAdminBy     String?
  lockFinal       Boolean   @default(false)
  lockFinalAt     DateTime?
  lockFinalBy     String?

  // ADD serviceId (after lockFinal fields):
  serviceId       String?   @unique

  // ADD index (after existing indexes, ~line 169):
  @@index([serviceId])
}
```

#### 1.1.2 Add Lock Tier Fields to Revenue (after line 219)

```prisma
model Revenue {
  // ... existing fields (lines 195-234) ...

  // KEEP existing single lock fields

  // ADD 3-tier lock fields (after lockedBy, ~line 220):
  lockKT          Boolean   @default(false)
  lockKTAt        DateTime?
  lockKTBy        String?
  lockAdmin       Boolean   @default(false)
  lockAdminAt     DateTime?
  lockAdminBy     String?
  lockFinal       Boolean   @default(false)
  lockFinalAt     DateTime?
  lockFinalBy     String?

  // ADD history relation (after lock fields):
  history         RevenueHistory[]
}
```

#### 1.1.3 Add RevenueHistory Model (after Revenue model, ~line 235)

```prisma
// ============================================
// REVENUE HISTORY (Audit Trail)
// ============================================

model RevenueHistory {
  id          String   @id @default(cuid())
  revenueId   String
  revenue     Revenue  @relation(fields: [revenueId], references: [id], onDelete: Cascade)
  action      String   // CREATE, UPDATE, DELETE, LOCK_KT, LOCK_ADMIN, LOCK_FINAL, UNLOCK_*
  changes     Json     // {field: {before, after}}
  userId      String
  createdAt   DateTime @default(now())

  @@index([revenueId])
  @@index([createdAt])
  @@map("revenue_history")
}
```

### Run Schema Push

```bash
npx prisma db push
npx prisma generate
```

---

## Task 1.2: Lock Utils Module (15 min)

### File: `src/lib/lock-utils.ts` (NEW)

```typescript
/**
 * Lock System Utilities for VivaTour
 * 3-tier lock: KT (Accountant) → Admin → Final
 */

import type { Role } from '@prisma/client';

// Lock tier definitions
export const LOCK_TIERS = ['KT', 'Admin', 'Final'] as const;
export type LockTier = (typeof LOCK_TIERS)[number];

// Lock tier order (for progression validation)
export const LOCK_TIER_ORDER: Record<LockTier, number> = {
  KT: 1,
  Admin: 2,
  Final: 3,
};

// Permissions per tier per action
export const LOCK_PERMISSIONS: Record<
  LockTier,
  { lock: Role[]; unlock: Role[] }
> = {
  KT: {
    lock: ['ACCOUNTANT', 'ADMIN'],
    unlock: ['ACCOUNTANT', 'ADMIN'],
  },
  Admin: {
    lock: ['ADMIN'],
    unlock: ['ADMIN'],
  },
  Final: {
    lock: ['ADMIN'],
    unlock: ['ADMIN'],
  },
};

/**
 * Check if role can perform lock action on tier
 */
export function canLock(role: Role, tier: LockTier): boolean {
  return LOCK_PERMISSIONS[tier].lock.includes(role);
}

/**
 * Check if role can perform unlock action on tier
 */
export function canUnlock(role: Role, tier: LockTier): boolean {
  return LOCK_PERMISSIONS[tier].unlock.includes(role);
}

/**
 * Lock state interface
 */
export interface LockState {
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
}

/**
 * Get current highest lock tier from record
 */
export function getCurrentLockTier(state: LockState): LockTier | null {
  if (state.lockFinal) return 'Final';
  if (state.lockAdmin) return 'Admin';
  if (state.lockKT) return 'KT';
  return null;
}

/**
 * Check if tier can be locked (sequential progression)
 */
export function canLockTier(state: LockState, tier: LockTier): boolean {
  const tierOrder = LOCK_TIER_ORDER[tier];

  // Tier 1 (KT): can lock if not already locked
  if (tierOrder === 1) return !state.lockKT;

  // Tier 2 (Admin): tier 1 must be locked
  if (tierOrder === 2) return state.lockKT && !state.lockAdmin;

  // Tier 3 (Final): tier 2 must be locked
  if (tierOrder === 3) return state.lockAdmin && !state.lockFinal;

  return false;
}

/**
 * Check if tier can be unlocked (reverse order)
 */
export function canUnlockTier(state: LockState, tier: LockTier): boolean {
  const tierOrder = LOCK_TIER_ORDER[tier];

  // Tier 3 (Final): can unlock if locked
  if (tierOrder === 3) return state.lockFinal;

  // Tier 2 (Admin): tier 3 must be unlocked first
  if (tierOrder === 2) return state.lockAdmin && !state.lockFinal;

  // Tier 1 (KT): tier 2 must be unlocked first
  if (tierOrder === 1) return state.lockKT && !state.lockAdmin;

  return false;
}

/**
 * Check if record is editable (no locks applied)
 */
export function isEditable(state: LockState): boolean {
  return !state.lockKT && !state.lockAdmin && !state.lockFinal;
}

/**
 * Get lock tier fields for database update
 */
export function getLockFields(
  tier: LockTier,
  userId: string,
  lock: boolean
): Record<string, boolean | Date | string | null> {
  const now = new Date();
  const tierKey = `lock${tier}`;

  if (lock) {
    return {
      [tierKey]: true,
      [`${tierKey}At`]: now,
      [`${tierKey}By`]: userId,
    };
  } else {
    return {
      [tierKey]: false,
      [`${tierKey}At`]: null,
      [`${tierKey}By`]: null,
    };
  }
}

/**
 * Get history action name for lock operation
 */
export function getLockHistoryAction(tier: LockTier, lock: boolean): string {
  return lock ? `LOCK_${tier.toUpperCase()}` : `UNLOCK_${tier.toUpperCase()}`;
}

/**
 * Generate serviceId for Operator
 * Format: {bookingCode}-{timestamp}
 */
export function generateServiceId(bookingCode: string): string {
  const now = new Date();
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    pad(now.getMilliseconds(), 3);

  return `${bookingCode}-${timestamp}`;
}
```

---

## Task 1.3: Lock Config Module (5 min)

### File: `src/config/lock-config.ts` (NEW)

```typescript
/**
 * Lock System Configuration
 * Vietnamese labels, colors, and history actions
 */

// Lock tier labels (Vietnamese)
export const LOCK_TIER_LABELS: Record<string, string> = {
  KT: 'Khóa KT',
  Admin: 'Khóa Admin',
  Final: 'Khóa Cuối',
};

// Lock tier colors for badges
export const LOCK_TIER_COLORS: Record<string, string> = {
  KT: 'amber',
  Admin: 'orange',
  Final: 'red',
};

// History action labels (Vietnamese)
export const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  LOCK: 'Khóa', // Legacy
  UNLOCK: 'Mở khóa', // Legacy
  LOCK_KT: 'Khóa KT',
  UNLOCK_KT: 'Mở khóa KT',
  LOCK_ADMIN: 'Khóa Admin',
  UNLOCK_ADMIN: 'Mở khóa Admin',
  LOCK_FINAL: 'Khóa cuối',
  UNLOCK_FINAL: 'Mở khóa cuối',
  APPROVE: 'Duyệt thanh toán',
};

// History action types
export const LOCK_HISTORY_ACTIONS = {
  LOCK_KT: 'LOCK_KT',
  UNLOCK_KT: 'UNLOCK_KT',
  LOCK_ADMIN: 'LOCK_ADMIN',
  UNLOCK_ADMIN: 'UNLOCK_ADMIN',
  LOCK_FINAL: 'LOCK_FINAL',
  UNLOCK_FINAL: 'UNLOCK_FINAL',
} as const;
```

---

## Task 1.4: Type Updates (5 min)

### File: `src/types/index.ts`

Add lock tier types to existing interfaces. Find Operator and Revenue interfaces and add:

```typescript
// Add to Operator interface (around line 136)
export interface Operator {
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

  // Service identifier
  serviceId: string | null;

  // Keep legacy fields for backward compat
  isLocked?: boolean;
  lockedAt?: Date | null;
  lockedBy?: string | null;
}

// Add to Revenue interface (around line 179)
export interface Revenue {
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

  // Keep legacy fields
  isLocked?: boolean;
  lockedAt?: Date | null;
  lockedBy?: string | null;
}

// Add new RevenueHistory type
export interface RevenueHistory {
  id: string;
  revenueId: string;
  action: string;
  changes: Record<string, unknown>;
  userId: string;
  createdAt: Date;
}

// Add LockTier type
export type LockTier = 'KT' | 'Admin' | 'Final';
```

---

## Verification Checklist

- [ ] Schema pushed successfully (`npx prisma db push`)
- [ ] Types generated (`npx prisma generate`)
- [ ] No TypeScript errors in new files
- [ ] `lock-utils.ts` exports all functions
- [ ] `lock-config.ts` exports all constants
- [ ] Type definitions updated in index.ts

---

## Next Steps

After Phase 1 completes:
1. Signal to Windows 2 & 3 that schema is ready
2. Windows 2 & 3 can start Phase 2A/2B in parallel
3. Window 1 prepares migration scripts for Phase 4
