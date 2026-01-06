---
title: "Phase 6: Revenue Module Implementation"
description: "Complete Revenue module for MyVivaTour (Request/Operator done)"
status: pending
priority: P1
effort: 3h
branch: master
tags: [revenue, multi-currency, accounting]
created: 2026-01-06
---

# Phase 6: Revenue Module Implementation Plan

## Executive Summary

Request and Operator modules are **90%+ complete**. Only the **Revenue module** requires full implementation (~3h total).

Revenue module provides payment tracking with multi-currency support, links to Requests, follows accounting lock pattern from Operator module.

---

## Implementation Status

| Module | Status | Completion |
|--------|--------|------------|
| Request | COMPLETE | 95% |
| Operator | COMPLETE | 95% |
| **Revenue** | **NOT STARTED** | **0%** |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 6: Revenue Module                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1-A (Backend)          Phase 1-B (Frontend)          │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ Revenue API     │          │ Revenue UI      │          │
│  │ - CRUD routes   │  ←───→   │ - Form          │          │
│  │ - Lock/Unlock   │ PARALLEL │ - Table         │          │
│  │ - Config        │          │ - Summary       │          │
│  └────────┬────────┘          └────────┬────────┘          │
│           │                            │                    │
│           └──────────┬─────────────────┘                    │
│                      ▼                                      │
│           ┌─────────────────┐                               │
│           │ Phase 2         │                               │
│           │ Integration     │                               │
│           │ - Revenue page  │                               │
│           │ - Request panel │                               │
│           │   update        │                               │
│           └────────┬────────┘                               │
│                    ▼                                        │
│           ┌─────────────────┐                               │
│           │ Phase 3         │                               │
│           │ Testing/Polish  │                               │
│           └─────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Parallel Execution Strategy

### Can Run In Parallel
- **Phase 1-A** (Backend) + **Phase 1-B** (Frontend) - NO SHARED FILES

### Must Run Sequential
- **Phase 2** depends on Phase 1-A + 1-B completion
- **Phase 3** depends on Phase 2 completion

---

## File Ownership Matrix

| Phase | File | Operation |
|-------|------|-----------|
| **1-A** | `src/app/api/revenues/route.ts` | CREATE |
| **1-A** | `src/app/api/revenues/[id]/route.ts` | CREATE |
| **1-A** | `src/app/api/revenues/[id]/lock/route.ts` | CREATE |
| **1-A** | `src/app/api/revenues/[id]/unlock/route.ts` | CREATE |
| **1-A** | `src/config/revenue-config.ts` | CREATE |
| **1-B** | `src/components/revenues/revenue-form.tsx` | CREATE |
| **1-B** | `src/components/revenues/revenue-table.tsx` | CREATE |
| **1-B** | `src/components/revenues/revenue-summary-card.tsx` | CREATE |
| **1-B** | `src/components/revenues/index.ts` | CREATE |
| **1-B** | `src/components/ui/currency-input.tsx` | CREATE |
| **2** | `src/app/(dashboard)/revenue/page.tsx` | CREATE |
| **2** | `src/components/requests/request-detail-panel.tsx` | MODIFY |

---

## Phase Details

### Phase 1-A: Revenue API (Backend) - 1h
File: `phase-01a-revenue-api.md`
- CRUD routes for Revenue model
- Lock/unlock endpoints (same pattern as Operator)
- Vietnamese error messages
- Multi-currency validation

### Phase 1-B: Revenue UI (Frontend) - 1h
File: `phase-01b-revenue-ui.md`
- RevenueForm with multi-currency input
- RevenueTable for list display
- RevenueSummaryCard for totals
- CurrencyInput shared component

### Phase 2: Integration - 30min
File: `phase-02-integration.md`
- Revenue page route
- Add revenue section to RequestDetailPanel
- Wire up API calls

### Phase 3: Testing - 30min
File: `phase-03-testing.md`
- API route tests
- Currency conversion tests
- Lock/unlock flow tests

---

## Data Model Reference (from Prisma)

```prisma
model Revenue {
  id              String    @id @default(cuid())
  revenueId       String?   @unique
  requestId       String
  request         Request   @relation(...)
  paymentDate     DateTime
  paymentType     String    // Deposit | Full Payment
  foreignAmount   Decimal?  @db.Decimal(15, 2)
  currency        String?   @default("VND")
  exchangeRate    Decimal?  @db.Decimal(15, 2)
  amountVND       Decimal   @db.Decimal(15, 0)
  paymentSource   String    // Bank transfer, Cash, etc.
  isLocked        Boolean   @default(false)
  lockedAt        DateTime?
  lockedBy        String?
  notes           String?   @db.Text
  userId          String
  user            User      @relation(...)
  sheetRowIndex   Int?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## Permission Mapping (Already Defined)

| Role | revenue:view | revenue:manage |
|------|--------------|----------------|
| ADMIN | Yes (wildcard) | Yes (wildcard) |
| ACCOUNTANT | Yes | Yes |
| SELLER | No | No |
| OPERATOR | No | No |

---

## Existing Patterns to Follow

### API Response Format
```typescript
NextResponse.json({ success: true, data: result })
NextResponse.json({ success: false, error: 'Vietnamese message' }, { status: 400 })
```

### Lock Pattern (from Operator)
1. POST `/api/revenues/[id]/lock` - ACCOUNTANT can lock
2. POST `/api/revenues/[id]/unlock` - ADMIN only
3. Check `isLocked` before PUT/DELETE

### Form Pattern (from OperatorForm)
- Card-based sections
- Manual state management with `useState`
- Validation in `handleSubmit`
- Vietnamese labels

---

## Success Criteria

- [ ] Revenue CRUD API functional
- [ ] Multi-currency conversion works (foreign + rate = VND)
- [ ] Lock/unlock follows Operator pattern
- [ ] Revenue table displays in Request detail
- [ ] ACCOUNTANT can manage, ADMIN can unlock
- [ ] All Vietnamese labels/messages

---

## Validation Summary

**Validated:** 2026-01-06
**Questions asked:** 4

### Confirmed Decisions
- **Audit Trail**: No history for MVP - skip RevenueHistory table, add later if needed
- **Exchange Rates**: Manual input with defaults - user enters rate per transaction
- **UI Location**: Both standalone page + request detail - /revenue page AND RequestDetailPanel
- **Status Gate**: Only BOOKING+ requests - revenues require confirmed booking status

### Action Items
- [x] All recommendations confirmed - no plan changes needed
- [x] Plan ready for implementation

---

## Resolved Questions

1. ~~Should Revenue have its own history table like OperatorHistory?~~
   - **Decision**: Skip for MVP, add later if needed ✅
2. ~~Should locked revenues block parent Request changes?~~
   - **Decision**: No, independent lock ✅
3. ~~How to handle exchange rates?~~
   - **Decision**: Manual input with default suggestions ✅
4. ~~Where to display revenues?~~
   - **Decision**: Both /revenue page AND request detail ✅
