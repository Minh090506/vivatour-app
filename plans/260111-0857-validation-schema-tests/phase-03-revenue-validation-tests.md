# Phase 03: Revenue Validation Tests

## Context

- Parent: [plan.md](./plan.md)
- Source: `src/lib/validations/revenue-validation.ts`
- Output: `src/lib/validations/__tests__/revenue-validation.test.ts`

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-11 |
| Priority | P2 |
| Effort | 30min |
| Status | pending |

## Schemas to Test

1. **createRevenueApiSchema** - Create with refinements
2. **updateRevenueApiSchema** - Partial update
3. **validateCreateRevenue** - Validation function
4. **validateUpdateRevenue** - Validation function

## Key Validations

### Required Fields
- requestId: string, min 1
- paymentDate: valid date string
- paymentType: enum (PAYMENT_TYPE_KEYS)
- paymentSource: enum (PAYMENT_SOURCE_KEYS)

### Optional Fields
- currency: enum, default 'VND'
- foreignAmount: number >0
- exchangeRate: number >0
- amountVND: number >0
- notes: string, max 1000

### Refinements (3 rules)
1. If currency != 'VND' → foreignAmount required & >0
2. If currency != 'VND' → exchangeRate required & >0
3. If currency = 'VND' → amountVND required & >0

### Enums
- PaymentType: DEPOSIT, FULL_PAYMENT, PARTIAL, REFUND
- PaymentSource: BANK_TRANSFER, CASH, CARD, PAYPAL, WISE, OTHER
- Currency: VND, USD, EUR, GBP, AUD, JPY, SGD, THB

## Test Structure

```typescript
describe('revenue-validation', () => {
  describe('createRevenueApiSchema', () => {
    describe('valid data', () => {...});
    describe('required fields', () => {...});
    describe('field types', () => {...});
    describe('range validation', () => {...});
    describe('currency refinements', () => {...});
  });

  describe('updateRevenueApiSchema', () => {...});
  describe('validation functions', () => {...});
});
```

## Test Cases (~25 tests)

### Valid Data (4 tests)
- VND payment with amountVND passes
- USD payment with foreignAmount + exchangeRate passes
- All currencies enum values valid
- Vietnamese notes passes

### Required Fields (4 tests)
- Missing requestId → error "Booking la bat buoc"
- Missing paymentDate → error "Ngay la bat buoc"
- Missing paymentType → error
- Missing paymentSource → error

### Type Validation (4 tests)
- String for amountVND → error
- Invalid paymentType enum → error
- Invalid currency enum → error
- Invalid date format → error

### Range Validation (4 tests)
- amountVND = 0 → error "So tien VND phai > 0"
- amountVND negative → error
- foreignAmount = 0 → error
- exchangeRate = 0 → error

### Currency Refinements (7 tests)
- VND with amountVND → passes
- VND without amountVND → error "So tien VND phai > 0"
- USD without foreignAmount → error "So tien ngoai te la bat buoc khi dung ngoai te"
- USD without exchangeRate → error "Ty gia la bat buoc khi dung ngoai te"
- USD with both → passes
- EUR with foreignAmount + exchangeRate → passes
- VND ignores foreignAmount/exchangeRate

### Update Schema (2 tests)
- Partial update passes
- Optional fields all work

## Implementation Steps

1. Create `revenue-validation.test.ts`
2. Import schemas and functions
3. Create fixtures for VND and foreign currency
4. Implement currency refinement tests
5. Run tests

## Success Criteria

- [ ] All 25+ tests pass
- [ ] Currency logic verified
- [ ] Vietnamese messages correct
