# Revenue Components Analysis Report

**Date**: 2026-01-11
**Analyst**: Planner Agent
**Scope**: 5 Revenue components for RTL testing

## Executive Summary

Analyzed 5 revenue components (1,193 total lines) to define RTL test requirements. Components follow patterns from operator module with 3-tier lock system, history tracking, and Vietnamese UI. Estimated ~65 tests needed.

## Component Analysis

### 1. RevenueForm (329 lines)

**Purpose**: Create/edit revenue records with multi-currency support

**Key Features**:
- Request dropdown (fetches OUTCOME stage requests)
- Payment type/source selection
- CurrencyInput component for multi-currency
- 3-tier lock awareness (disables editing when locked)
- Validation: required fields, positive VND amount

**Props**:
```typescript
interface RevenueFormProps {
  revenue?: RevenueData;      // Edit mode if provided
  requestId?: string;         // Pre-selected request
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**State Dependencies**:
- `usePermission()` for userId
- `safeFetch`, `safePost`, `safePut` from fetch-utils

**Test Priority**: High (core CRUD)

---

### 2. RevenueTable (379 lines)

**Purpose**: Display revenue list with row actions

**Key Features**:
- Conditional booking column (showRequest prop)
- 3-tier lock badge display (LockTierBadgeCompact)
- Row actions: Edit, Lock, Unlock, History, Delete
- Permission-based action visibility
- Delete confirmation dialog
- Inline history sheet

**Subcomponent**: RevenueRow (internal, 193 lines)

**Props**:
```typescript
interface RevenueTableProps {
  revenues: Revenue[];
  showRequest?: boolean;      // Show booking column
  onEdit?: (revenue: Revenue) => void;
  onRefresh?: () => void;
  canManage?: boolean;        // Show actions column
  canUnlock?: boolean;
}
```

**Lock Logic**:
- Sequential unlock: Final -> Admin -> KT
- canLockMore = !lockFinal
- nextUnlockTier calculated from current state

**Test Priority**: High (main data display)

---

### 3. RevenueLockDialog (145 lines)

**Purpose**: Modal for applying lock tiers to revenue

**Key Features**:
- Sequential tier progression (KT -> Admin -> Final)
- Disabled options with status messages
- API call to POST /api/revenues/:id/lock
- Error display with AlertCircle icon
- State reset on close

**Props**:
```typescript
interface RevenueLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenueId: string;
  currentState: LockState;
  onSuccess: () => void;
}
```

**Tier Availability**:
- canLockKT = !currentState.lockKT
- canLockAdmin = lockKT && !lockAdmin
- canLockFinal = lockAdmin && !lockFinal

**Test Priority**: Medium

---

### 4. RevenueHistoryPanel (180 lines)

**Purpose**: Display audit trail with timeline UI

**Key Features**:
- Fetches /api/revenues/:id/history on mount
- Loading skeleton (3 items)
- Empty state with History icon
- Action-specific icons and colors (ACTION_CONFIG)
- Vietnamese relative timestamps (date-fns/vi)
- Tier badge for lock actions

**ACTION_CONFIG**:
- CREATE: blue, Plus
- UPDATE: gray, Edit
- DELETE: red, Trash
- LOCK_KT/ADMIN/FINAL: amber/orange/red, Lock
- UNLOCK_*: lighter variants, Unlock

**Props**:
```typescript
interface RevenueHistoryPanelProps {
  revenueId: string;
}
```

**Test Priority**: Medium

---

### 5. RevenueSummaryCard (160 lines)

**Purpose**: Display revenue statistics in 4 cards

**Key Features**:
- Total revenue (refunds subtracted)
- Deposit total
- Total locked amount
- Lock tier breakdown (KT/Admin/Final counts)

**Calculations**:
```typescript
// Total: sum all, subtract refunds
// Deposit: filter paymentType === 'DEPOSIT'
// Locked: any lock tier active (3-tier + legacy isLocked)
// Tier breakdown: mutually exclusive counts
```

**Props**:
```typescript
interface RevenueSummaryCardProps {
  revenues: Revenue[];
  className?: string;
}
```

**Test Priority**: Low (presentational)

## Shared Patterns

### Lock State Interface
```typescript
interface LockState {
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
}
```

### Revenue Interface
```typescript
interface Revenue {
  id: string;
  paymentDate: Date | string;
  paymentType: string;        // DEPOSIT, FULL_PAYMENT, PARTIAL, REFUND
  paymentSource: string;      // BANK_TRANSFER, CASH, etc.
  foreignAmount?: number;
  currency?: string;
  exchangeRate?: number;
  amountVND: number;
  notes?: string;
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
  isLocked?: boolean;         // Legacy field
  request?: { code, customerName, bookingCode };
}
```

## Mock Requirements

### API Endpoints
- GET /api/requests?stage=OUTCOME (RevenueForm)
- POST /api/revenues (create)
- PUT /api/revenues/:id (update)
- DELETE /api/revenues/:id
- POST /api/revenues/:id/lock
- POST /api/revenues/:id/unlock
- GET /api/revenues/:id/history

### External Dependencies
- `@/lib/api/fetch-utils` (safeFetch, safePost, safePut)
- `@/hooks/use-permission`
- `@/lib/utils` (formatDate, formatCurrency)
- `@/config/lock-config` (LOCK_TIER_LABELS, HISTORY_ACTION_LABELS)
- `sonner` (toast)
- `date-fns` (formatDistanceToNow) with `vi` locale

## Test Estimation

| Component | Tests | Lines |
|-----------|-------|-------|
| test-utils.ts | - | ~150 |
| revenue-form.test.tsx | 15 | ~350 |
| revenue-table.test.tsx | 18 | ~450 |
| revenue-lock-dialog.test.tsx | 12 | ~300 |
| revenue-history-panel.test.tsx | 10 | ~200 |
| revenue-summary-card.test.tsx | 10 | ~200 |
| **Total** | **65** | **~1,650** |

## Comparison with Operator Tests

| Operator Component | Lines | Revenue Equivalent |
|--------------------|-------|-------------------|
| operator-form.test.tsx | 558 | revenue-form: ~350 |
| operator-approval-table.test.tsx | 427 | revenue-table: ~450 |
| operator-lock-dialog.test.tsx | 502 | revenue-lock-dialog: ~300 |
| operator-history-panel.test.tsx | 309 | revenue-history-panel: ~200 |
| operator-list-filters.test.tsx | 391 | revenue-summary-card: ~200 |

Revenue tests should be ~30% smaller due to simpler component logic (no batch operations, no approval workflow).

## Unresolved Questions

None - all component patterns are clear from existing operator tests.
