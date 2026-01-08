# Phase 1: Foundation

**Owner**: Window 1
**Duration**: ~1.5 hours
**Blocking**: All other phases depend on this completing first

---

## Overview

Foundation phase establishes schema changes and utility modules required by all subsequent phases.

---

## Task 1.1: Schema Changes (30 min)

### File: `prisma/schema.prisma`

#### 1.1.1 Add Lock Tier Fields to Operator

```prisma
model Operator {
  // ... existing fields (lines 119-170) ...

  // REMOVE these single lock fields:
  // isLocked        Boolean   @default(false)
  // lockedAt        DateTime?
  // lockedBy        String?

  // ADD 3-tier lock fields:
  lockKT          Boolean   @default(false)
  lockKTAt        DateTime?
  lockKTBy        String?
  lockAdmin       Boolean   @default(false)
  lockAdminAt     DateTime?
  lockAdminBy     String?
  lockFinal       Boolean   @default(false)
  lockFinalAt     DateTime?
  lockFinalBy     String?

  // ADD serviceId
  serviceId       String?   @unique

  // ADD index
  @@index([serviceId])
}
```

**Migration Strategy**:
1. Add new fields as nullable
2. Keep `isLocked` temporarily for backward compat
3. Run migration script to copy isLocked → lockKT
4. Remove `isLocked` in future phase

#### 1.1.2 Add Lock Tier Fields to Revenue

```prisma
model Revenue {
  // ... existing fields (lines 195-234) ...

  // KEEP existing single lock fields temporarily
  // isLocked, lockedAt, lockedBy

  // ADD 3-tier lock fields:
  lockKT          Boolean   @default(false)
  lockKTAt        DateTime?
  lockKTBy        String?
  lockAdmin       Boolean   @default(false)
  lockAdminAt     DateTime?
  lockAdminBy     String?
  lockFinal       Boolean   @default(false)
  lockFinalAt     DateTime?
  lockFinalBy     String?

  // ADD history relation
  history         RevenueHistory[]
}
```

#### 1.1.3 Add RevenueHistory Model

```prisma
// After Revenue model (after line 235)
model RevenueHistory {
  id          String   @id @default(cuid())
  revenueId   String
  revenue     Revenue  @relation(fields: [revenueId], references: [id], onDelete: Cascade)
  action      String   // CREATE, UPDATE, LOCK_KT, LOCK_ADMIN, LOCK_FINAL, UNLOCK_KT, UNLOCK_ADMIN, UNLOCK_FINAL
  changes     Json     // {field: {before, after}}
  userId      String
  createdAt   DateTime @default(now())

  @@index([revenueId])
  @@index([createdAt])
  @@map("revenue_history")
}
```

#### 1.1.4 Add requestId to Request

```prisma
model Request {
  // After line 57 (bookingCode)
  requestId       String?   @unique  // {SellerCode}{yyyyMMddHHmmssSSS}

  // Add index (after line 111)
  @@index([requestId])
}
```

### Run Schema Push

```bash
npx prisma db push
npx prisma generate
```

---

## Task 1.2: ID Utils Module (30 min)

### File: `src/lib/id-utils.ts` (NEW)

```typescript
/**
 * ID Generation Utilities for VivaTour
 * Centralized ID generators for Request, Operator, Revenue
 */

import { prisma } from './db';

// Vietnamese diacritics removal (extended from supplier-config.ts)
const DIACRITICS_MAP: Record<string, string> = {
  // Uppercase
  'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
  'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
  'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
  'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
  'Đ': 'D',
  // Lowercase
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'đ': 'd',
};

/**
 * Remove Vietnamese diacritics from string
 */
export function removeDiacritics(str: string): string {
  return str
    .split('')
    .map((char) => DIACRITICS_MAP[char] || char)
    .join('');
}

/**
 * Format timestamp for ID generation
 * Format: yyyyMMddHHmmssSSS (17 chars)
 */
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds()) +
    pad(date.getMilliseconds(), 3)
  );
}

/**
 * Format date portion only
 * Format: yyyyMMdd (8 chars)
 */
export function formatDatePart(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate())
  );
}

/**
 * Generate RequestID
 * Format: {SellerCode}{yyyyMMddHHmmssSSS}
 * Example: LY20260108143045123
 */
export async function generateRequestId(
  sellerCode: string,
  timestamp: Date = new Date()
): Promise<string> {
  const cleanCode = removeDiacritics(sellerCode).toUpperCase().replace(/\s+/g, '');
  const ts = formatTimestamp(timestamp);
  const requestId = `${cleanCode}${ts}`;

  // Verify uniqueness
  const existing = await prisma.request.findUnique({
    where: { requestId },
    select: { id: true },
  });

  if (existing) {
    // Collision - retry with new timestamp
    await new Promise((r) => setTimeout(r, 1));
    return generateRequestId(sellerCode, new Date());
  }

  return requestId;
}

/**
 * Generate ServiceID for Operator
 * Format: {bookingCode}-{yyyyMMddHHmmssSSS}
 * Example: 20260108L0001-20260108143045123
 */
export async function generateServiceId(
  bookingCode: string,
  timestamp: Date = new Date()
): Promise<string> {
  const ts = formatTimestamp(timestamp);
  const serviceId = `${bookingCode}-${ts}`;

  // Verify uniqueness
  const existing = await prisma.operator.findUnique({
    where: { serviceId },
    select: { id: true },
  });

  if (existing) {
    await new Promise((r) => setTimeout(r, 1));
    return generateServiceId(bookingCode, new Date());
  }

  return serviceId;
}

/**
 * Generate RevenueID
 * Format: {bookingCode}-{yyyyMMddHHmmss}-{rowNum}
 * Example: 20260108L0001-20260108143045-1
 */
export async function generateRevenueId(
  bookingCode: string,
  timestamp: Date = new Date()
): Promise<string> {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateTime =
    timestamp.getFullYear().toString() +
    pad(timestamp.getMonth() + 1) +
    pad(timestamp.getDate()) +
    pad(timestamp.getHours()) +
    pad(timestamp.getMinutes()) +
    pad(timestamp.getSeconds());

  const prefix = `${bookingCode}-${dateTime}`;

  // Get max row number for this prefix
  const existing = await prisma.revenue.findMany({
    where: { revenueId: { startsWith: prefix } },
    select: { revenueId: true },
  });

  const rowNum = existing.length + 1;
  return `${prefix}-${rowNum}`;
}
```

---

## Task 1.3: Lock Utils Module (20 min)

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
 * Get current lock state from record
 */
export interface LockState {
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
}

export function getCurrentLockTier(state: LockState): LockTier | null {
  if (state.lockFinal) return 'Final';
  if (state.lockAdmin) return 'Admin';
  if (state.lockKT) return 'KT';
  return null;
}

/**
 * Check if next tier can be locked (sequential progression)
 */
export function canLockTier(state: LockState, tier: LockTier): boolean {
  const tierOrder = LOCK_TIER_ORDER[tier];

  // For tier 1 (KT), always can lock if not already locked
  if (tierOrder === 1) {
    return !state.lockKT;
  }

  // For tier 2 (Admin), tier 1 must be locked
  if (tierOrder === 2) {
    return state.lockKT && !state.lockAdmin;
  }

  // For tier 3 (Final), tier 2 must be locked
  if (tierOrder === 3) {
    return state.lockAdmin && !state.lockFinal;
  }

  return false;
}

/**
 * Check if tier can be unlocked (reverse order)
 */
export function canUnlockTier(state: LockState, tier: LockTier): boolean {
  const tierOrder = LOCK_TIER_ORDER[tier];

  // For tier 3 (Final), can unlock if locked
  if (tierOrder === 3) {
    return state.lockFinal;
  }

  // For tier 2 (Admin), tier 3 must be unlocked first
  if (tierOrder === 2) {
    return state.lockAdmin && !state.lockFinal;
  }

  // For tier 1 (KT), tier 2 must be unlocked first
  if (tierOrder === 1) {
    return state.lockKT && !state.lockAdmin;
  }

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
```

---

## Task 1.4: Lock Config Module (10 min)

### File: `src/config/lock-config.ts` (NEW)

```typescript
/**
 * Lock System Configuration
 */

// History action types (extend existing)
export const LOCK_HISTORY_ACTIONS = {
  LOCK_KT: 'LOCK_KT',
  UNLOCK_KT: 'UNLOCK_KT',
  LOCK_ADMIN: 'LOCK_ADMIN',
  UNLOCK_ADMIN: 'UNLOCK_ADMIN',
  LOCK_FINAL: 'LOCK_FINAL',
  UNLOCK_FINAL: 'UNLOCK_FINAL',
} as const;

// Vietnamese labels for UI
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

// History action labels
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
```

---

## Verification Checklist

- [ ] Schema pushed successfully (`npx prisma db push`)
- [ ] Types generated (`npx prisma generate`)
- [ ] No TypeScript errors in new files
- [ ] `id-utils.ts` exports all functions
- [ ] `lock-utils.ts` exports all functions
- [ ] `lock-config.ts` exports all constants

---

## Next Steps

After Phase 1 completes:
1. Signal to Windows 2 & 3 that schema is ready
2. Windows 2 & 3 can start Phase 2A/2B in parallel
3. Window 1 prepares migration scripts for Phase 4
