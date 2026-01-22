---
title: "Form Validation Edge Case Fixes"
description: "Fix 27 validation issues across Revenue, Operator, Request, and Supplier forms"
status: completed
priority: P1
effort: 4h
branch: master
tags: [validation, forms, edge-cases, bug-fix]
created: 2026-01-21
completed: 2026-01-22T07:56:00Z
---

# Implementation Plan: Form Validation Edge Case Fixes

## Executive Summary

Based on debugger report `debugger-260121-1724-form-validation-edge-cases.md`, this plan addresses **27 validation issues** across 4 core forms. Priority: CRITICAL financial impact issues in Revenue, HIGH data integrity in Operator.

**Scope**: 7 files to modify, 1 new file to create

---

## Phase 1: Revenue Form Fixes (CRITICAL) [1.5h]

### 1.1 Fix Vietnamese Error Messages (~10min)

**File**: `src/components/revenues/revenue-form.tsx`
**Lines**: 116, 121, 126, 131

**Current (missing diacritics)**:
```typescript
setError('Vui long chon Booking');
setError('Vui long chon loai thanh toan');
setError('Vui long chon nguon thanh toan');
setError('So tien VND phai > 0');
```

**Fix**:
```typescript
setError('Vui lòng chọn Booking');
setError('Vui lòng chọn loại thanh toán');
setError('Vui lòng chọn nguồn thanh toán');
setError('Số tiền VND phải > 0');
```

### 1.2 Add Client-Side Zod Validation (~30min)

**File**: `src/components/revenues/revenue-form.tsx`

Replace manual if-statements with Zod schema validation:

```typescript
import {
  validateRevenueForm,
  type RevenueFormErrors
} from '@/lib/validations/revenue-validation';

// Add state for field-level errors
const [fieldErrors, setFieldErrors] = useState<RevenueFormErrors>({});

// Replace validation block in handleSubmit
const dataToValidate = {
  requestId: formData.requestId,
  paymentDate: formData.paymentDate,
  paymentType: formData.paymentType,
  paymentSource: formData.paymentSource,
  currency: currencyData.currency,
  foreignAmount: currencyData.foreignAmount,
  exchangeRate: currencyData.exchangeRate,
  amountVND: currencyData.amountVND,
  notes: formData.notes,
};

const validation = validateRevenueForm(dataToValidate);
if (!validation.success) {
  setFieldErrors(validation.errors || {});
  setError('Vui lòng kiểm tra lại thông tin');
  setLoading(false);
  return;
}
```

### 1.3 Add Date Validation (~15min)

**File**: `src/components/revenues/revenue-form.tsx`

Add future date validation after Zod validation:

```typescript
// Prevent future payment dates
const paymentDate = new Date(formData.paymentDate);
const today = new Date();
today.setHours(23, 59, 59, 999);

if (paymentDate > today) {
  setFieldErrors(prev => ({
    ...prev,
    paymentDate: 'Ngày thanh toán không được là ngày tương lai'
  }));
  setError('Vui lòng kiểm tra lại thông tin');
  setLoading(false);
  return;
}
```

### 1.4 Extend Revenue Validation Schema (~30min)

**File**: `src/lib/validations/revenue-validation.ts`

Add form schema (reuse from API schema pattern):

```typescript
// ============================================
// Form Schema (Client-side)
// ============================================

export const revenueFormSchema = z.object({
  requestId: z.string().min(1, 'Vui lòng chọn Booking'),
  paymentDate: dateStringRequired,
  paymentType: paymentTypeEnum,
  paymentSource: paymentSourceEnum,
  currency: currencyEnum.default('VND'),
  foreignAmount: z.number().positive().optional().nullable(),
  exchangeRate: z.number().positive().optional().nullable(),
  amountVND: z.number().optional(),
  notes: z.string().max(1000).optional().nullable().transform(val => val?.trim()),
})
.refine(
  (data) => {
    if (data.currency !== 'VND') {
      return data.foreignAmount && data.foreignAmount > 0;
    }
    return true;
  },
  { message: 'Số tiền ngoại tệ là bắt buộc khi dùng ngoại tệ', path: ['foreignAmount'] }
)
.refine(
  (data) => {
    if (data.currency !== 'VND') {
      return data.exchangeRate && data.exchangeRate > 0;
    }
    return true;
  },
  { message: 'Tỷ giá là bắt buộc khi dùng ngoại tệ', path: ['exchangeRate'] }
)
.refine(
  (data) => {
    if (data.currency === 'VND') {
      return data.amountVND && data.amountVND > 0;
    }
    return true;
  },
  { message: 'Số tiền VND phải > 0', path: ['amountVND'] }
);

export type RevenueFormSchemaData = z.infer<typeof revenueFormSchema>;

export function validateRevenueForm(data: unknown): {
  success: boolean;
  data?: RevenueFormSchemaData;
  errors?: RevenueFormErrors;
} {
  const result = revenueFormSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: RevenueFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RevenueFormErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { success: false, errors };
}
```

### 1.5 Add Duplicate Detection (API) (~30min)

**File**: `src/app/api/revenues/route.ts`

Add duplicate check before `prisma.revenue.create`:

```typescript
// Check for duplicate revenue (same booking + date + amount + type)
const paymentDateStart = new Date(validatedData.paymentDate);
paymentDateStart.setHours(0, 0, 0, 0);
const paymentDateEnd = new Date(validatedData.paymentDate);
paymentDateEnd.setHours(23, 59, 59, 999);

const existingRevenue = await prisma.revenue.findFirst({
  where: {
    requestId: validatedData.requestId,
    paymentDate: { gte: paymentDateStart, lte: paymentDateEnd },
    amountVND,
    paymentType: validatedData.paymentType,
  },
  select: { id: true, revenueId: true },
});

if (existingRevenue) {
  return NextResponse.json(
    {
      success: false,
      error: 'Thu nhập này đã được ghi nhận trước đó',
      duplicate: existingRevenue.revenueId,
      errors: { _form: 'Thu nhập trùng lặp' }
    },
    { status: 409 }
  );
}
```

---

## Phase 2: Operator Form Fixes (HIGH) [1h]

### 2.1 Verify Duplicate Detection (API) - ALREADY DONE

**File**: `src/app/api/operators/route.ts`
**Status**: Already implemented (lines 162-186)

```typescript
// Check duplicate service (same booking + serviceType + serviceDate)
const existingService = await prisma.operator.findFirst({...});
```

### 2.2 Verify Date Range Validation (API) - ALREADY DONE

**File**: `src/app/api/operators/route.ts`
**Status**: Already implemented (lines 140-160)

```typescript
// Validate serviceDate is within booking date range
if (serviceDate < startDate || serviceDate > endDate) {...}
```

### 2.3 Add Client-Side Date Range Validation (~30min)

**File**: `src/components/operators/operator-form.tsx`

Add date range validation in `handleSubmit` before API call:

```typescript
import { validateServiceDateInRange } from '@/lib/validations/operator-validation';

// In handleSubmit, after Zod validation succeeds:
const selectedRequest = requests.find(r => r.id === formData.requestId);
if (selectedRequest?.startDate && selectedRequest?.endDate) {
  const dateValidation = validateServiceDateInRange(
    formData.serviceDate,
    { startDate: selectedRequest.startDate, endDate: selectedRequest.endDate }
  );

  if (!dateValidation.valid) {
    setFieldErrors(prev => ({ ...prev, serviceDate: dateValidation.error }));
    setError('Vui lòng kiểm tra lại thông tin');
    setLoading(false);
    return;
  }
}
```

**Requires**: Update Request interface in operator-form.tsx to include dates:

```typescript
interface Request {
  id: string;
  code: string;
  customerName: string;
  status: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}
```

Update fetch to include dates:

```typescript
const reqRes = await fetch('/api/requests?status=F5&limit=100&fields=id,code,customerName,status,startDate,endDate');
```

### 2.4 Add Empty Field onBlur Validation (~15min)

**File**: `src/components/operators/operator-form.tsx`

Add onBlur handler for serviceName:

```typescript
const handleServiceNameBlur = () => {
  if (!formData.serviceName.trim()) {
    setFieldErrors(prev => ({
      ...prev,
      serviceName: 'Tên dịch vụ không được trống'
    }));
  } else {
    setFieldErrors(prev => {
      const { serviceName, ...rest } = prev;
      return rest;
    });
  }
};

// In Input component:
<Input
  id="serviceName"
  value={formData.serviceName}
  onChange={(e) => updateField('serviceName', e.target.value)}
  onBlur={handleServiceNameBlur}
  ...
/>
```

---

## Phase 3: Request Form Fixes (MEDIUM) [30min]

### 3.1 Add Duplicate Warning (~30min)

**File**: `src/components/requests/request-form.tsx`

Add duplicate warning (non-blocking) after Zod validation:

```typescript
const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

// In handleSubmit, before API call:
// Check for potential duplicate (same customer + similar dates)
try {
  const checkRes = await fetch(
    `/api/requests/check-duplicate?` +
    `customerName=${encodeURIComponent(formData.customerName)}` +
    `&startDate=${formData.startDate}` +
    `&excludeId=${initialData?.id || ''}`
  );
  const checkData = await checkRes.json();

  if (checkData.hasSimilar && !duplicateWarning) {
    setDuplicateWarning(
      `Đã có booking tương tự cho "${formData.customerName}" trong khoảng thời gian này. ` +
      `Bạn có chắc muốn tiếp tục?`
    );
    setLoading(false);
    return; // Stop first time, allow on second click
  }
} catch {
  // Ignore duplicate check errors - proceed with save
}

// Clear warning after successful submission or proceed if already warned
setDuplicateWarning(null);
```

Display warning in UI:

```tsx
{duplicateWarning && (
  <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-lg">
    <p className="font-medium">Cảnh báo trùng lặp</p>
    <p className="text-sm">{duplicateWarning}</p>
    <p className="text-sm mt-2">Nhấn "Lưu" lần nữa để tiếp tục.</p>
  </div>
)}
```

**Note**: Requires new API endpoint `/api/requests/check-duplicate` (optional, can skip if time-constrained)

---

## Phase 4: Supplier Form Fixes (MEDIUM) [30min]

### 4.1 Add Pre-Submit Validation (~20min)

**File**: `src/components/suppliers/supplier-form.tsx`

Add explicit validation before submit:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  // Explicit validation
  if (!formData.type) {
    setError('Vui lòng chọn loại NCC');
    setLoading(false);
    return;
  }

  if (!formData.name.trim()) {
    setError('Vui lòng nhập tên NCC');
    setLoading(false);
    return;
  }

  // For new suppliers, ensure code is generated
  if (!isEditing && !generatedCode) {
    setError('Đang tạo mã NCC, vui lòng đợi...');
    setLoading(false);
    return;
  }

  // Rest of existing submit logic...
```

### 4.2 Handle Code Generation Race Condition (~10min)

**File**: `src/components/suppliers/supplier-form.tsx`

Disable submit button when code is generating:

```typescript
const [isGeneratingCode, setIsGeneratingCode] = useState(false);

// In fetchGeneratedCode:
const fetchGeneratedCode = useCallback(async () => {
  if (!formData.type || !formData.name || isEditing) return;

  setIsGeneratingCode(true);
  try {
    // ... existing code
  } finally {
    setIsGeneratingCode(false);
  }
}, [...]);

// Update button:
<Button
  type="submit"
  disabled={loading || (!isEditing && (isGeneratingCode || !generatedCode))}
>
  {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
</Button>
```

---

## Files Changed Summary

| File | Changes | Priority |
|------|---------|----------|
| `src/components/revenues/revenue-form.tsx` | Zod validation, date check, diacritics | CRITICAL |
| `src/lib/validations/revenue-validation.ts` | Form schema, validateRevenueForm | CRITICAL |
| `src/app/api/revenues/route.ts` | Duplicate detection | CRITICAL |
| `src/components/operators/operator-form.tsx` | Date range validation, onBlur | HIGH |
| `src/components/requests/request-form.tsx` | Duplicate warning | MEDIUM |
| `src/components/suppliers/supplier-form.tsx` | Pre-submit validation | MEDIUM |

---

## Testing Checklist

### Revenue Form
- [ ] Submit with missing diacritics error messages - should show proper Vietnamese
- [ ] Submit with future date - should reject
- [ ] Submit duplicate (same booking+date+amount+type) - should show 409 error
- [ ] Submit VND amount = 0 - should show field error
- [ ] Submit foreign currency without exchange rate - should show field error

### Operator Form
- [ ] Select date outside booking range - should show error before API call
- [ ] Leave serviceName empty and blur - should show error immediately
- [ ] Duplicate service (same type+date) - API already handles

### Request Form
- [ ] Create similar booking (same customer+dates) - should show warning
- [ ] Click save again after warning - should proceed

### Supplier Form
- [ ] Submit without type selected - should show error
- [ ] Submit while code is generating - button should be disabled
- [ ] Submit with empty name - should show error

---

## Unresolved Questions (from debugger report)

1. **Revenue Refund Edge Case**: Should refunds allow negative amounts? - Defer to future sprint
2. **Operator Payment Validation**: Allow paidAmount > totalCost? - Keep current behavior (block)
3. **Request Duplicate Threshold**: Define "similar" as same customer + startDate within 7 days
4. **Currency Exchange Rate Source**: Keep hardcoded defaults for now
5. **Date Validation Strictness**: Block future dates for Revenue; warn only for Requests

---

## Implementation Order

1. **Phase 1.1-1.3**: Revenue form UI fixes (quick wins)
2. **Phase 1.4**: Revenue validation schema
3. **Phase 1.5**: Revenue API duplicate detection
4. **Phase 2.3-2.4**: Operator client-side validation
5. **Phase 4**: Supplier validation
6. **Phase 3**: Request duplicate warning (optional if time-constrained)

**Estimated Total Time**: 3.5-4 hours

---

*Generated: 2026-01-21*
*Source: debugger-260121-1724-form-validation-edge-cases.md*
