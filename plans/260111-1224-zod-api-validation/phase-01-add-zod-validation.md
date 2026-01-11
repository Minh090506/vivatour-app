# Phase 01: Add Zod Validation to API Routes

## Context

- **Plan**: [plan.md](./plan.md)
- **Reference**: `src/lib/validations/request-validation.ts`, `src/app/api/requests/route.ts`

## Overview

- **Priority**: P2
- **Status**: Completed (2026-01-11)
- **Description**: Add Zod validation schemas to 6 API routes

## Key Insights

1. Existing pattern uses inline schemas for simple cases
2. `extractZodErrors()` available in request-validation.ts - reuse for API responses
3. Vietnamese error messages required
4. All routes already have manual validation - replace with Zod

## Requirements

### Functional
- Validate all input parameters/body before processing
- Return 400 with detailed validation errors
- Use Vietnamese error messages

### Non-Functional
- No breaking changes to API response format
- Maintain existing error response structure

## Architecture

### Validation Pattern
```typescript
import { z } from 'zod';
import { extractZodErrors } from '@/lib/validations/request-validation';

const schema = z.object({...});

// In handler:
const validation = schema.safeParse(input);
if (!validation.success) {
  return NextResponse.json(
    { success: false, error: 'Dữ liệu không hợp lệ', details: extractZodErrors(validation.error) },
    { status: 400 }
  );
}
```

## Related Code Files

### Files to Modify
1. `src/app/api/suppliers/generate-code/route.ts`
2. `src/app/api/operators/pending-payments/route.ts`
3. `src/app/api/operators/archive/route.ts`
4. `src/app/api/operators/lock-period/route.ts`
5. `src/app/api/sync/sheets/route.ts`
6. `src/app/api/users/route.ts`

## Implementation Steps

### 1. /api/suppliers/generate-code/route.ts (GET)

**Current**: Manual validation of type, name
**Schema**:
```typescript
const generateCodeQuerySchema = z.object({
  type: z.enum(Object.keys(SUPPLIER_TYPES) as [string, ...string[]], {
    message: 'Loại NCC không hợp lệ',
  }),
  name: z.string().min(1, 'Tên NCC là bắt buộc'),
  location: z.string().optional().nullable(),
});
```

**Steps**:
1. Import z from 'zod'
2. Import extractZodErrors from request-validation
3. Define schema before handler
4. Parse searchParams object with safeParse
5. Replace manual validation with schema validation

### 2. /api/operators/pending-payments/route.ts (GET)

**Current**: No validation, just gets params
**Schema**:
```typescript
const pendingPaymentsQuerySchema = z.object({
  filter: z.enum(['all', 'today', 'week', 'overdue']).default('all'),
  serviceType: z.string().optional(),
  supplierId: z.string().uuid().optional(),
});
```

**Steps**:
1. Add imports
2. Define schema
3. Validate parsed query params

### 3. /api/operators/archive/route.ts (POST)

**Current**: Manual validation of ids/autoArchive
**Schema**:
```typescript
const archiveBodySchema = z.object({
  ids: z.array(z.string().uuid('ID không hợp lệ')).min(1, 'Cần ít nhất 1 ID').optional(),
  autoArchive: z.boolean().optional(),
}).refine(
  data => data.ids || data.autoArchive,
  { message: 'Thiếu tham số: ids hoặc autoArchive' }
);
```

**Steps**:
1. Add imports
2. Define schema with refine for OR logic
3. Replace manual validation

### 4. /api/operators/lock-period/route.ts (POST & GET)

**Current**: Manual regex for month format
**Schemas**:
```typescript
const monthRegex = /^\d{4}-\d{2}$/;

const lockPeriodPostSchema = z.object({
  month: z.string().regex(monthRegex, 'Định dạng tháng không hợp lệ (YYYY-MM)'),
  tier: z.enum(['KT', 'Admin', 'Final']).default('KT'),
});

const lockPeriodGetSchema = z.object({
  month: z.string().regex(monthRegex, 'Định dạng tháng không hợp lệ'),
  tier: z.enum(['KT', 'Admin', 'Final']).optional(),
});
```

**Steps**:
1. Add imports
2. Define both schemas
3. Apply to POST and GET handlers

### 5. /api/sync/sheets/route.ts (POST)

**Current**: Manual check against VALID_SHEETS array
**Schema**:
```typescript
const syncSheetsBodySchema = z.object({
  sheetName: z.enum(['Request', 'Operator', 'Revenue'], {
    message: 'Sheet không hợp lệ. Sử dụng: Request, Operator, Revenue',
  }),
});
```

**Steps**:
1. Add imports
2. Define schema
3. Replace manual VALID_SHEETS check

### 6. /api/users/route.ts (GET)

**Current**: No validation on role param
**Schema**:
```typescript
const usersQuerySchema = z.object({
  role: z.enum(['ADMIN', 'SELLER', 'ACCOUNTANT'], {
    message: 'Role không hợp lệ',
  }).optional(),
});
```

**Steps**:
1. Add imports
2. Define schema
3. Validate role param

## Todo List

- [ ] Update /api/suppliers/generate-code/route.ts
- [ ] Update /api/operators/pending-payments/route.ts
- [ ] Update /api/operators/archive/route.ts
- [ ] Update /api/operators/lock-period/route.ts
- [ ] Update /api/sync/sheets/route.ts
- [ ] Update /api/users/route.ts
- [ ] Test all endpoints

## Success Criteria

- [ ] All 6 routes use Zod validation
- [ ] Invalid input returns 400 with Vietnamese error messages
- [ ] Existing functionality unchanged
- [ ] Build passes without errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing API callers | Medium | Keep same response structure |
| Missing edge cases | Low | Replicate existing validation logic |

## Security Considerations

- Input validation prevents injection attacks
- UUID validation prevents invalid ID lookups
- Enum validation restricts allowed values

## Next Steps

After implementation:
1. Run `npm run build` to verify no type errors
2. Manual test each endpoint with valid/invalid data
3. Commit with message: `feat(api): add Zod validation to 6 API routes`
