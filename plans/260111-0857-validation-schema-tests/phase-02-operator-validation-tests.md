# Phase 02: Operator Validation Tests

## Context

- Parent: [plan.md](./plan.md)
- Source: `src/lib/validations/operator-validation.ts`
- Output: `src/lib/validations/__tests__/operator-validation.test.ts`

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-11 |
| Priority | P2 |
| Effort | 45min |
| Status | pending |

## Schemas to Test

1. **operatorFormSchema** - Form with refinements
2. **createOperatorSchema** - Same as form
3. **updateOperatorSchema** - Partial + optional id
4. **operatorFiltersSchema** - List filters
5. **createOperatorApiSchema** - API create
6. **updateOperatorApiSchema** - API update

## Key Validations

### Required Fields
- requestId: string, min 1
- serviceDate: valid date string
- serviceType: enum (SERVICE_TYPE_KEYS)
- serviceName: string, min 1, max 255
- costBeforeTax: number ≥0
- totalCost: number ≥0

### Optional Fields
- supplierId: string (or empty)
- supplier: string, max 255 (or empty)
- vat: number ≥0
- paidAmount: number ≥0, default 0
- paymentDeadline: date string
- bankAccount: string, max 255
- notes: string, max 1000

### Refinements (4 rules)
1. supplierId OR supplier required
2. totalCost ≥ costBeforeTax
3. paidAmount ≤ totalCost
4. paymentDeadline ≥ serviceDate (if both provided)

### Enums
- ServiceType: HOTEL, RESTAURANT, TRANSPORT, GUIDE, VISA, VMB, CRUISE, ACTIVITY, OTHER
- PaymentStatus: PENDING, PARTIAL, PAID

## Test Structure

```typescript
describe('operator-validation', () => {
  describe('operatorFormSchema', () => {
    describe('valid data', () => {...});
    describe('required fields', () => {...});
    describe('field types', () => {...});
    describe('range validation', () => {...});
    describe('refinements', () => {...});
  });

  describe('updateOperatorSchema', () => {...});
  describe('operatorFiltersSchema', () => {...});
  describe('validation functions', () => {...});
});
```

## Test Cases (~30 tests)

### Valid Data (4 tests)
- Complete valid data with supplierId passes
- Complete valid data with supplier name passes
- Vietnamese serviceName passes
- Minimal required fields pass

### Required Fields (5 tests)
- Missing requestId → error "Vui lòng chọn Booking"
- Missing serviceDate → error "Ngày là bắt buộc"
- Missing serviceType → error "Loại dịch vụ không hợp lệ"
- Missing serviceName → error "Vui lòng nhập tên dịch vụ"
- Missing costBeforeTax → error

### Type Validation (4 tests)
- String for costBeforeTax → error
- Invalid serviceType enum → error
- Invalid date format → error
- Number for serviceName → error

### Range Validation (4 tests)
- costBeforeTax negative → error
- totalCost negative → error
- vat negative → error
- paidAmount negative → error

### Refinements (10 tests)
- Neither supplierId nor supplier → error "Vui lòng chọn NCC hoặc nhập tên NCC"
- Only supplierId provided → passes
- Only supplier name provided → passes
- totalCost < costBeforeTax → error "Tổng chi phí phải >= chi phí trước thuế"
- totalCost = costBeforeTax → passes
- totalCost > costBeforeTax → passes
- paidAmount > totalCost → error "Số tiền thanh toán không được vượt quá tổng chi phí"
- paidAmount = totalCost → passes
- paymentDeadline < serviceDate → error "Hạn thanh toán phải từ ngày dịch vụ trở đi"
- paymentDeadline = serviceDate → passes

### Update Schema (2 tests)
- Valid partial update passes
- Invalid id format → error

### Filters Schema (2 tests)
- Valid filters pass
- Invalid paymentStatus → error

## Implementation Steps

1. Create `operator-validation.test.ts`
2. Import schemas and validation functions
3. Create valid test data fixtures
4. Implement test groups
5. Run tests

## Success Criteria

- [ ] All 30+ tests pass
- [ ] Refinement logic verified
- [ ] Vietnamese messages correct
