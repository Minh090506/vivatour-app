# Phase 01: Request Validation Tests

## Context

- Parent: [plan.md](./plan.md)
- Source: `src/lib/validations/request-validation.ts`
- Output: `src/lib/validations/__tests__/request-validation.test.ts`

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-11 |
| Priority | P2 |
| Effort | 45min |
| Status | pending |

## Schemas to Test

1. **requestFormSchema** - Form validation with refinements
2. **createRequestSchema** - Same as form (aliased)
3. **updateRequestSchema** - Partial fields + id required
4. **requestFiltersSchema** - Search/list filters
5. **createRequestApiSchema** - API validation (looser)
6. **updateRequestApiSchema** - API partial update

## Key Validations

### Required Fields
- customerName: min 2, max 100 chars
- contact: min 1, max 255 chars
- country: min 1, max 100 chars
- source: min 1, max 100 chars
- pax: number, int, 1-100
- status: enum (REQUEST_STATUS_KEYS)

### Optional Fields
- whatsapp: regex `/^(\+?[0-9]{8,15}|0[0-9]{9,10})$/`
- stage: enum (REQUEST_STAGE_KEYS)
- tourDays: int 1-365
- startDate, endDate, expectedDate, lastContactDate: datetime
- expectedRevenue, expectedCost: number ≥0
- notes: max 1000 chars
- sellerId: UUID

### Refinements
- endDate ≥ startDate (if both provided)

### Enums
- Status: DANG_LL_CHUA_TL, DANG_LL_DA_TL, DA_BAO_GIA, DANG_XAY_TOUR, F1-F4, BOOKING, KHACH_HOAN, KHACH_SUY_NGHI, KHONG_DU_TC, DA_KET_THUC, CANCEL
- Stage: LEAD, QUOTE, FOLLOWUP, OUTCOME

## Test Structure

```typescript
describe('request-validation', () => {
  describe('requestFormSchema', () => {
    describe('valid data', () => {...});
    describe('required fields', () => {...});
    describe('field types', () => {...});
    describe('format validation', () => {...});
    describe('range validation', () => {...});
    describe('Vietnamese characters', () => {...});
    describe('refinements', () => {...});
  });

  describe('updateRequestSchema', () => {...});
  describe('requestFiltersSchema', () => {...});
  describe('validation functions', () => {...});
});
```

## Test Cases (~35 tests)

### Valid Data (4 tests)
- Complete valid data passes
- Minimal required fields pass
- Optional fields with valid values pass
- Vietnamese names pass

### Required Fields (6 tests)
- Missing customerName → error
- Missing contact → error
- Missing country → error
- Missing source → error
- Missing pax → error
- Missing status → error

### Type Validation (4 tests)
- String for pax → error "Số khách phải là số"
- String for expectedRevenue → error
- Number for customerName → error
- Invalid status enum → error "Trạng thái không hợp lệ"

### Format Validation (6 tests)
- Invalid whatsapp format → error
- Valid whatsapp +84123456789 → pass
- Valid whatsapp 0901234567 → pass
- Invalid datetime format → error
- Invalid UUID for sellerId → error
- Valid UUID passes

### Range Validation (6 tests)
- pax = 0 → error "Số khách phải ít nhất 1"
- pax = 101 → error "Số khách không được quá 100"
- customerName 1 char → error "ít nhất 2 ký tự"
- tourDays = 0 → error
- tourDays = 366 → error
- expectedRevenue negative → error

### Vietnamese Characters (3 tests)
- customerName "Nguyễn Văn An" → passes
- notes with Vietnamese text → passes
- Whitespace trimmed correctly

### Refinements (3 tests)
- endDate < startDate → error "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"
- endDate = startDate → passes
- endDate > startDate → passes

### Update Schema (2 tests)
- Valid update with id passes
- Invalid id format → error

### Filters Schema (2 tests)
- Valid filters pass
- Invalid followup enum → error

## Implementation Steps

1. Create `__tests__` directory in `src/lib/validations/`
2. Create `request-validation.test.ts`
3. Import schemas and validation functions
4. Create valid test data fixtures
5. Implement test groups in order
6. Run tests and verify coverage

## Success Criteria

- [ ] All 35+ tests pass
- [ ] Vietnamese error messages verified
- [ ] 100% schema coverage
- [ ] Edge cases covered
