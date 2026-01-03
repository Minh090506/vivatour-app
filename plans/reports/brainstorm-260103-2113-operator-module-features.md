# Operator Module Feature Recommendations

**Date:** 2026-01-03
**Type:** Brainstorm Report
**Module:** Operator (Dịch vụ/Chi phí)

---

## 1. Problem Statement

The vivatour-app needs an Operator module to manage service costs/expenses linked to Bookings (confirmed Requests at F5 status). The database schema exists but no API routes, UI components, or business logic are implemented.

**Business Context:**
- **Operator** = Cost entries for services (hotel, transport, guides) per Booking
- **Workflow:** Operations staff creates service entries → Accountant approves payments when due
- **Request → Booking:** Status change (F5 = Booking confirmed), no separate table needed

---

## 2. Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Operator definition | Service cost entries linked to Booking (Request at F5) |
| Supplier assignment | Both direct-link and pool assignment |
| Cost structure | Single cost per entry (not line items) |
| Payment approval | Approval queue with batch review |
| Accounting lock | Essential - must lock after period closing |
| Document attachment | Not needed (link-only is sufficient) |
| Reporting | Comprehensive: cost analysis, payment status, supplier performance |

---

## 3. Recommended Features

### 3.1 Management Features (CRUD)

#### Core CRUD Operations
| Feature | Priority | Notes |
|---------|----------|-------|
| Create operator entry | P0 | Link to Request (F5+), optional Supplier |
| Edit operator entry | P0 | Block if locked |
| Delete operator entry | P0 | Block if locked, soft delete preferred |
| View operator detail | P0 | Full info + payment history |
| List operators | P0 | Filter by request, supplier, date range, status |

#### Field Requirements
Based on existing schema, maintain:
- `serviceDate`, `serviceType`, `serviceName` (required)
- `costBeforeTax`, `vat`, `totalCost` (required)
- `supplierId` (optional - can link to Supplier or use legacy text)
- `paymentDeadline`, `paymentStatus`, `paymentDate` (payment tracking)
- `isLocked`, `lockedAt`, `lockedBy` (accounting lock)

#### Service Type Configuration
Align with `SUPPLIER_TYPES` for consistency:
```typescript
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
```

### 3.2 Payment Workflow (Transactions)

#### Payment Status Flow
```
PENDING → [Accountant Approval] → PAID
       ↘ [Partial Payment] → PARTIAL → PAID
```

#### Approval Queue Features
| Feature | Priority | Description |
|---------|----------|-------------|
| Due payments list | P0 | Filter by `paymentDeadline <= today && paymentStatus != PAID` |
| Batch approve | P1 | Select multiple, mark as PAID with same paymentDate |
| Single approve | P0 | Mark individual as PAID |
| Overdue highlight | P0 | Red highlight for past-due payments |
| Quick filters | P0 | Today, This Week, Overdue |

#### Payment Tracking Fields
- `paymentDeadline` - When payment is due
- `paymentStatus` - PENDING/PARTIAL/PAID
- `paymentDate` - Actual payment date
- `bankAccount` - Which account used (inherit from Supplier if linked)

### 3.3 Assignment Logic

#### Supplier Assignment Model
| Type | Use Case | Implementation |
|------|----------|----------------|
| Direct Link | Known supplier | Set `supplierId` to linked Supplier |
| Text Only | One-time supplier | Use `supplier` text field, null `supplierId` |
| Pool Assignment | Flexible supplier | Create UI to select from active suppliers by type |

#### Auto-Fill Logic
When `supplierId` is selected:
- Auto-fill `supplier` text from `Supplier.name`
- Auto-fill `bankAccount` from `Supplier.bankAccount`
- Show Supplier's current balance for PREPAID suppliers

### 3.4 Reporting Features

#### Report 1: Cost Analysis
| Metric | Grouping | Purpose |
|--------|----------|---------|
| Total cost | By service type | Budget planning |
| Cost breakdown | By supplier | Spend analysis |
| Monthly trend | By month/quarter | Forecasting |
| Per-booking cost | By Request | Profitability |

**API Endpoint:** `GET /api/reports/operator-costs`
```typescript
interface CostAnalysisResponse {
  byServiceType: { type: string; total: number; count: number }[];
  bySupplier: { supplierId: string; name: string; total: number }[];
  byMonth: { month: string; total: number }[];
  byRequest: { requestId: string; code: string; total: number }[];
  summary: { totalCost: number; avgPerBooking: number };
}
```

#### Report 2: Payment Status Dashboard
| Metric | Description |
|--------|-------------|
| Total pending | Sum of unpaid operator costs |
| Due this week | Payments due in next 7 days |
| Overdue | Past paymentDeadline, not PAID |
| Paid this month | Completed payments |

**API Endpoint:** `GET /api/reports/operator-payments`

#### Report 3: Supplier Performance
| Metric | Purpose |
|--------|---------|
| Usage frequency | How often each supplier is used |
| Average cost | Mean cost per service type per supplier |
| Balance status | Current balance for PREPAID suppliers |
| Cost comparison | Compare similar suppliers |

**Integration:** Extend existing `/api/reports/supplier-balance` or new endpoint

### 3.5 Accounting Lock

#### Lock Mechanism
| Feature | Description |
|---------|-------------|
| Individual lock | Lock single operator entry |
| Batch lock | Lock by date range (month-end closing) |
| Lock validation | Prevent edit/delete when locked |
| Unlock | Admin-only capability |

#### Lock Workflow
```
1. Month-end arrives
2. Accountant reviews all entries for the month
3. Accountant runs "Lock Period" for YYYY-MM
4. All operators with serviceDate in that period → isLocked=true
5. Locked entries show lock icon, edit disabled
```

**API Endpoint:** `POST /api/operators/lock-period`
```typescript
interface LockPeriodRequest {
  month: string; // "2026-01"
  lockerId: string;
}
```

### 3.6 Integration with Supplier Balance

#### Balance Impact
Operator costs should deduct from Supplier balance (already implemented in `lib/supplier-balance.ts`):
```typescript
// Current implementation sums operator.totalCost as cost deduction
balance = deposits + refunds + adjustments - fees - operator_costs
```

#### UI Enhancement
- Show Supplier's current balance when selecting supplier
- Warning if PREPAID supplier has negative balance
- Warning if CREDIT supplier approaches limit

---

## 4. Page Structure Recommendation

```
/operators                     # Main list page
├── Filters: request, supplier, serviceType, dateRange, paymentStatus
├── Table: date, request, service, supplier, cost, status, actions
└── Bulk actions: approve, lock

/operators/new                 # Create form
├── Select Request (F5+ only)
├── Service details
├── Supplier selection (dropdown or text)
└── Cost entry

/operators/[id]                # Detail/Edit page
├── Service info
├── Payment status & history
├── Lock status
└── Edit form (if not locked)

/operators/approvals           # Accountant approval queue
├── Due payments list
├── Overdue section (red)
├── Batch approve button
└── Quick filters

/operators/reports             # Reports dashboard
├── Cost analysis tab
├── Payment status tab
└── Period summary tab
```

---

## 5. API Routes Structure

```
# CRUD
GET    /api/operators                    # List with filters
POST   /api/operators                    # Create
GET    /api/operators/[id]               # Get detail
PUT    /api/operators/[id]               # Update
DELETE /api/operators/[id]               # Delete (soft)

# Payment Workflow
GET    /api/operators/pending-payments   # Approval queue
POST   /api/operators/approve            # Batch approve
POST   /api/operators/[id]/approve       # Single approve

# Accounting Lock
POST   /api/operators/lock-period        # Lock by month
POST   /api/operators/[id]/lock          # Lock single
POST   /api/operators/[id]/unlock        # Unlock (admin)

# Reports
GET    /api/reports/operator-costs       # Cost analysis
GET    /api/reports/operator-payments    # Payment status
```

---

## 6. Implementation Priority

### Phase 1: Core CRUD (Must-Have)
1. API routes: list, create, get, update, delete
2. Operator list page with filters
3. Create/Edit operator form
4. Link to Request (require F5+ status)

### Phase 2: Payment Workflow
1. Approval queue page
2. Batch approve functionality
3. Payment status filtering
4. Due date notifications (UI badges)

### Phase 3: Accounting Lock
1. Lock/unlock API endpoints
2. Lock period batch functionality
3. UI lock indicators
4. Edit prevention for locked entries

### Phase 4: Reports
1. Cost analysis report
2. Payment status dashboard
3. Integration with Supplier reports

---

## 7. Technical Considerations

### Database (Already Ready)
- Schema complete in `prisma/schema.prisma`
- Indexes on `requestId`, `serviceDate`, `paymentStatus`, `supplierId`
- Relations to Request and Supplier defined

### Type Safety
- Extend `src/types/index.ts` with filter types
- Add OperatorFilters, ApprovalQueueItem types
- Add report response types

### Form Validation
- Use Zod schemas (consistent with Supplier module)
- Required: requestId, serviceDate, serviceType, serviceName, costBeforeTax, totalCost
- Conditional: supplierId OR supplier text (at least one)

### UX Considerations
- Auto-calculate totalCost from costBeforeTax + vat
- Date picker with default = today
- Supplier dropdown with search (combobox)
- Payment deadline = serviceDate + supplier's paymentTermDays (if CREDIT)

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Orphaned operators if Request deleted | Cascade delete (already in schema) |
| Accidental lock | Require confirmation, admin unlock |
| Duplicate entries | No unique constraint needed (same service can be entered multiple times) |
| Large datasets | Pagination, date range filters required |
| Supplier balance mismatch | Real-time calculation on demand |

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| CRUD operation response | < 200ms |
| List page load (1000 entries) | < 1s |
| Payment approval workflow | Single-click approve |
| Report generation | < 3s for monthly data |
| Accountant efficiency | Batch approve 50+ payments in < 1 minute |

---

## 10. Resolved Questions

| Question | Decision | Implementation |
|----------|----------|----------------|
| Notifications | Dashboard Badge | Show overdue count on nav menu |
| Audit history | Full History | Track all changes with before/after |
| Currency | VND Only | Simpler, consistent with Supplier |
| Recurring services | Not Needed | One-time entries only |
| Mobile access | TBD | Standard responsive design for now |

### Audit History Implementation
Add new model for tracking changes:
```prisma
model OperatorHistory {
  id          String   @id @default(cuid())
  operatorId  String
  operator    Operator @relation(fields: [operatorId], references: [id])
  action      String   // CREATE, UPDATE, DELETE
  changes     Json     // {field: {before, after}}
  userId      String
  createdAt   DateTime @default(now())
}
```

---

## 11. Next Steps

1. **Confirm feature scope** with stakeholders
2. **Resolve unresolved questions** above
3. **Create implementation plan** with detailed tasks
4. **Prioritize Phase 1** for immediate development

---

## Summary

The Operator module should follow patterns established in Supplier module:
- Consistent API structure (success/error responses)
- Vietnamese localization
- Form validation with Zod
- Real-time balance integration
- shadcn/ui components

**Estimated complexity:** Medium-High (similar to Supplier module)
**Key differentiator:** Payment approval queue workflow
