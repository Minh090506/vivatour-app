# Phase 6 Research: Operator & Revenue Module Implementation

**Date**: 2026-01-06 | **Status**: Research Complete

---

## Executive Summary

Phase 6 implements two interconnected financial modules: **Operator** (service cost tracking) & **Revenue** (income tracking) with accounting locks, multi-currency support, and claim/approve workflows. Both cascade-delete linked to Request (established in schema).

---

## 1. Operator Module: Claim/Approve Workflow

### Data Model (Existing in schema)
```prisma
model Operator {
  id            String     // CUID primary key
  requestId     String     // FK to Request (CASCADE delete)
  supplierId    String?    // Optional FK to Supplier

  serviceDate   DateTime   // When service occurs
  serviceType   String     // Hotel, Transport, Tour, Guide, etc.
  serviceName   String     // Specific service name

  costBeforeTax Decimal    // Base cost
  vat           Decimal?   // Optional VAT
  totalCost     Decimal    // Final cost

  paymentStatus String     // PENDING | PAID | PARTIAL (3 statuses)
  paymentDeadline DateTime?
  paymentDate   DateTime?  // When paid

  isLocked      Boolean    // Accounting lock flag
  lockedAt      DateTime?  // When locked
  lockedBy      String?    // Which user locked

  // Audit trail
  history       OperatorHistory[]
  userId        String     // Creator user
}

model OperatorHistory {
  action        String     // CREATE, UPDATE, DELETE, LOCK, UNLOCK, APPROVE
  changes       Json       // {field: {before, after}} - track all changes
  userId        String     // Who made change
  createdAt     DateTime   // When changed
}
```

### Workflow Pattern
**Operator claim/approve flow**:
1. **SELLER** creates Operator for Request → `paymentStatus: PENDING`
2. **OPERATOR** claims it → Updates own operator records (permission: `operator:claim`, `operator:edit_claimed`)
3. **ACCOUNTANT** approves & locks → Sets `isLocked=true` (locks from further edits unless unlocked by ADMIN)
4. Once locked, can't modify cost/deadline without unlock

### Implementation Strategy
- **OperatorHistory audit**: Track all changes (CREATE, UPDATE, LOCK, UNLOCK) with JSON diff
- **Lock mechanism**: Check `isLocked` before PUT/DELETE in API
- **Permission checks**:
  - Operators can only edit claimed records (`operator:edit_claimed`)
  - Accountants approve + lock (`operator:approve`)
  - ADMIN can unlock (`operator:unlock`)

### Code Pattern (from Supplier example)
```typescript
// API pattern: /api/operators/[id]/route.ts
export async function PUT(request: NextRequest, { params }) {
  const { id } = params
  const body = await request.json()
  const session = await auth()

  // Check record exists & not locked
  const operator = await prisma.operator.findUnique({ where: { id } })
  if (!operator) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (operator.isLocked && session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Record locked for editing' },
      { status: 403 }
    )
  }

  // Track changes for audit
  const changes = { /* diff logic */ }

  // Update operator + create history
  const updated = await prisma.operator.update({
    where: { id },
    data: body,
  })

  await prisma.operatorHistory.create({
    data: { operatorId: id, action: 'UPDATE', changes, userId: session.user.id }
  })

  return NextResponse.json({ success: true, data: updated })
}
```

---

## 2. Revenue Module: Multi-Currency Handling

### Data Model (Existing in schema)
```prisma
model Revenue {
  id            String     // CUID primary key
  requestId     String     // FK to Request (CASCADE delete)

  paymentDate   DateTime   // When payment received
  paymentType   String     // Deposit | Full Payment

  // Multi-currency: 3-field pattern
  foreignAmount Decimal?   // Amount in foreign currency (NULL = VND only)
  currency      String     // VND (default), USD, EUR, etc.
  exchangeRate  Decimal?   // Conversion rate (NULL if VND)
  amountVND     Decimal    // Always store in VND (conversion result)

  paymentSource String     // Bank transfer, Cash, Check, etc.

  // Accounting lock (same as Operator)
  isLocked      Boolean
  lockedAt      DateTime?
  lockedBy      String?

  userId        String     // Creator user
}
```

### Multi-Currency Logic
**Pattern**: Store in 3 fields, always calculate VND
```typescript
// Calculate VND amount from foreign currency
const amountVND = foreignAmount && exchangeRate
  ? Decimal(foreignAmount).times(exchangeRate).round(0)
  : foreignAmount // If no exchange rate, assume input is VND

// Revenue row examples:
// Case 1: VND only
{ foreignAmount: null, currency: 'VND', exchangeRate: null, amountVND: 5000000 }

// Case 2: USD → VND
{ foreignAmount: 200, currency: 'USD', exchangeRate: 25250, amountVND: 5050000 }

// Case 3: EUR → VND
{ foreignAmount: 100, currency: 'EUR', exchangeRate: 27500, amountVND: 2750000 }
```

### Design Decisions
- **VND default**: `currency: 'VND'` as default per schema
- **Exchange rate source**: Suggested approach - store manual rates per transaction (best for audit trail). Alternative: API integration (Wise/OANDA) if real-time needed
- **Decimal precision**: `Decimal(15, 2)` for foreign, `Decimal(15, 0)` for VND (no cents in VND)
- **Locking prevents modification**: Once locked by accountant, prevents amending payment info (critical for reconciliation)

---

## 3. Accounting Lock Mechanism

### Pattern (Used in both Operator & Revenue)
```typescript
// Lock enforcement in API
const canEdit = !record.isLocked || session.user.role === 'ADMIN'
if (!canEdit) {
  return NextResponse.json(
    { error: 'Record locked - contact admin to unlock' },
    { status: 403 }
  )
}

// Locking action
await prisma.operator.update({
  where: { id },
  data: {
    isLocked: true,
    lockedAt: new Date(),
    lockedBy: session.user.id
  }
})

// Unlock (ADMIN only)
const isAdmin = session?.user?.role === 'ADMIN'
if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

### Why This Design
- **Immutable records**: Once final, accountant locks to prevent disputes
- **Audit trail**: `lockedBy` + `lockedAt` shows who locked & when
- **Reversibility**: Only ADMIN can unlock if mistake found
- **Report accuracy**: Prevents post-facto cost/payment changes

---

## 4. Existing Supplier Module Patterns to Replicate

### API Structure Proven
✅ **Files**: `/api/[feature]/route.ts` (list/create) + `/api/[feature]/[id]/route.ts` (read/update/delete)
✅ **Error handling**: Standard NextResponse with 400/403/404/500 status codes
✅ **Vietnamese messages**: All error/success messages in Vietnamese (Supplier example: "Mã NCC đã tồn tại")
✅ **Filters**: Query string params for search/type/status filtering
✅ **Response format**: `{ success: true, data: {} }` or `{ success: false, error: "" }`
✅ **Relations**: Fetch related data in single query (Prisma `include`)

### Component Pattern
- **Form components**: React Hook Form + Zod validation (supplier-form.tsx proven)
- **Lists**: Table with filtering, sorting, pagination
- **Detail panels**: Modal/slide-in for edit (MasterDetailLayout from Phase 5)
- **Selectors**: Dropdown for linked records (supplier-selector.tsx pattern)

### Validation Patterns
```typescript
// Supplier creates before Operator references it
const schema = z.object({
  supplierId: z.string().optional(), // Optional link to supplier
  serviceType: z.enum([...VALID_TYPES]),
  totalCost: z.decimal({ precision: 15, scale: 0 }).min(0),
  paymentDate: z.date(),
})
```

---

## 5. Key Implementation Notes

### Database Indexes (Already in schema)
```prisma
@@index([requestId])        // Find operators by request
@@index([serviceDate])      // Date range queries
@@index([paymentStatus])    // Filter by payment status
@@index([supplierId])       // Link to supplier

// Revenue
@@index([requestId])        // Find revenue by request
@@index([paymentDate])      // Date range queries
```

### Dependencies
- **Operator needs Request to exist** (FK constraint)
- **Revenue needs Request to exist** (FK constraint)
- **Operator optionally needs Supplier** (0:N relationship)
- **Both cascade delete with Request** (delete request → deletes all operators/revenues)

### API Endpoints to Implement
```
GET    /api/operators                    # List (with filters)
POST   /api/operators                    # Create
GET    /api/operators/[id]               # Get detail
PUT    /api/operators/[id]               # Update (lock check)
DELETE /api/operators/[id]               # Delete (lock check)
POST   /api/operators/[id]/lock          # Lock action
POST   /api/operators/[id]/unlock        # Unlock (ADMIN only)
GET    /api/operators/[id]/history       # Audit trail

GET    /api/revenue                      # List
POST   /api/revenue                      # Create
GET    /api/revenue/[id]                 # Get detail
PUT    /api/revenue/[id]                 # Update (lock check)
DELETE /api/revenue/[id]                 # Delete (lock check)
POST   /api/revenue/[id]/lock            # Lock action
```

### Testing Considerations
- Lock prevents edits (test 403 when locked)
- Cascade delete removes operators/revenue when request deleted
- VND calculation correct for USD/EUR conversions
- OperatorHistory tracks all state changes
- Permission checks work per role

---

## 6. Unresolved Questions

1. **Exchange rate management**: Should rates be stored per-transaction or integrated with external API (Wise/OANDA)?
2. **Batch operations**: Support for bulk locking/unlocking operators in reporting workflows?
3. **Payment reconciliation report**: Detailed view comparing operator costs vs revenue per request?
4. **Notification on lock**: Alert user when record locked by accountant?

---

## Key Takeaways

| Component | Pattern | From |
|-----------|---------|------|
| API structure | `/api/[feature]/route.ts` + `[id]/route.ts` | Supplier module ✅ |
| Error handling | Standard NextResponse codes | Supplier module ✅ |
| Validation | Zod schemas + React Hook Form | Supplier module ✅ |
| Locking | `isLocked` boolean + role check | Schema established |
| Currency | 3-field pattern (foreign + rate → VND) | Schema designed |
| Audit | OperatorHistory with JSON changes | Schema ready |
| Relations | Cascade delete via FK constraints | Schema ready |

**Ready for Phase 6 implementation planning**.
