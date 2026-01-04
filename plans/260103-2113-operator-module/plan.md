# Operator Module Implementation Plan

**Created:** 2026-01-03
**Status:** ✅ COMPLETE (2026-01-04)
**Complexity:** Medium-High
**Based On:** [Brainstorm Report](../reports/brainstorm-260103-2113-operator-module-features.md)

---

## Overview

Implement complete Operator module for managing service costs/expenses linked to Bookings (Request at F5 status). Follow patterns established in Supplier module.

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Currency | VND only | Consistent with Supplier, simpler |
| Notifications | Dashboard badge | Show overdue count on nav |
| Audit history | Full tracking | OperatorHistory model |
| Recurring | Not needed | One-time entries only |

---

## Implementation Phases

| Phase | Focus | Files | Priority | Status |
|-------|-------|-------|----------|--------|
| 1 | Core CRUD | Schema, API, Forms, Pages | P0 | ✅ Done |
| 2 | Payment Workflow | Approval queue, batch approve | P0 | ✅ Done |
| 3 | Accounting Lock | Lock/unlock, period closing | P1 | ✅ Done |
| 4 | Reports | Cost analysis, payment status | P1 | ✅ Done |

---

## Phase Details

### Phase 1: Core CRUD
See: [phase-01-core-crud.md](./phase-01-core-crud.md)

### Phase 2: Payment Workflow
See: [phase-02-payment-workflow.md](./phase-02-payment-workflow.md)

### Phase 3: Accounting Lock
See: [phase-03-accounting-lock.md](./phase-03-accounting-lock.md)

### Phase 4: Reports
See: [phase-04-reports.md](./phase-04-reports.md)

---

## Database Schema Changes

### New Model: OperatorHistory (Audit Trail)
```prisma
model OperatorHistory {
  id          String   @id @default(cuid())
  operatorId  String
  operator    Operator @relation(fields: [operatorId], references: [id], onDelete: Cascade)
  action      String   // CREATE, UPDATE, DELETE, LOCK, UNLOCK, APPROVE
  changes     Json     // {field: {before, after}}
  userId      String
  createdAt   DateTime @default(now())

  @@index([operatorId])
  @@index([createdAt])
  @@map("operator_history")
}
```

### Update Operator Model
```prisma
model Operator {
  // ... existing fields ...

  // Add relation for history
  history     OperatorHistory[]
}
```

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── operators/
│   │       ├── page.tsx                    # List page
│   │       ├── create/page.tsx             # Create page
│   │       ├── approvals/page.tsx          # Approval queue
│   │       ├── reports/page.tsx            # Reports dashboard
│   │       └── [id]/page.tsx               # Detail/Edit page
│   └── api/
│       ├── operators/
│       │   ├── route.ts                    # GET list, POST create
│       │   ├── pending-payments/route.ts   # GET approval queue
│       │   ├── approve/route.ts            # POST batch approve
│       │   ├── lock-period/route.ts        # POST lock by month
│       │   └── [id]/
│       │       ├── route.ts                # GET, PUT, DELETE
│       │       ├── approve/route.ts        # POST single approve
│       │       ├── lock/route.ts           # POST lock
│       │       └── unlock/route.ts         # POST unlock
│       └── reports/
│           ├── operator-costs/route.ts     # GET cost analysis
│           └── operator-payments/route.ts  # GET payment status
├── components/
│   └── operators/
│       ├── operator-form.tsx               # Create/Edit form
│       ├── operator-list-filters.tsx       # Filter controls
│       ├── operator-approval-table.tsx     # Approval queue table
│       ├── operator-lock-dialog.tsx        # Lock period dialog
│       └── operator-history-panel.tsx      # Audit history
├── config/
│   └── operator-config.ts                  # Service types, constants
├── lib/
│   ├── operator-history.ts                 # Audit trail helpers
│   └── operator-validation.ts              # Zod schemas
└── types/
    └── index.ts                            # Add operator types
```

---

## Type Definitions

```typescript
// Add to src/types/index.ts

// Service types aligned with Supplier types
export const SERVICE_TYPES = {
  HOTEL: 'Khách sạn',
  RESTAURANT: 'Nhà hàng',
  TRANSPORT: 'Vận chuyển',
  GUIDE: 'Hướng dẫn viên',
  VISA: 'Visa',
  VMB: 'Vé máy bay',
  CRUISE: 'Du thuyền',
  ACTIVITY: 'Hoạt động/Tour',
  OTHER: 'Khác',
} as const;

export type ServiceType = keyof typeof SERVICE_TYPES;

// Operator filters
export interface OperatorFilters {
  search?: string;
  requestId?: string;
  supplierId?: string;
  serviceType?: ServiceType;
  paymentStatus?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
  isLocked?: boolean;
}

// Approval queue item
export interface ApprovalQueueItem {
  id: string;
  requestCode: string;
  customerName: string;
  serviceDate: Date;
  serviceType: string;
  serviceName: string;
  supplierName: string | null;
  totalCost: number;
  paymentDeadline: Date | null;
  daysOverdue: number; // negative = future, positive = overdue
  isLocked: boolean;
}

// Operator history entry
export interface OperatorHistoryEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOCK' | 'UNLOCK' | 'APPROVE';
  changes: Record<string, { before: unknown; after: unknown }>;
  userId: string;
  userName?: string;
  createdAt: Date;
}

// Cost report types
export interface CostByServiceType {
  type: string;
  label: string;
  total: number;
  count: number;
}

export interface CostBySupplier {
  supplierId: string | null;
  supplierName: string;
  total: number;
  count: number;
}

export interface CostByMonth {
  month: string; // YYYY-MM
  total: number;
  count: number;
}

export interface OperatorCostReport {
  byServiceType: CostByServiceType[];
  bySupplier: CostBySupplier[];
  byMonth: CostByMonth[];
  summary: {
    totalCost: number;
    totalCount: number;
    avgCost: number;
  };
}

// Payment report types
export interface PaymentStatusReport {
  pending: { count: number; total: number };
  dueThisWeek: { count: number; total: number };
  overdue: { count: number; total: number };
  paidThisMonth: { count: number; total: number };
}
```

---

## API Response Patterns

Follow existing Supplier module patterns:

```typescript
// Success
{ success: true, data: T }

// Success with pagination
{ success: true, data: T[], total: number, hasMore: boolean }

// Error
{ success: false, error: string }
```

---

## Validation Schema

```typescript
// src/lib/operator-validation.ts
import { z } from 'zod';

export const operatorFormSchema = z.object({
  requestId: z.string().min(1, 'Vui lòng chọn Booking'),
  supplierId: z.string().optional(),
  supplier: z.string().optional(),
  serviceDate: z.string().min(1, 'Vui lòng chọn ngày dịch vụ'),
  serviceType: z.string().min(1, 'Vui lòng chọn loại dịch vụ'),
  serviceName: z.string().min(1, 'Vui lòng nhập tên dịch vụ'),
  costBeforeTax: z.number().min(0, 'Chi phí phải >= 0'),
  vat: z.number().min(0).optional(),
  totalCost: z.number().min(0, 'Tổng chi phí phải >= 0'),
  paymentDeadline: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.supplierId || data.supplier,
  { message: 'Vui lòng chọn NCC hoặc nhập tên NCC', path: ['supplier'] }
);

export const approvePaymentSchema = z.object({
  operatorIds: z.array(z.string()).min(1, 'Chọn ít nhất 1 dịch vụ'),
  paymentDate: z.string().min(1, 'Vui lòng chọn ngày thanh toán'),
});

export const lockPeriodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Định dạng: YYYY-MM'),
});
```

---

## Testing Requirements

Each phase should include tests:
- API endpoint tests (Jest)
- Business logic tests
- Validation schema tests

Example test file structure:
```
src/__tests__/
├── api/
│   ├── operators.test.ts
│   └── operator-approvals.test.ts
├── lib/
│   └── operator-history.test.ts
└── config/
    └── operator-config.test.ts
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| API response | < 200ms |
| List page (1000 items) | < 1s |
| Batch approve 50 items | < 3s |
| Report generation | < 3s |

---

## Dependencies

- Existing Supplier module (balance integration)
- Request module (must have F5+ requests for testing)
- User authentication (for createdBy/lockedBy)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| No F5 requests for testing | Create test seed data |
| Balance calculation performance | Maintain existing aggregate pattern |
| Lock conflicts | Use DB transactions |
| Large audit history | Index + pagination |
