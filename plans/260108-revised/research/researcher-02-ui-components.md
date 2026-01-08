# Research: UI Components for 3-Tier Lock System
**Date:** 2026-01-08 | **Status:** Complete

## Summary
VivaTour codebase has **basic binary lock infrastructure** but **NO 3-tier lock components exist**. Current implementation: simple `isLocked` boolean with single-level indicator. Zero conflicts with 3-tier plan but full component scaffolding required.

---

## Existing Components Inventory

### Operators (src/components/operators/)
| Component | Status | Purpose |
|-----------|--------|---------|
| `lock-indicator.tsx` | EXISTS | Binary lock badge (Khóa/Chưa khóa) - REUSABLE AS-IS |
| `operator-lock-dialog.tsx` | EXISTS | Period-based bulk lock dialog - CAN EXTEND for tier selection |
| `operator-history-panel.tsx` | EXISTS | Audit trail with LOCK/UNLOCK actions - REUSABLE |
| `operator-approval-table.tsx` | EXISTS | Payment status table with lock column |
| `operator-list-filters.tsx` | EXISTS | Filters (serviceType, paymentStatus, etc.) |
| `operator-form.tsx` | EXISTS | Service CRUD form |
| Lock tier badge | MISSING | New component needed for TIER1/TIER2/TIER3 display |
| Lock tier dialog | MISSING | Enhanced dialog for tier selection + approval workflow |
| Lock tier history | MISSING | Specialized history showing tier transitions |

### Revenues (src/components/revenues/)
| Component | Status | Purpose |
|-----------|--------|---------|
| `revenue-table.tsx` | EXISTS | Revenue list with lock/unlock buttons (lines 57, 86) |
| `revenue-form.tsx` | EXISTS | Revenue CRUD form |
| `revenue-summary-card.tsx` | EXISTS | Stats card |
| Lock tier badge | MISSING | TIER1/TIER2/TIER3 indicator for revenue |
| Lock tier dialog | MISSING | Revenue-specific tier lock dialog |
| Lock tier history | MISSING | Revenue audit trail with tier transitions |

### Types (src/types/index.ts)
| Type | Status | Details |
|------|--------|---------|
| `Operator` interface (line 136) | EXISTS | Has `isLocked`, `lockedAt`, `lockedBy` (binary) |
| `Revenue` interface (line 179) | EXISTS | Has `isLocked`, `lockedAt`, `lockedBy` (binary) |
| `OperatorHistoryEntry` (line 464) | EXISTS | action: 'CREATE'|'UPDATE'|'DELETE'|'LOCK'|'UNLOCK'|'APPROVE' |
| Lock tier enum | MISSING | NEW: TIER1 | TIER2 | TIER3 required |
| Lock reason enum | MISSING | NEW: Required for audit trail context |
| Lock hierarchy type | MISSING | NEW: Define approval chain per tier |

---

## Current Lock Implementation Patterns

### Database Schema (prisma/schema.prisma)
**Operator Model (lines 147-150):**
```prisma
isLocked        Boolean   @default(false)
lockedAt        DateTime?
lockedBy        String?
```

**Revenue Model (lines 216-219):**
```prisma
isLocked        Boolean   @default(false)
lockedAt        DateTime?
lockedBy        String?
```

**No fields for:**
- Lock tier level
- Lock reason
- Lock approval chain
- Unlock request tracking
- Tier transition history

### API Routes (Existing)
- `POST /api/operators/lock-period` - Bulk monthly lock by month filter
- `POST /api/operators/[id]/lock` - Single operator lock
- `POST /api/operators/[id]/unlock` - Single operator unlock (ADMIN only)
- `POST /api/revenues/[id]/lock` - Single revenue lock
- `POST /api/revenues/[id]/unlock` - Single revenue unlock (ADMIN only)

**Pattern:** Lock operations require session/admin check. NO tier routing detected.

### UI Lock Indicators
- `LockIndicator` component: Binary display (Lock icon + "Khóa" or Unlock + "Chưa khóa")
- Color scheme: Amber/yellow for locked, gray for unlocked
- No tier differentiation or color hierarchy

---

## Plan Alignment Check

### Conflicts Found
**NONE.** Current binary implementation is fully compatible with 3-tier extension:
- Prisma schema migration straightforward (add `lockTier` enum field)
- Existing `isLocked` can remain as convenience field (derived from lockTier)
- Lock/unlock routes can accept tier parameter
- History actions already support custom tier actions

### Integration Points (Minimal Breaking Changes)
1. **Type definitions:** Add `LockTier` enum to types/index.ts
2. **Schema migration:** Add `lockTier` field to Operator/Revenue (backward compatible)
3. **Components:** Wrap existing `LockIndicator` in tier-aware wrapper
4. **APIs:** Accept optional `lockTier` parameter in lock routes

---

## Missing Components To Build

### High Priority
1. **LockTierBadge** - Displays TIER1/TIER2/TIER3 with color/icon differentiation
2. **LockTierDialog** - Multi-step dialog for tier selection + approval workflow
3. **LockTierHistory** - Enhanced history panel showing tier + reason + approvals

### Medium Priority
4. **LockApprovalQueue** - ADMIN dashboard showing pending tier lock requests
5. **LockReasonSelect** - Common lock reasons (Month-end, Audit, Reconciliation, Manual)
6. **LockTierTable** - Enhanced operator/revenue tables with tier column

### Low Priority
7. Documentation components (help tooltips for tier meanings)
8. Tier unlock request form (TIER2/TIER3 unlock approval workflow)

---

## Code Patterns to Follow

### Existing Config Pattern (operator-config.ts)
```typescript
export const PAYMENT_STATUSES = {
  PENDING: { label: 'Chờ thanh toán', color: 'yellow' },
  PAID: { label: 'Đã thanh toán', color: 'green' },
} as const;
```

**Apply to lock-config.ts (NEW):**
```typescript
export const LOCK_TIERS = {
  TIER1: { label: 'Khóa thông thường', color: 'yellow', icon: 'Lock' },
  TIER2: { label: 'Khóa yêu cầu duyệt', color: 'orange', icon: 'LockAlert' },
  TIER3: { label: 'Khóa quản trị viên', color: 'red', icon: 'LockKeyhole' },
}
```

### Existing Badge Pattern (revenue-table.tsx, revenue-summary-card.tsx)
Uses shadcn `<Badge>` with `variant="outline"` or `variant="secondary"`. Lock tier badges should follow same pattern.

### Existing Dialog Pattern (operator-lock-dialog.tsx)
Multi-step confirmation with preview count. Lock tier dialog should extend this with approval routing.

---

## File Paths for New Components

```
src/components/
├── operators/
│   ├── lock-tier-badge.tsx          (NEW)
│   ├── lock-tier-dialog.tsx         (NEW)
│   ├── lock-tier-history.tsx        (NEW)
│   └── lock-approval-queue.tsx      (NEW)
├── revenues/
│   ├── lock-tier-badge.tsx          (NEW - can share operator version)
│   └── lock-tier-dialog.tsx         (NEW)
├── ui/
│   └── lock-reason-select.tsx       (NEW)
└── shared/
    └── lock-config.ts              (NEW config file)
```

---

## Unresolved Questions

1. Should existing `LockIndicator` be deprecated or wrapped for backward compatibility?
2. Will TIER2 approvals create new database tables or use OperatorHistory with status tracking?
3. Should lock tier transitions be triggered by API or UI multi-step flow?
4. Any specific Vietnamese terminology preferences for tier names beyond "Khóa thông thường" etc?
