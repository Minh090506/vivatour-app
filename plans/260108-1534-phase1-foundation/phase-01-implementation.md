# Phase 1: Implementation Details

## Context

- **Parent Plan**: `plan.md`
- **Existing Schema**: `prisma/schema.prisma` (Operator/Revenue with `isLocked`)
- **Lib Patterns**: `src/lib/request-utils.ts` (ID generation pattern)
- **Config Patterns**: `src/config/operator-config.ts` (constants with labels/colors)

---

## Task 1: Schema Changes

**File**: `prisma/schema.prisma`

### 1.1 Add 3-Tier Lock Fields to Operator Model

```prisma
model Operator {
  // ... existing fields ...

  // 3-Tier Lock System (new)
  lockTier        Int?      @default(0)  // 0=unlocked, 1=KT, 2=Admin, 3=Final
  lockKTAt        DateTime?              // KT lock timestamp
  lockKTBy        String?                // KT locker userId
  lockAdminAt     DateTime?              // Admin lock timestamp
  lockAdminBy     String?                // Admin locker userId
  lockFinalAt     DateTime?              // Final lock timestamp
  lockFinalBy     String?                // Final locker userId

  // Keep existing for backward compatibility (deprecate later)
  isLocked        Boolean   @default(false)
  lockedAt        DateTime?
  lockedBy        String?
}
```

### 1.2 Add 3-Tier Lock Fields to Revenue Model

```prisma
model Revenue {
  // ... existing fields ...

  // 3-Tier Lock System (new)
  lockTier        Int?      @default(0)  // 0=unlocked, 1=KT, 2=Admin, 3=Final
  lockKTAt        DateTime?
  lockKTBy        String?
  lockAdminAt     DateTime?
  lockAdminBy     String?
  lockFinalAt     DateTime?
  lockFinalBy     String?

  // Keep existing for backward compatibility
  isLocked        Boolean   @default(false)
  lockedAt        DateTime?
  lockedBy        String?
}
```

### 1.3 Add RevenueHistory Model (new)

```prisma
model RevenueHistory {
  id          String   @id @default(cuid())
  revenueId   String
  revenue     Revenue  @relation(fields: [revenueId], references: [id], onDelete: Cascade)
  action      String   // CREATE, UPDATE, DELETE, LOCK_KT, LOCK_ADMIN, LOCK_FINAL, UNLOCK
  changes     Json     // {field: {before, after}}
  userId      String
  createdAt   DateTime @default(now())

  @@index([revenueId])
  @@index([createdAt])
  @@map("revenue_history")
}
```

### 1.4 Add Revenue Relation

Update Revenue model to include history relation:

```prisma
model Revenue {
  // ... existing fields ...
  history         RevenueHistory[]
}
```

### 1.5 Add requestId Field to Request (for ServiceId)

This enables ServiceId generation as `{bookingCode}-{timestamp}`:

```prisma
model Request {
  // Add after bookingCode
  requestId       String?   // ServiceId: {bookingCode}-{timestamp}
}
```

**Note**: requestId is optional since existing requests won't have it.

### Migration Command

```bash
npx prisma migrate dev --name add_3tier_lock_system
```

---

## Task 2: ID Utils

**File**: `src/lib/id-utils.ts`

### 2.1 Vietnamese Diacritics Removal

```typescript
/**
 * Remove Vietnamese diacritics from string
 * "Nguyen Van A" -> "Nguyen Van A"
 * "Nguy n V n A" -> "Nguyen Van A"
 */
export function removeVietnameseDiacritics(str: string): string
```

Character mapping:
- a: a, a, a, a, a, a, a, a, a, a, a, a
- e: e, e, e, e, e, e, e, e, e, e, e
- i: i, i, i, i, i
- o: o, o, o, o, o, o, o, o, o, o, o, o
- u: u, u, u, u, u, u, u, u, u, u, u
- y: y, y, y, y, y
- d: d

### 2.2 Timestamp Formatting

```typescript
/**
 * Format timestamp for ID: YYMMDD-HHMM
 * new Date("2026-01-08T15:34:00") -> "260108-1534"
 */
export function formatTimestampForId(date: Date): string
```

### 2.3 ServiceId Generator

```typescript
/**
 * Generate ServiceId: {bookingCode}-{timestamp}
 * Example: "20260108L0001-260108-1534"
 */
export function generateServiceId(bookingCode: string, date?: Date): string
```

### 2.4 Implementation Skeleton

```typescript
// ============================================
// ID Utilities for VivaTour
// Vietnamese diacritics, timestamp formatting, ID generators
// ============================================

const VIETNAMESE_MAP: Record<string, string> = {
  // Lowercase
  'a': 'a', 'a': 'a', 'a': 'a', 'a': 'a', 'a': 'a', 'a': 'a',
  'a': 'a', 'a': 'a', 'a': 'a', 'a': 'a', 'a': 'a', 'a': 'a',
  'e': 'e', 'e': 'e', 'e': 'e', 'e': 'e', 'e': 'e',
  'e': 'e', 'e': 'e', 'e': 'e', 'e': 'e', 'e': 'e', 'e': 'e',
  'i': 'i', 'i': 'i', 'i': 'i', 'i': 'i', 'i': 'i',
  'o': 'o', 'o': 'o', 'o': 'o', 'o': 'o', 'o': 'o', 'o': 'o',
  'o': 'o', 'o': 'o', 'o': 'o', 'o': 'o', 'o': 'o', 'o': 'o',
  'u': 'u', 'u': 'u', 'u': 'u', 'u': 'u', 'u': 'u',
  'u': 'u', 'u': 'u', 'u': 'u', 'u': 'u', 'u': 'u', 'u': 'u',
  'y': 'y', 'y': 'y', 'y': 'y', 'y': 'y', 'y': 'y',
  'd': 'd',
  // Uppercase versions...
};

export function removeVietnameseDiacritics(str: string): string {
  return str.split('').map(char => VIETNAMESE_MAP[char] || char).join('');
}

export function formatTimestampForId(date: Date = new Date()): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${min}`;
}

export function generateServiceId(bookingCode: string, date: Date = new Date()): string {
  const timestamp = formatTimestampForId(date);
  return `${bookingCode}-${timestamp}`;
}
```

---

## Task 3: Lock Utils

**File**: `src/lib/lock-utils.ts`

### 3.1 Lock Tier Enum

```typescript
export enum LockTier {
  UNLOCKED = 0,
  KT = 1,       // Ke Toan (Accountant)
  ADMIN = 2,
  FINAL = 3,
}
```

### 3.2 Permission Checker

```typescript
/**
 * Check if user can lock at given tier
 * KT: ACCOUNTANT, ADMIN
 * Admin: ADMIN only
 * Final: ADMIN only
 */
export function canLockAtTier(role: string, tier: LockTier): boolean
```

### 3.3 Lock Progression Validator

```typescript
/**
 * Validate lock progression (must be sequential)
 * Returns true if lock can progress from current to target tier
 * Current 0 -> Target 1: OK
 * Current 1 -> Target 3: FAIL (must do 2 first)
 */
export function canProgressLock(currentTier: number, targetTier: number): boolean
```

### 3.4 Unlock Order Validator

```typescript
/**
 * Validate unlock order (must be reverse)
 * Current 3 -> Target 2: OK
 * Current 3 -> Target 0: FAIL (must do 2 first)
 */
export function canUnlock(currentTier: number, targetTier: number): boolean
```

### 3.5 Edit Blocking Check

```typescript
/**
 * Check if record is editable (any lock blocks edits)
 */
export function isEditable(lockTier: number): boolean {
  return lockTier === LockTier.UNLOCKED;
}
```

### 3.6 Lock State Builder

```typescript
/**
 * Build lock field updates for Prisma
 * Returns partial update object with lock fields
 */
export function buildLockUpdate(
  tier: LockTier,
  userId: string,
  timestamp: Date = new Date()
): Partial<OperatorLockFields>
```

### 3.7 Implementation Skeleton

```typescript
// ============================================
// Lock Utilities for 3-Tier Lock System
// Lock tiers, permissions, progression logic
// ============================================

import { Role } from '@prisma/client';

export enum LockTier {
  UNLOCKED = 0,
  KT = 1,       // Ke Toan (Accountant)
  ADMIN = 2,
  FINAL = 3,
}

// Who can lock at each tier
const TIER_PERMISSIONS: Record<LockTier, Role[]> = {
  [LockTier.UNLOCKED]: [],
  [LockTier.KT]: ['ACCOUNTANT', 'ADMIN'],
  [LockTier.ADMIN]: ['ADMIN'],
  [LockTier.FINAL]: ['ADMIN'],
};

export function canLockAtTier(role: Role, tier: LockTier): boolean {
  return TIER_PERMISSIONS[tier]?.includes(role) ?? false;
}

export function canProgressLock(currentTier: number, targetTier: number): boolean {
  // Must progress sequentially: 0->1, 1->2, 2->3
  return targetTier === currentTier + 1;
}

export function canUnlock(currentTier: number, targetTier: number): boolean {
  // Must unlock in reverse: 3->2, 2->1, 1->0
  return targetTier === currentTier - 1;
}

export function isEditable(lockTier: number): boolean {
  return lockTier === LockTier.UNLOCKED;
}

export interface LockFieldUpdate {
  lockTier: number;
  lockKTAt?: Date | null;
  lockKTBy?: string | null;
  lockAdminAt?: Date | null;
  lockAdminBy?: string | null;
  lockFinalAt?: Date | null;
  lockFinalBy?: string | null;
}

export function buildLockUpdate(
  tier: LockTier,
  userId: string,
  timestamp: Date = new Date()
): LockFieldUpdate {
  const update: LockFieldUpdate = { lockTier: tier };

  switch (tier) {
    case LockTier.KT:
      update.lockKTAt = timestamp;
      update.lockKTBy = userId;
      break;
    case LockTier.ADMIN:
      update.lockAdminAt = timestamp;
      update.lockAdminBy = userId;
      break;
    case LockTier.FINAL:
      update.lockFinalAt = timestamp;
      update.lockFinalBy = userId;
      break;
    case LockTier.UNLOCKED:
      // Clear the tier we're unlocking FROM (caller responsibility)
      break;
  }

  return update;
}

export function buildUnlockUpdate(
  fromTier: LockTier,
  toTier: LockTier
): Partial<LockFieldUpdate> {
  const update: Partial<LockFieldUpdate> = { lockTier: toTier };

  // Clear the tier we're unlocking FROM
  switch (fromTier) {
    case LockTier.FINAL:
      update.lockFinalAt = null;
      update.lockFinalBy = null;
      break;
    case LockTier.ADMIN:
      update.lockAdminAt = null;
      update.lockAdminBy = null;
      break;
    case LockTier.KT:
      update.lockKTAt = null;
      update.lockKTBy = null;
      break;
  }

  return update;
}
```

---

## Task 4: Lock Config

**File**: `src/config/lock-config.ts`

### 4.1 Lock Tier Labels

```typescript
export const LOCK_TIERS = {
  0: { label: 'Chua khoa', labelVi: 'Chua khoa', color: 'gray' },
  1: { label: 'KT Lock', labelVi: 'Khoa KT', color: 'yellow' },
  2: { label: 'Admin Lock', labelVi: 'Khoa Admin', color: 'orange' },
  3: { label: 'Final Lock', labelVi: 'Khoa Cuoi', color: 'red' },
} as const;
```

### 4.2 Lock Actions

```typescript
export const LOCK_ACTIONS = {
  LOCK_KT: { label: 'Khoa KT', color: 'yellow' },
  LOCK_ADMIN: { label: 'Khoa Admin', color: 'orange' },
  LOCK_FINAL: { label: 'Khoa cuoi cung', color: 'red' },
  UNLOCK_FINAL: { label: 'Mo khoa Final', color: 'purple' },
  UNLOCK_ADMIN: { label: 'Mo khoa Admin', color: 'purple' },
  UNLOCK_KT: { label: 'Mo khoa KT', color: 'purple' },
} as const;
```

### 4.3 History Action Extensions

```typescript
// Extend HISTORY_ACTIONS from operator-config
export const LOCK_HISTORY_ACTIONS = {
  LOCK_KT: { label: 'Khoa KT', color: 'yellow' },
  LOCK_ADMIN: { label: 'Khoa Admin', color: 'orange' },
  LOCK_FINAL: { label: 'Khoa cuoi cung', color: 'red' },
  UNLOCK_KT: { label: 'Mo khoa KT', color: 'purple' },
  UNLOCK_ADMIN: { label: 'Mo khoa Admin', color: 'purple' },
  UNLOCK_FINAL: { label: 'Mo khoa Final', color: 'purple' },
} as const;
```

### 4.4 Implementation Skeleton

```typescript
// ============================================
// Lock Configuration - 3-Tier Lock System
// Constants, Vietnamese labels, colors
// ============================================

// Lock tier definitions with Vietnamese labels
export const LOCK_TIERS = {
  0: { label: 'Unlocked', labelVi: 'Chua khoa', color: 'gray', icon: 'LockOpen' },
  1: { label: 'KT Lock', labelVi: 'Khoa KT', color: 'yellow', icon: 'Lock' },
  2: { label: 'Admin Lock', labelVi: 'Khoa Admin', color: 'orange', icon: 'Lock' },
  3: { label: 'Final Lock', labelVi: 'Khoa cuoi', color: 'red', icon: 'ShieldCheck' },
} as const;

export type LockTierKey = keyof typeof LOCK_TIERS;
export const LOCK_TIER_KEYS = Object.keys(LOCK_TIERS).map(Number) as LockTierKey[];

// Lock action labels for UI buttons and history
export const LOCK_ACTIONS = {
  LOCK_KT: { label: 'Khoa KT', verb: 'khoa', color: 'yellow' },
  LOCK_ADMIN: { label: 'Khoa Admin', verb: 'khoa', color: 'orange' },
  LOCK_FINAL: { label: 'Khoa cuoi cung', verb: 'khoa', color: 'red' },
  UNLOCK_FINAL: { label: 'Mo khoa Final', verb: 'mo khoa', color: 'purple' },
  UNLOCK_ADMIN: { label: 'Mo khoa Admin', verb: 'mo khoa', color: 'purple' },
  UNLOCK_KT: { label: 'Mo khoa KT', verb: 'mo khoa', color: 'purple' },
} as const;

export type LockActionKey = keyof typeof LOCK_ACTIONS;

// History action types for audit trail (extends operator-config HISTORY_ACTIONS)
export const LOCK_HISTORY_ACTIONS = {
  LOCK_KT: { label: 'Khoa KT', color: 'yellow' },
  LOCK_ADMIN: { label: 'Khoa Admin', color: 'orange' },
  LOCK_FINAL: { label: 'Khoa cuoi', color: 'red' },
  UNLOCK_KT: { label: 'Mo KT', color: 'purple' },
  UNLOCK_ADMIN: { label: 'Mo Admin', color: 'purple' },
  UNLOCK_FINAL: { label: 'Mo Final', color: 'purple' },
} as const;

// Default lock tier for new records
export const DEFAULT_LOCK_TIER = 0;

// Helper to get tier info
export function getLockTierInfo(tier: number): typeof LOCK_TIERS[0] {
  return LOCK_TIERS[tier as LockTierKey] || LOCK_TIERS[0];
}

// Helper to check if tier represents locked state
export function isTierLocked(tier: number): boolean {
  return tier > 0;
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add 3-tier lock fields to Operator/Revenue, add RevenueHistory |
| `src/lib/id-utils.ts` | Create | Vietnamese diacritics, timestamp formatting, ServiceId |
| `src/lib/lock-utils.ts` | Create | Lock tiers, permissions, progression logic |
| `src/config/lock-config.ts` | Create | Lock constants, Vietnamese labels, colors |

---

## Verification Checklist

### Schema
- [⚠️] `npx prisma migrate dev` runs without errors (validate passed, migration pending)
- [x] `npx prisma generate` generates client types
- [x] Operator model has all lock tier fields (deviation: boolean fields instead of tier enum)
- [x] Revenue model has all lock tier fields (deviation: boolean fields instead of tier enum)
- [x] RevenueHistory model created with proper relations
- [x] Request model has requestId field (already present)

### ID Utils
- [x] `removeVietnameseDiacritics()` handles all Vietnamese chars (comprehensive map)
- [x] `formatTimestampForId()` returns `YYMMDD-HHMM` format (enhanced to full precision)
- [x] `generateServiceId()` returns `{bookingCode}-{timestamp}`
- [x] All functions export properly

### Lock Utils
- [x] `LockTier` type has 4 values (KT/Admin/Final + unlocked)
- [x] `canLockAtTier()` respects role permissions (implemented as canLock/canUnlock)
- [x] `canProgressLock()` enforces sequential progression (implemented as canLockTier)
- [x] `canUnlock()` enforces reverse order (implemented as canUnlockTier)
- [x] `isEditable()` returns false for any locked tier
- [x] `buildLockUpdate()` sets correct fields per tier (implemented as getLockFields)
- [x] `buildUnlockUpdate()` clears correct fields (implicit in getLockFields)

### Lock Config
- [⚠️] Vietnamese labels display without encoding issues (NOT TESTED at runtime)
- [x] Colors align with Tailwind color palette
- [x] Type exports work correctly
- [x] Helper functions return expected values

---

## Test Commands

```bash
# Schema validation
npx prisma validate

# Migration (dev)
npx prisma migrate dev --name add_3tier_lock_system

# Generate client
npx prisma generate

# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Notes

1. **Backward Compatibility**: Keep existing `isLocked`, `lockedAt`, `lockedBy` fields until full migration complete
2. **Vietnamese Encoding**: Ensure UTF-8 encoding in all files
3. **Role Import**: Import `Role` enum from `@prisma/client` in lock-utils
4. **History Integration**: RevenueHistory follows same pattern as OperatorHistory

---

## Code Review Status

**Reviewed**: 2026-01-08 15:55
**Status**: ✅ **APPROVED WITH MINOR WARNINGS**
**Report**: `plans/reports/code-reviewer-260108-1555-phase1-foundation-3tier-lock.md`

**Summary**:
- ✅ Schema valid (Prisma validate passed)
- ✅ All utilities implemented correctly
- ✅ No critical security or performance issues
- ⚠️ Schema uses boolean fields (deviation from plan's integer tier - APPROVED)
- ⚠️ Vietnamese encoding not tested at runtime (defer to Phase 2)
- ⚠️ Utilities not used yet (expected, integration in Phase 2a/2b)

**Next Actions**:
1. Run migration: `npx prisma migrate dev --name add_3tier_lock_system`
2. Proceed to Phase 2a (Operator API) - integrate lock utilities
3. Proceed to Phase 2b (Revenue API) - integrate ID utilities
4. Add unit tests during Phase 2 integration
