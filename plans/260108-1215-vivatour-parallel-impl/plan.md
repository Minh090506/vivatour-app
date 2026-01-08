---
title: "VivaTour Parallel Implementation"
description: "6-module parallel implementation: ID Generation, 3-Tier Lock, Revenue History, Google Sheets Sync"
status: pending
priority: P1
effort: 5h
branch: master
tags: [vivatour, parallel-impl, id-generation, 3-tier-lock, revenue-history]
created: 2026-01-08
---

# VivaTour Parallel Implementation Plan

## Executive Summary

Implement 6 modules across 3 terminal windows in parallel:
1. **Foundation** - Schema changes, ID utilities, migration scripts
2. **API Core** - Lock system upgrade, Revenue history, endpoint updates
3. **UI Components** - Lock dialogs, history panels, ID display
4. **Integration** - Google Sheets sync updates, E2E testing

**Total Effort**: ~5 hours | **Terminals**: 3 parallel windows

---

## Dependency Diagram

```
                    ┌─────────────────────────────────┐
                    │     PHASE 1: Foundation         │
                    │   (Must complete first)         │
                    │                                 │
                    │  ┌─────────┐   ┌─────────────┐  │
                    │  │ Schema  │   │  ID Utils   │  │
                    │  │ Changes │   │  Module     │  │
                    │  └────┬────┘   └──────┬──────┘  │
                    └───────┼───────────────┼─────────┘
                            │               │
         ┌──────────────────┴───────────────┴──────────────────┐
         │                                                      │
         ▼                                                      ▼
┌─────────────────────┐                           ┌──────────────────────┐
│  PHASE 2A: API      │                           │  PHASE 2B: API       │
│  Operator Module    │                           │  Revenue Module      │
│                     │                           │                      │
│  - 3-tier lock API  │                           │  - 3-tier lock API   │
│  - Lock endpoints   │                           │  - History table     │
│  - Batch operations │                           │  - Lock endpoints    │
└─────────┬───────────┘                           └───────────┬──────────┘
          │                                                    │
          │         ┌──────────────────────────┐              │
          │         │  PHASE 3: UI Components  │              │
          └────────►│                          │◄─────────────┘
                    │  - Lock tier dialogs     │
                    │  - History panels        │
                    │  - ID display components │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   PHASE 4: Integration   │
                    │                          │
                    │  - Google Sheets sync    │
                    │  - E2E testing           │
                    │  - Migration scripts     │
                    └──────────────────────────┘
```

---

## Terminal Window Assignment

### Window 1: Schema & Foundation (Phases 1, 4)
```
Files owned (NO TOUCH by other windows):
├── prisma/schema.prisma
├── src/lib/id-utils.ts (NEW)
├── src/lib/lock-utils.ts (NEW)
├── scripts/migrate-ids.ts (NEW)
├── scripts/backfill-lock-tiers.ts (NEW)
└── src/config/lock-config.ts (NEW)
```

### Window 2: Operator Module (Phase 2A, 3A)
```
Files owned:
├── src/app/api/operators/[id]/lock/route.ts
├── src/app/api/operators/[id]/unlock/route.ts
├── src/app/api/operators/lock-period/route.ts
├── src/app/(dashboard)/operators/[id]/page.tsx
├── src/components/operators/operator-lock-dialog.tsx
├── src/components/operators/operator-lock-tier-badge.tsx (NEW)
└── src/components/operators/operator-history-panel.tsx
```

### Window 3: Revenue Module (Phase 2B, 3B)
```
Files owned:
├── src/app/api/revenues/[id]/lock/route.ts
├── src/app/api/revenues/[id]/unlock/route.ts
├── src/app/api/revenues/route.ts
├── src/app/(dashboard)/revenues/page.tsx
├── src/components/revenues/revenue-table.tsx
├── src/components/revenues/revenue-history-panel.tsx (NEW)
└── src/components/revenues/revenue-lock-dialog.tsx (NEW)
```

---

## Critical Decisions (NEEDS USER INPUT)

Before implementation, confirm these decisions:

### 1. Lock Tier Naming
```
Options:
A) lockKT → lockAdmin → lockFinal (current proposal)
B) lockAccountant → lockManager → lockAudit
C) lockL1 → lockL2 → lockL3 (generic)

Recommendation: Option A (matches Vietnamese workflow: KT = Ke Toan)
```

### 2. Lock Progression Rules
```
Question: Must locks progress sequentially (L1 → L2 → L3)?
A) Sequential only - cannot skip tiers
B) Independent - any tier can be locked anytime
C) Sequential lock, independent unlock

Recommendation: Option A (audit trail clarity)
```

### 3. Unlock Cascade Behavior
```
Question: When unlocking tier-2, what happens to tier-1?
A) Auto-unlock tier-1 (cascade down)
B) Tier-1 stays locked (independent)
C) Require unlock in reverse order (L3 → L2 → L1)

Recommendation: Option C (data integrity)
```

### 4. Revenue History Table
```
Question: Create new table or extend pattern?
A) New RevenueHistory table (parallel to OperatorHistory)
B) Unified AuditHistory table for all modules
C) Extend OperatorHistory to handle both

Recommendation: Option A (cleaner separation, same pattern)
```

### 5. BookingCode Cardinality
```
Question: BookingCode relationship to Request?
A) 1:1 - Each request has unique bookingCode
B) 1:many - Multiple requests can share bookingCode (group tours)

Current schema: 1:many (no unique constraint)
Recommendation: Keep 1:many (confirmed by research)
```

---

## Implementation Phases

### Phase 1: Foundation (1.5h) - Window 1
See: `phase-01-foundation.md`

**Tasks:**
1. Schema changes - Add lock tier fields, history table
2. ID Utils module - RequestID, ServiceID, RevenueID generators
3. Lock Utils module - Tier validation, progression rules
4. Config module - Lock tier definitions, permissions

**Blocking:** All other phases depend on this

---

### Phase 2: API Core (1.5h) - Windows 2 & 3 parallel

#### Phase 2A: Operator API (Window 2)
See: `phase-02a-operator-api.md`

**Tasks:**
1. Update lock endpoint for 3-tier system
2. Update unlock endpoint with cascade rules
3. Update lock-period batch endpoint
4. Add history entries for tier transitions

#### Phase 2B: Revenue API (Window 3)
See: `phase-02b-revenue-api.md`

**Tasks:**
1. Create RevenueHistory model migration
2. Update lock/unlock endpoints for 3-tier
3. Add history tracking to all operations
4. Update revenue creation with revenueId

---

### Phase 3: UI Components (1h) - Windows 2 & 3 parallel

#### Phase 3A: Operator UI (Window 2)
See: `phase-03a-operator-ui.md`

**Tasks:**
1. Lock tier badge component (shows all 3 tiers)
2. Update lock dialog for tier selection
3. Update history panel for tier events
4. Detail page lock indicator updates

#### Phase 3B: Revenue UI (Window 3)
See: `phase-03b-revenue-ui.md`

**Tasks:**
1. Revenue history panel component
2. Lock dialog with tier selection
3. Revenue table lock column updates
4. RevenueID display in list/detail

---

### Phase 4: Integration (1h) - Window 1
See: `phase-04-integration.md`

**Tasks:**
1. Google Sheets sync - Preserve existing `code` field
2. Migration script - Backfill new ID fields
3. Lock tier migration - Set defaults for existing records
4. E2E testing - Lock workflows, ID generation

---

## Schema Changes Summary

```prisma
// Operator - Add lock tiers
model Operator {
  // ... existing fields ...

  // Lock tiers (replaces single isLocked)
  lockKT         Boolean   @default(false)
  lockKTAt       DateTime?
  lockKTBy       String?
  lockAdmin      Boolean   @default(false)
  lockAdminAt    DateTime?
  lockAdminBy    String?
  lockFinal      Boolean   @default(false)
  lockFinalAt    DateTime?
  lockFinalBy    String?

  // New ID field
  serviceId      String?   @unique
}

// Revenue - Add lock tiers + history
model Revenue {
  // ... existing fields ...

  // Lock tiers
  lockKT         Boolean   @default(false)
  lockKTAt       DateTime?
  lockKTBy       String?
  lockAdmin      Boolean   @default(false)
  lockAdminAt    DateTime?
  lockAdminBy    String?
  lockFinal      Boolean   @default(false)
  lockFinalAt    DateTime?
  lockFinalBy    String?

  // History relation
  history        RevenueHistory[]
}

// NEW: Revenue History
model RevenueHistory {
  id          String   @id @default(cuid())
  revenueId   String
  revenue     Revenue  @relation(fields: [revenueId], references: [id], onDelete: Cascade)
  action      String   // CREATE, UPDATE, LOCK_KT, LOCK_ADMIN, LOCK_FINAL, UNLOCK_*
  changes     Json
  userId      String
  createdAt   DateTime @default(now())

  @@index([revenueId])
  @@index([createdAt])
  @@map("revenue_history")
}

// Request - Add requestId
model Request {
  // ... existing fields ...
  requestId      String?   @unique  // {SellerCode}{yyyyMMddHHmmssSSS}

  @@index([requestId])
}
```

---

## ID Generation Formats

| Entity | Field | Format | Example |
|--------|-------|--------|---------|
| Request | requestId | `{SellerCode}{yyyyMMddHHmmssSSS}` | `LY20260108143045123` |
| Request | code | (unchanged - Sheet sync key) | `AR-12345` |
| Request | bookingCode | `{yyyyMMdd}{SellerCode}{####}` | `20260108L0001` |
| Operator | serviceId | `{bookingCode}-{yyyyMMddHHmmssSSS}` | `20260108L0001-20260108143045123` |
| Revenue | revenueId | `{bookingCode}-{yyyyMMddHHmmss}-{row}` | `20260108L0001-20260108143045-1` |

---

## Permission Matrix

| Role | lockKT | unlockKT | lockAdmin | unlockAdmin | lockFinal | unlockFinal |
|------|--------|----------|-----------|-------------|-----------|-------------|
| SELLER | No | No | No | No | No | No |
| OPERATOR | No | No | No | No | No | No |
| ACCOUNTANT | Yes | Yes | No | No | No | No |
| ADMIN | Yes | Yes | Yes | Yes | Yes | Yes |

---

## Validation Questions for User

1. **Lock tier naming**: Confirm `lockKT → lockAdmin → lockFinal` naming convention?

2. **Sequential progression**: Require sequential locking (KT first, then Admin, then Final)?

3. **Reverse unlock order**: Require unlocking in reverse (Final first, then Admin, then KT)?

4. **Edit restrictions**: At which lock tier should edits be completely blocked?
   - Option A: Any lock tier blocks edits
   - Option B: Only lockFinal blocks edits

5. **Batch lock tier**: When batch-locking a period, which tier to apply?
   - Option A: Always lockKT (accountant review tier)
   - Option B: Configurable per operation

6. **Migration default**: For existing `isLocked=true` records, map to which tier?
   - Option A: Map to lockKT
   - Option B: Map to lockAdmin
   - Option C: Map to lockFinal

---

## Success Criteria

- [ ] All 6 modules implemented and working
- [ ] 3-tier lock system functional for Operator & Revenue
- [ ] ID generation working for Request, Operator, Revenue
- [ ] History tracking for all lock operations
- [ ] Google Sheets sync unchanged (code field preserved)
- [ ] Migration script handles existing data
- [ ] No TypeScript/build errors
- [ ] Lint passes

---

## Files Index

```
plans/260108-1215-vivatour-parallel-impl/
├── plan.md (this file)
├── research/
│   ├── researcher-01-existing-modules.md
│   └── researcher-02-id-generation.md
├── phase-01-foundation.md
├── phase-02a-operator-api.md
├── phase-02b-revenue-api.md
├── phase-03a-operator-ui.md
├── phase-03b-revenue-ui.md
└── phase-04-integration.md
```

---

## Unresolved Questions

1. Should OPERATOR role be able to view lock status but not modify?
2. What happens to pending approvals when lockKT is applied?
3. Should lock operations require confirmation dialog in UI?
4. Is there a timeout/auto-lock feature needed for month-end?
5. Should unlock operations send notifications to other users?
