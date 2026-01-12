# Form Validation Edge Cases Analysis

**Date**: 2026-01-12 14:28
**Scope**: Request, Operator, Revenue validation schemas
**Files Analyzed**:
- src/lib/validations/request-validation.ts
- src/lib/validations/operator-validation.ts
- src/lib/validations/revenue-validation.ts
- src/app/api/operators/route.ts (lines 97-150)
- src/app/api/revenues/route.ts (lines 91-150)

---

## Executive Summary

Analyzed validation edge cases across 3 form modules. Found **8 issues**:
- 3 critical (missing validations)
- 3 warnings (inconsistent requirements)
- 2 informational (RFC non-compliance, config mismatch)

**Critical**: Missing decimal validation in Operator, missing lock validation, currency config mismatch.

---

## Findings

### 1. Request Form (request-validation.ts)

#### 1.1 Empty String vs Null Handling ✅ PASS
**Lines**: 78-83, 98-100, 112-117, 119-124, 138-143, 145-150

**Status**: Properly implemented

**Evidence**:
```typescript
whatsapp: z.string().regex(...).optional().nullable().or(z.literal(''))
startDate: z.string().datetime(...).optional().nullable().or(z.literal(''))
notes: z.string().max(1000).optional().nullable().or(z.literal(''))
```

**Transform helper exists** (lines 343-357):
```typescript
export function transformRequestFormData(data: RequestFormData) {
  return {
    ...data,
    whatsapp: data.whatsapp || null,
    startDate: data.startDate || null,
    // ... converts empty strings to null
  };
}
```

**Recommendation**: No action needed.

---

#### 1.2 StartDate Future Date Validation ✅ PASS
**Lines**: 95-110, 402-416

**Status**: Correctly implemented

**Evidence**:
```typescript
// Form schema (lines 95-110)
startDate: z.string().datetime().optional().nullable().or(z.literal(''))
  .refine((val) => {
    if (!val) return true; // Allow empty
    const date = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    return date >= today; // Must be today or future
  }, { message: 'Ngày bắt đầu phải là ngày hiện tại hoặc tương lai' })

// API schema (lines 402-416) - same logic
```

**Recommendation**: No action needed.

---

#### 1.3 Phone Validation ⚠️ WARNING
**Lines**: 24-27, 78-83

**Status**: Regex correct but **lenient fallback** in contact field

**Evidence**:
```typescript
// Strict Vietnamese/International format
const phoneRegex = /^(\+[1-9][0-9]{7,14}|0[0-9]{9})$/;

// Whatsapp field - strict validation (line 78-83)
whatsapp: z.string().regex(phoneRegex, 'Số WhatsApp không hợp lệ')

// Contact field - lenient fallback (lines 43-55)
const contactPhoneRegex = /^[\d\s\-+()]+$/; // Allows spaces/dashes/parens
contact: z.string().refine(
  (val) => emailRegex.test(trimmed) || contactPhoneRegex.test(trimmed)
)
```

**Issue**: Contact field accepts phone with formatting (spaces, dashes), but whatsapp requires strict format. Inconsistent UX.

**Recommendation**:
- If phone formatting accepted in `contact`, also accept in `whatsapp`
- OR strip formatting before validation: `.transform((v) => v.replace(/[\s\-()]/g, ''))`
- Document which fields allow formatting

---

#### 1.4 Email Format RFC Compliance ℹ️ INFORMATIONAL
**Lines**: 29-30

**Status**: Non-RFC compliant but **acceptable for business use**

**Evidence**:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

**Known limitations**:
- Doesn't validate TLD length (e.g., `.c` passes)
- Allows consecutive dots (`user@domain..com`)
- Allows special chars in local part without quotes
- No unicode domain support

**Real-world test cases that pass but shouldn't**:
- `user@domain..com` (consecutive dots)
- `@domain.com` (empty local)
- `user@.com` (empty domain)

**Recommendation**:
- For production, use proven regex or library like `validator.js`
- Current regex OK for MVP if tight control over email sources
- Add test cases to prevent regressions

**Suggested RFC-compliant regex**:
```typescript
/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
```

---

### 2. Operator Form (operator-validation.ts)

#### 2.1 Decimal Validation ❌ CRITICAL MISSING
**Lines**: 63-75

**Status**: **Missing max 2 decimal places validation**

**Evidence**:
```typescript
costBeforeTax: z.number().positive('Chi phí trước thuế phải lớn hơn 0')
vat: z.number().min(0).optional().nullable()
totalCost: z.number().positive('Tổng chi phí phải lớn hơn 0')
```

**Problem**: User can input `123.456789` - causes inconsistent calculations, rounding errors in reports.

**Recommendation**: Add decimal precision validation:

```typescript
// Add after line 23
const decimalValidator = (decimals: number) =>
  z.number().refine(
    (val) => {
      const str = val.toString();
      const decimalPart = str.split('.')[1];
      return !decimalPart || decimalPart.length <= decimals;
    },
    { message: `Chỉ được nhập tối đa ${decimals} chữ số thập phân` }
  );

// Update cost fields (lines 63-75)
costBeforeTax: decimalValidator(2).positive('Chi phí trước thuế phải lớn hơn 0')
vat: decimalValidator(2).min(0).optional().nullable()
totalCost: decimalValidator(2).positive('Tổng chi phí phải lớn hơn 0')
paidAmount: decimalValidator(2).min(0).default(0)
```

**Alternative approach** (auto-round):
```typescript
.transform((val) => Math.round(val * 100) / 100) // Round to 2 decimals
```

---

#### 2.2 Lock Validation ❌ CRITICAL MISSING
**Lines**: Entire file (no lock field validation)

**Status**: **Validation schema has no lock checks**

**Evidence**:
- Type definition in `src/types/index.ts` (lines 157-165):
  ```typescript
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
  ```
- Config in `src/config/operator-config.ts` (lines 38-46) shows lock actions exist
- **BUT** validation schema has zero lock field checks

**API check exists** (src/app/api/operators/route.ts not shown in validation schema)

**Problem**: Frontend validation missing. User submits edit → server rejects → poor UX.

**Recommendation**: Add lock validation to schema:

```typescript
// Add to operatorFormBaseSchema (after line 97)
export const updateOperatorWithLockSchema = updateOperatorSchema.extend({
  lockKT: z.boolean().optional(),
  lockAdmin: z.boolean().optional(),
  lockFinal: z.boolean().optional(),
}).refine(
  (data) => {
    // If any lock tier is true, prevent edits to financial fields
    if (data.lockKT || data.lockAdmin || data.lockFinal) {
      return !data.costBeforeTax && !data.vat && !data.totalCost && !data.paidAmount;
    }
    return true;
  },
  {
    message: 'Không thể chỉnh sửa chi phí khi dịch vụ đã bị khóa',
    path: ['_form'],
  }
);
```

**Alternative**: Add validation function for frontend use:

```typescript
// Add after line 259
export function canEditOperator(operator: {
  lockKT?: boolean;
  lockAdmin?: boolean;
  lockFinal?: boolean;
}): { canEdit: boolean; reason?: string } {
  if (operator.lockFinal) {
    return { canEdit: false, reason: 'Dịch vụ đã khóa cuối - không thể chỉnh sửa' };
  }
  if (operator.lockAdmin) {
    return { canEdit: false, reason: 'Dịch vụ đã khóa Admin - không thể chỉnh sửa' };
  }
  if (operator.lockKT) {
    return { canEdit: false, reason: 'Dịch vụ đã khóa KT - không thể chỉnh sửa' };
  }
  return { canEdit: true };
}
```

---

#### 2.3 ServiceDate Range Validation ⚠️ WARNING
**Lines**: None in validation file

**Status**: **Validation exists in API but not in schema**

**API validation exists** (src/app/api/operators/route.ts lines 140-150):
```typescript
// Validate serviceDate is within booking date range
const serviceDate = new Date(validatedData.serviceDate);
if (req.startDate && req.endDate) {
  const startDate = new Date(req.startDate);
  const endDate = new Date(req.endDate);
  if (serviceDate < startDate || serviceDate > endDate) {
    return NextResponse.json({ error: 'Ngày dịch vụ phải trong khoảng...' }, { status: 400 });
  }
}
```

**Problem**: Frontend validation missing → poor UX (submit → server rejects).

**Recommendation**: Add to operator form schema:

```typescript
// Create new schema for operator with request context
export function createOperatorSchemaWithRequest(request: {
  startDate: Date | null;
  endDate: Date | null;
}) {
  return operatorFormSchema.refine(
    (data) => {
      if (!request.startDate || !request.endDate) return true;

      const serviceDate = new Date(data.serviceDate);
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      serviceDate.setHours(12, 0, 0, 0);

      return serviceDate >= startDate && serviceDate <= endDate;
    },
    {
      message: 'Ngày dịch vụ phải trong khoảng ngày tour của booking',
      path: ['serviceDate'],
    }
  );
}
```

**Usage in frontend**:
```typescript
const request = await fetchRequest(requestId);
const schema = createOperatorSchemaWithRequest(request);
const result = schema.safeParse(formData);
```

---

### 3. Revenue Form (revenue-validation.ts)

#### 3.1 Amount > 0 Validation ✅ PASS
**Lines**: 49-61, 94-104

**Status**: Correctly implemented

**Evidence**:
```typescript
// Foreign currency
foreignAmount: z.number().positive('Số tiền ngoại tệ phải > 0').optional().nullable()

// VND
amountVND: z.number().positive('Số tiền VND phải > 0').optional()

// Refinement validates based on currency (lines 94-104)
.refine((data) => {
  if (data.currency === 'VND') {
    return data.amountVND && data.amountVND > 0;
  }
  return true;
}, { message: 'Số tiền VND phải > 0', path: ['amountVND'] })
```

**Recommendation**: No action needed.

---

#### 3.2 Currency Code Restriction ⚠️ CONFIG MISMATCH
**Lines**: 17-27 (validation), src/config/revenue-config.ts lines 28-37 (config)

**Status**: **Requirement says 3 currencies, config has 8**

**Evidence**:
```typescript
// Validation (line 25-27)
const currencyEnum = z.enum(CURRENCY_KEYS as [CurrencyKey, ...CurrencyKey[]])

// Config supports 8 currencies:
VND, USD, EUR, GBP, AUD, JPY, SGD, THB

// Requirement: Only VND, USD, EUR
```

**Problem**: Config-requirement mismatch.

**Recommendation**: **Clarify requirement first**, then either:

**Option A**: Restrict to 3 currencies in validation (strict compliance):
```typescript
// revenue-validation.ts
const ALLOWED_CURRENCIES = ['VND', 'USD', 'EUR'] as const;
const currencyEnum = z.enum(ALLOWED_CURRENCIES, {
  message: 'Chỉ hỗ trợ VND, USD, EUR',
});
```

**Option B**: Keep 8 currencies (assume requirement outdated):
- Update requirement doc to match implementation
- No code changes needed

**Recommended**: Choose Option A if requirement is strict business rule (e.g., accounting limitations), else Option B.

---

#### 3.3 RequestId Existence Check ✅ PASS (API level)
**Lines**: None in validation file

**Status**: **API validates existence** (src/app/api/revenues/route.ts lines 128-150)

**Evidence**:
```typescript
// API check (lines 128-150)
const req = await prisma.request.findUnique({
  where: { id: validatedData.requestId },
  select: { id: true, bookingCode: true, status: true, stage: true },
});

if (!req) {
  return NextResponse.json({ error: 'Booking không tồn tại' }, { status: 404 });
}

if (!req.bookingCode) {
  return NextResponse.json({
    error: 'Chỉ có thể tạo thu nhập cho Booking đã có mã xác nhận',
    errors: { requestId: 'Booking chưa có mã xác nhận' }
  }, { status: 400 });
}
```

**Note**: Database-level validation (FK constraint) also enforces existence.

**Recommendation**: Current implementation correct. Validation schema cannot check DB existence (API responsibility). No action needed.

---

## Recommended Actions Priority

### P0 - Critical (implement immediately)
1. **Operator: Add decimal validation** (2 decimal places max) - lines 63-75
2. **Operator: Add lock validation** (prevent editing locked services) - entire file
3. **Revenue: Clarify currency requirement** (3 vs 8 currencies) - lines 25-27

### P1 - High (implement soon)
4. **Operator: Add serviceDate range validation to schema** (frontend UX) - add refinement
5. **Request: Document phone format inconsistency** (contact vs whatsapp) - lines 27, 32

### P2 - Medium (address in next iteration)
6. **Request: Improve email regex RFC compliance** - line 30
7. **All: Add validation helper tests** (unit tests for edge cases)

### P3 - Low (monitor/document)
8. **All: Add JSDoc comments for validation functions** (developer UX)

---

## Code Change Summary

**Files to modify**:
- `src/lib/validations/operator-validation.ts` (add decimal + lock validation)
- `src/lib/validations/revenue-validation.ts` (clarify currency after requirement review)
- `src/lib/validations/request-validation.ts` (optional: improve email regex)

**New test files needed**:
- `src/lib/validations/__tests__/operator-validation.test.ts` (decimal edge cases)
- `src/lib/validations/__tests__/request-validation.test.ts` (email/phone edge cases)
- `src/lib/validations/__tests__/revenue-validation.test.ts` (currency validation)

**Documentation updates**:
- `docs/validation-rules.md` (create if not exists) - document all validation rules
- `README.md` - add note about validation strategy (schema-first, transform helpers)

---

## Unresolved Questions

1. **Currency requirement**: Should we restrict to VND/USD/EUR only (requirement) or keep 8 currencies (current config)? Need business decision.

2. **Phone formatting**: Should `whatsapp` field accept formatted input like `contact` field? Need UX consistency decision.

3. **Lock validation frontend**: Should lock checks happen in validation schema or separate utility function? Current API has checks but schema doesn't. Need architecture decision.

4. **Decimal rounding**: Should we round automatically or reject input with >2 decimals? Reject = better data integrity, Round = better UX.

5. **Email validation**: Is current regex sufficient for business needs or should we use RFC-compliant version? Need security/compliance review.
