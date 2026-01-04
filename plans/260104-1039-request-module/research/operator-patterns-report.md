# Operator Module Patterns Research Report

**Date:** 2026-01-04 | **For:** Request Module Implementation

---

## API Structure Pattern (`src/app/api/operators/route.ts`)

### GET Endpoint
- **Query Params:** search, requestId, supplierId, serviceType, paymentStatus, fromDate, toDate, isLocked, limit (50), offset (0)
- **Filtering:** OR-based search (serviceName, supplier, request.code, request.customerName)
- **Date Range:** Prisma gte/lte operators
- **Relations:** Includes request (code, customerName) + supplierRef (code, name)
- **Pagination:** offset/limit + hasMore flag
- **Response:** `{ success, data[], total, hasMore }`

### POST Endpoint
- **Validation:**
  - Required fields: requestId, serviceDate, serviceType, serviceName
  - Service type: validated against SERVICE_TYPE_KEYS
  - Request exists + status === 'F5'
  - Supplier validation if supplierId provided
  - Cost validation: costBeforeTax, vat (optional), totalCost
- **Auto-fill:** supplier.name populated if supplierId linked
- **History:** createOperatorHistory() called post-create
- **Error Codes:** 400 (validation), 404 (not found), 500 (server)
- **Response:** `{ success, data: created_operator }` with status 201

---

## Form Pattern (`src/components/operators/operator-form.tsx`)

### State Management
- Single `formData` object: all fields + string conversion for dates/numbers
- Separate `loading`, `error`, `loadingData` states
- Date format: ISO split('T')[0] for input[type=date]

### Auto-calculations
- **VAT Trigger:** `handleCostChange()` auto-fills VAT at DEFAULT_VAT_RATE (10%)
- **Total Trigger:** `calculateTotal()` watches costBeforeTax + vat → updates totalCost
- **Supplier Trigger:** supplier selection auto-populates name + bankAccount

### Dual Data Sources
- **F5 Requests:** `/api/requests?status=F5&limit=100`
- **Active Suppliers:** `/api/suppliers?isActive=true`
- Parallel fetch on mount

### Submit Pattern
- Pre-submit validation with early returns
- Conditional URL/method: POST vs PUT based on isEditing flag
- Error display in red box above form
- Redirect on success: `/operators/${data.data.id}` or onSuccess callback

### Field Disabling Rules
- requestId: disabled during edit or if requestId pre-filled
- supplier: disabled if supplierId selected (prevents dual entry)

---

## Config Structure (`src/config/operator-config.ts`)

### Constants Pattern
- **SERVICE_TYPES:** Object with label + icon fields → SERVICE_TYPE_KEYS array
- **PAYMENT_STATUSES:** label + color (yellow, orange, green)
- **HISTORY_ACTIONS:** 6 types (CREATE, UPDATE, DELETE, LOCK, UNLOCK, APPROVE) with colors
- **DEFAULT_VAT_RATE:** 10

### Type Exports
- Type unions: `ServiceTypeKey`, `PaymentStatusKey`, `HistoryActionKey`
- Derived key arrays for iteration

---

## Utility Functions Pattern

### Validation (`src/lib/operator-validation.ts`)
- **Zod Schemas:** operatorFormSchema + approvePaymentSchema + lockPeriodSchema
- **Refine:** Cross-field validation (supplierId OR supplier required)
- **Type Export:** `OperatorFormValues = z.infer<typeof operatorFormSchema>`
- **Error Messages:** Vietnamese localized

### History (`src/lib/operator-history.ts`)
- **createOperatorHistory():** Prisma create with changes (JSON)
- **getOperatorHistory():** Query with orderBy + limit (default 20)
- **diffObjects():** Deep compare with ignoreFields list
- **Metadata Ignored:** updatedAt, createdAt, history, request, supplierRef, user

---

## Key Patterns for Request Module

### Copy-Paste Adaptable
1. **GET filtering:** OR-search on request.code, request.customerName, requestName, etc.
2. **POST validation:** Zod schema with refine for cross-field rules
3. **Form auto-calculations:** useCallback for dependent updates
4. **Config constants:** TYPE definitions + color mappings
5. **History audit trail:** diffObjects() for change tracking

### Database Patterns Evident
- requestId as FK (required join)
- status filtering (F5 for operators → [P1-P9] for requests)
- isLocked boolean for accounting periods
- paymentStatus enum
- createdAt/updatedAt timestamps

### UI Patterns
- Card-based layout with sections
- Vietnamese labels + placeholders
- Number formatting: formatCurrency() with vi-VN locale
- Error handling: setError() + conditional red box display

---

## Unresolved Questions

1. Request module: What status values map to operator filtering? (P1, P2, P3, etc.?)
2. Request module: Will paymentStatus be derived from linked operators, or standalone?
3. History: Should diffObjects ignore nested relation objects (request, supplierRef)?
4. Validation: Any cross-module validation patterns (e.g., request.status must allow modification)?
