# Phase 04: Config Validation Tests

## Context

- Parent: [plan.md](./plan.md)
- Source: `src/lib/validations/config-validation.ts`
- Output: `src/lib/validations/__tests__/config-validation.test.ts`

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-11 |
| Priority | P2 |
| Effort | 30min |
| Status | pending |

## Schemas to Test

1. **sellerSchema** - Seller configuration
2. **followUpStatusSchema** - Follow-up status config
3. **reorderSchema** - Batch sortOrder update
4. **transformSellerData** - Transform function

## Key Validations

### Seller Schema
**Required:**
- telegramId: string, min 1
- sellerName: string, min 1
- sheetName: string, min 1
- gender: enum ['MALE', 'FEMALE']
- sellerCode: 1-2 uppercase letters (regex `/^[A-Z]{1,2}$/`)

**Optional:**
- metaName: string or null
- email: valid email or empty
- isActive: boolean, default true

### FollowUp Schema
**Required:**
- status: string, min 1
- daysToFollowup: int ≥0

**Optional:**
- aliases: string array, default []
- sortOrder: int ≥0
- isActive: boolean, default true

### Reorder Schema
- items: array (min 1) of { id: string, sortOrder: int ≥0 }

## Test Structure

```typescript
describe('config-validation', () => {
  describe('sellerSchema', () => {
    describe('valid data', () => {...});
    describe('required fields', () => {...});
    describe('format validation', () => {...});
    describe('sellerCode format', () => {...});
  });

  describe('followUpStatusSchema', () => {...});
  describe('reorderSchema', () => {...});
  describe('transformSellerData', () => {...});
});
```

## Test Cases (~25 tests)

### Seller - Valid Data (3 tests)
- Complete valid seller passes
- Vietnamese sellerName passes
- Optional fields null passes

### Seller - Required Fields (5 tests)
- Missing telegramId → error "Telegram ID không được trống"
- Missing sellerName → error "Tên seller không được trống"
- Missing sheetName → error "Tên sheet không được trống"
- Missing gender → error "Giới tính không hợp lệ"
- Missing sellerCode → error "Mã seller không được trống"

### Seller - Format Validation (4 tests)
- Invalid email → error "Email không hợp lệ"
- Valid email passes
- Empty email passes (optional)
- Invalid gender enum → error

### Seller - sellerCode Format (5 tests)
- Single uppercase "A" → passes
- Double uppercase "LY" → passes
- Lowercase "a" → error "Mã seller phải là 1-2 ký tự in hoa (A-Z)"
- Three chars "ABC" → error "Mã seller tối đa 2 ký tự"
- Numbers "A1" → error
- Empty → error

### FollowUp - Valid Data (2 tests)
- Complete valid passes
- With aliases array passes

### FollowUp - Required Fields (2 tests)
- Missing status → error
- Missing daysToFollowup → error

### FollowUp - Range Validation (2 tests)
- daysToFollowup negative → error "Số ngày phải >= 0"
- daysToFollowup = 0 → passes

### Reorder Schema (3 tests)
- Valid items array passes
- Empty array → error "Cần ít nhất 1 item"
- Negative sortOrder → error

### Transform Function (2 tests)
- Empty metaName → null
- Empty email → null

## Implementation Steps

1. Create `config-validation.test.ts`
2. Import schemas and transform function
3. Create seller fixtures with various sellerCodes
4. Test regex validation thoroughly
5. Run tests

## Success Criteria

- [ ] All 25+ tests pass
- [ ] sellerCode regex verified
- [ ] Vietnamese messages correct
- [ ] Transform function tested
