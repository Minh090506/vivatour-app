---
title: "VivaTour 3-Tier Lock Implementation (Revised)"
description: "Implement 3-tier lock system for Operator & Revenue modules with parallel execution"
status: pending
priority: P1
effort: 4h
branch: master
tags: [vivatour, 3-tier-lock, operator, revenue, parallel-impl]
created: 2026-01-08
---

# VivaTour 3-Tier Lock Implementation (Revised)

## Executive Summary

**Revised from:** `plans/260108-1215-vivatour-parallel-impl/`

This plan implements 3-tier lock system (KT → Admin → Final) for Operator and Revenue modules across 3 parallel terminal windows.

### Key Changes from Original Plan

| Item | Original | Revised | Reason |
|------|----------|---------|--------|
| ID Generation | Full RQID + BookingCode + ServiceID + RevenueID | ServiceID only (Operator) | Request ID already exists via `code` field; BookingCode implemented in request-utils.ts |
| Schema Fields | Add requestId to Request | Skip | Request.code serves as unique ID; Request.rqid exists as legacy |
| RevenueID | Generate revenueId | Use existing field | Revenue.revenueId field exists (from Sheet sync) |
| ID Utils | New src/lib/id-utils.ts | Skip ID generation | Only serviceId needed; can use simple timestamp |

### What's Already Implemented

1. **Request Module**
   - `Request.code` - Unique sync key ✅
   - `Request.rqid` - Legacy ID (RQ-YYMMDD-0001) ✅
   - `Request.bookingCode` - Booking code ✅
   - `generateBookingCode()` in request-utils.ts ✅

2. **Operator Lock (Single-Tier)**
   - `Operator.isLocked`, `lockedAt`, `lockedBy` ✅
   - `/api/operators/[id]/lock` route ✅
   - `/api/operators/[id]/unlock` route ✅
   - `/api/operators/lock-period` batch route ✅
   - `OperatorHistory` model ✅
   - `operator-lock-dialog.tsx` ✅
   - `operator-history-panel.tsx` ✅

3. **Revenue Lock (Single-Tier)**
   - `Revenue.isLocked`, `lockedAt`, `lockedBy` ✅
   - `Revenue.revenueId` field ✅
   - `/api/revenues/[id]/lock` route ✅
   - `/api/revenues/[id]/unlock` route ✅

### What Needs Implementation

1. **Schema Changes**
   - Add 3-tier lock fields to Operator (lockKT, lockAdmin, lockFinal + timestamps)
   - Add 3-tier lock fields to Revenue
   - Add serviceId to Operator
   - Add RevenueHistory model

2. **New Utilities**
   - `src/lib/lock-utils.ts` - Tier validation, progression rules
   - `src/config/lock-config.ts` - Lock tier labels, colors, permissions

3. **API Updates**
   - Update lock/unlock endpoints to accept tier parameter
   - Update lock-period endpoint for tier support
   - Add revenue history endpoint
   - Add revenue-history.ts utility

4. **UI Components**
   - `operator-lock-tier-badge.tsx` - 3-tier badge display
   - `revenue-history-panel.tsx` - Revenue audit trail
   - `revenue-lock-dialog.tsx` - Tier selection dialog
   - Update existing dialogs for tier selection

---

## Dependency Diagram

```
                    ┌─────────────────────────────────┐
                    │     PHASE 1: Foundation         │
                    │   (Must complete first)         │
                    │                                 │
                    │  ┌─────────────┐ ┌───────────┐  │
                    │  │   Schema    │ │ Lock Utils│  │
                    │  │   Changes   │ │  + Config │  │
                    │  └──────┬──────┘ └─────┬─────┘  │
                    └─────────┼───────────────┼───────┘
                              │               │
         ┌────────────────────┴───────────────┴────────────────┐
         │                                                      │
         ▼                                                      ▼
┌─────────────────────┐                           ┌──────────────────────┐
│  PHASE 2A: API      │                           │  PHASE 2B: API       │
│  Operator Module    │                           │  Revenue Module      │
│                     │                           │                      │
│  - Update lock API  │                           │  - Update lock API   │
│  - Update unlock    │                           │  - Update unlock     │
│  - Update lock-per  │                           │  - Add history util  │
│  - Add serviceId    │                           │  - Add history API   │
└─────────┬───────────┘                           └───────────┬──────────┘
          │                                                    │
          │         ┌──────────────────────────┐              │
          │         │  PHASE 3: UI Components  │              │
          └────────►│                          │◄─────────────┘
                    │  - Lock tier badges      │
                    │  - Update dialogs        │
                    │  - History panels        │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   PHASE 4: Integration   │
                    │                          │
                    │  - Migration scripts     │
                    │  - Type updates          │
                    │  - Build verification    │
                    └──────────────────────────┘
```

---

## Terminal Window Assignment

### Window 1: Schema & Foundation (Phases 1, 4)
```
Files owned:
├── prisma/schema.prisma
├── src/lib/lock-utils.ts (NEW)
├── src/config/lock-config.ts (NEW)
├── src/types/index.ts (UPDATE)
├── scripts/migrate-lock-tiers.ts (NEW)
└── scripts/backfill-service-ids.ts (NEW)
```

### Window 2: Operator Module (Phase 2A, 3A)
```
Files owned:
├── src/app/api/operators/[id]/lock/route.ts (UPDATE)
├── src/app/api/operators/[id]/unlock/route.ts (UPDATE)
├── src/app/api/operators/lock-period/route.ts (UPDATE)
├── src/app/api/operators/route.ts (UPDATE - serviceId gen)
├── src/components/operators/operator-lock-tier-badge.tsx (NEW)
├── src/components/operators/operator-lock-dialog.tsx (UPDATE)
└── src/components/operators/operator-history-panel.tsx (UPDATE)
```

### Window 3: Revenue Module (Phase 2B, 3B)
```
Files owned:
├── src/lib/revenue-history.ts (NEW)
├── src/app/api/revenues/[id]/lock/route.ts (UPDATE)
├── src/app/api/revenues/[id]/unlock/route.ts (UPDATE)
├── src/app/api/revenues/[id]/history/route.ts (NEW)
├── src/components/revenues/revenue-history-panel.tsx (NEW)
├── src/components/revenues/revenue-lock-dialog.tsx (NEW)
└── src/components/revenues/revenue-table.tsx (UPDATE)
```

---

## Implementation Phases

### Phase 1: Foundation (45 min) - Window 1
See: `phase-01-foundation.md`

**Tasks:**
1. Schema changes - Add lock tier fields, RevenueHistory model, serviceId
2. Lock Utils module - Tier validation, progression rules
3. Lock Config module - Labels, colors, permissions
4. Type updates - Add lock tier types

**Blocking:** All other phases depend on this

---

### Phase 2: API Core (45 min) - Windows 2 & 3 parallel

#### Phase 2A: Operator API (Window 2)
See: `phase-02a-operator-api.md`

**Tasks:**
1. Update lock endpoint for tier parameter
2. Update unlock endpoint with reverse order
3. Update lock-period batch endpoint
4. Add serviceId generation on create

#### Phase 2B: Revenue API (Window 3)
See: `phase-02b-revenue-api.md`

**Tasks:**
1. Create revenue-history.ts utility
2. Update lock/unlock endpoints for tier
3. Add history endpoint
4. Add history tracking to operations

---

### Phase 3: UI Components (30 min) - Windows 2 & 3 parallel

#### Phase 3A: Operator UI (Window 2)
See: `phase-03a-operator-ui.md`

**Tasks:**
1. Create lock tier badge component
2. Update lock dialog for tier selection
3. Update history panel for tier events

#### Phase 3B: Revenue UI (Window 3)
See: `phase-03b-revenue-ui.md`

**Tasks:**
1. Create revenue history panel
2. Create revenue lock dialog
3. Update revenue table lock column

---

### Phase 4: Integration (20 min) - Window 1
See: `phase-04-integration.md`

**Tasks:**
1. Migration script for existing isLocked → lockKT
2. Backfill script for serviceId
3. Build verification
4. Type regeneration

---

## Schema Changes Summary

```prisma
// Operator - Add lock tiers + serviceId
model Operator {
  // ... existing fields ...

  // NEW: 3-tier lock fields
  lockKT         Boolean   @default(false)
  lockKTAt       DateTime?
  lockKTBy       String?
  lockAdmin      Boolean   @default(false)
  lockAdminAt    DateTime?
  lockAdminBy    String?
  lockFinal      Boolean   @default(false)
  lockFinalAt    DateTime?
  lockFinalBy    String?

  // NEW: Unique service identifier
  serviceId      String?   @unique

  @@index([serviceId])
}

// Revenue - Add lock tiers + history relation
model Revenue {
  // ... existing fields ...

  // NEW: 3-tier lock fields
  lockKT         Boolean   @default(false)
  lockKTAt       DateTime?
  lockKTBy       String?
  lockAdmin      Boolean   @default(false)
  lockAdminAt    DateTime?
  lockAdminBy    String?
  lockFinal      Boolean   @default(false)
  lockFinalAt    DateTime?
  lockFinalBy    String?

  // NEW: History relation
  history        RevenueHistory[]
}

// NEW: Revenue History model
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
```

---

## Permission Matrix

| Role | lockKT | unlockKT | lockAdmin | unlockAdmin | lockFinal | unlockFinal |
|------|--------|----------|-----------|-------------|-----------|-------------|
| SELLER | No | No | No | No | No | No |
| OPERATOR | No | No | No | No | No | No |
| ACCOUNTANT | Yes | Yes | No | No | No | No |
| ADMIN | Yes | Yes | Yes | Yes | Yes | Yes |

---

## Success Criteria

- [ ] 3-tier lock system functional for Operator & Revenue
- [ ] ServiceId generated for new operators
- [ ] History tracking for all Revenue lock operations
- [ ] Lock tier badges display correctly
- [ ] Existing isLocked records migrated to lockKT
- [ ] No TypeScript/build errors
- [ ] Lint passes

---

## Files Index

```
plans/260108-revised/
├── plan.md (this file)
├── research/
│   ├── researcher-01-schema-api.md
│   └── researcher-02-ui-components.md
├── phase-01-foundation.md
├── phase-02a-operator-api.md
├── phase-02b-revenue-api.md
├── phase-03a-operator-ui.md
├── phase-03b-revenue-ui.md
└── phase-04-integration.md
```

---

## Validation Summary

**Validated:** 2026-01-08
**Questions asked:** 6

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| ServiceId Format | `{bookingCode}-{timestamp}` - Enables chronological sorting, links to booking |
| Edit Blocking | Any tier (lockKT) blocks edits - Strictest approach |
| Migration Default | Map `isLocked=true` → `lockKT` (tier 1) - Conservative |
| Lock Progression | Sequential only (KT → Admin → Final) - Clear audit trail |
| Unlock Order | Reverse order required (Final → Admin → KT) - Data integrity |
| Legacy isLocked | Keep in sync - `isLocked = lockKT \|\| lockAdmin \|\| lockFinal` |

### Action Items
- [x] Plan already aligns with confirmed decisions
- [x] No phase file changes required

---

## Resolved Questions

1. **ServiceId Format**: ✅ `{bookingCode}-{timestamp}` - Enables chronological sorting
2. **Edit Blocking**: ✅ Any lock tier blocks edits - Strictest protection
3. **Migration Default**: ✅ Map existing `isLocked=true` to lockKT (tier 1)
4. **Lock Progression**: ✅ Sequential only (KT → Admin → Final)
5. **Unlock Order**: ✅ Reverse order required (Final → Admin → KT)
6. **Legacy Field**: ✅ Keep `isLocked` in sync with any tier lock state
