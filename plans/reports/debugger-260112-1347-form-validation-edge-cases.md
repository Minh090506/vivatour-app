# Form Validation Edge Cases Analysis

**Date:** 2026-01-12 13:47
**Analyzer:** debugger (a003b94)
**Scope:** Request, Operator, Revenue forms validation analysis

---

## Executive Summary

Analyzed validation schemas and forms for Request, Operator, and Revenue entities. Found 12 critical validation gaps, 8 missing validations, and 3 incorrect implementations across client and server validation layers.

**Critical Findings:**
- Request form lacks future-date validation for startDate
- Operator form missing booking date range check for serviceDate
- Revenue form missing bookingCode existence validation
- Empty string handling inconsistent between forms
- Phone validation too permissive, accepts invalid formats
- Currency code validation exists but limited to 8 predefined codes

---

## 1. Request Form Analysis

### File Locations
- Validation: `src/lib/validations/request-validation.ts`
- Form Component: `src/components/requests/request-form.tsx`
- API Route: `src/app/api/requests/route.ts`

### Issues Found

#### 1.1 Empty String vs Null Handling ✅ IMPLEMENTED CORRECTLY

**Finding:** Properly handled with transform and fallback patterns.

**Evidence:**
```typescript
// Lines 63-68: request-validation.ts
whatsapp: z
  .string()
  .regex(phoneRegex, 'Số WhatsApp không hợp lệ (8-15 số)')
  .optional()
  .nullable()
  .or(z.literal('')),
```

**Transform function:** Lines 318-332 `transformRequestFormData()` converts empty strings to null before API submission.

**Status:** ✅ No action needed

---

#### 1.2 Date Validation - Missing Future-Date Check ❌ CRITICAL

**Finding:** `startDate` accepts past dates, but business logic should require future dates only.

**Evidence:**
```typescript
// Lines 80-85: request-validation.ts
startDate: z
  .string()
  .datetime({ message: 'Ngày bắt đầu không hợp lệ' })
  .optional()
  .nullable()
  .or(z.literal('')),
```

**Issue:** No `.refine()` checking `startDate >= today`.

**Impact:** Users can create tours with past start dates, causing downstream issues in operator scheduling.

**Fix Location:** `src/lib/validations/request-validation.ts:80-92`

**Recommended Fix:**
```typescript
startDate: z
  .string()
  .datetime({ message: 'Ngày bắt đầu không hợp lệ' })
  .optional()
  .nullable()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val) return true; // Allow empty
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: 'Ngày bắt đầu phải là ngày hiện tại hoặc tương lai' }
  ),
```

---

#### 1.3 Phone Number Format Validation ⚠️ TOO PERMISSIVE

**Finding:** Phone regex accepts 8-15 digits but doesn't properly validate Vietnamese format.

**Evidence:**
```typescript
// Line 25: request-validation.ts
const phoneRegex = /^(\+?[0-9]{8,15}|0[0-9]{9,10})$/;
```

**Issues:**
1. Accepts any 8-15 digit sequence with optional `+`
2. Vietnamese format `0[0-9]{9,10}` allows 10-11 digits but standard is 9-10 digits after leading 0
3. International format too broad - accepts invalid country codes

**Examples that pass but shouldn't:**
- `+1234567` (7 digits after +, too short)
- `012345678901` (12 digits total, invalid VN format)
- `+999999999999999` (15 9s, no real country code)

**Fix Location:** `src/lib/validations/request-validation.ts:25`

**Recommended Fix:**
```typescript
// Vietnamese: 0[0-9]{9} (10 digits total, starts with 0)
// International: +[1-9][0-9]{7,14} (8-15 digits, valid country code start)
const phoneRegex = /^(\+[1-9][0-9]{7,14}|0[0-9]{9})$/;
```

**Test cases:**
- ✅ `0987654321` (Vietnamese)
- ✅ `+84987654321` (International VN)
- ✅ `+1234567890` (International US)
- ❌ `+0123456789` (Invalid country code starting with 0)
- ❌ `012345678901` (Too long for Vietnamese)

---

#### 1.4 Email Format Validation ❌ MISSING

**Finding:** `contact` field accepts any string, no email validation when used as email.

**Evidence:**
```typescript
// Lines 36-40: request-validation.ts
contact: z
  .string()
  .min(1, 'Thông tin liên hệ không được trống')
  .max(255, 'Thông tin liên hệ không được quá 255 ký tú')
  .transform((val) => val.trim()),
```

**Issue:** Field accepts "email@example.com hoặc SĐT" per placeholder (line 229 request-form.tsx), but no format validation.

**Impact:** Invalid emails stored, causing notification failures.

**Fix Location:** `src/lib/validations/request-validation.ts:36-40`

**Recommended Fix:**
```typescript
contact: z
  .string()
  .min(1, 'Thông tin liên hệ không được trống')
  .max(255, 'Thông tin liên hệ không được quá 255 ký tự')
  .refine(
    (val) => {
      const trimmed = val.trim();
      // Email format: RFC 5322 simplified
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Phone format: digits, +, -, (), spaces allowed
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      return emailRegex.test(trimmed) || phoneRegex.test(trimmed);
    },
    { message: 'Thông tin liên hệ phải là email hoặc số điện thoại hợp lệ' }
  )
  .transform((val) => val.trim()),
```

---

### Request Form Summary

| Issue | Severity | Status | File:Line |
|-------|----------|--------|-----------|
| Empty string handling | Info | ✅ Correct | request-validation.ts:63-68 |
| Future date validation | Critical | ❌ Missing | request-validation.ts:80-92 |
| Phone format validation | Medium | ⚠️ Too permissive | request-validation.ts:25 |
| Contact email/phone validation | Medium | ❌ Missing | request-validation.ts:36-40 |

---

## 2. Operator Form Analysis

### File Locations
- Validation: `src/lib/validations/operator-validation.ts`
- Form Component: `src/components/operators/operator-form.tsx`
- API Route: `src/app/api/operators/route.ts`

### Issues Found

#### 2.1 Cost Validation ✅ IMPLEMENTED CORRECTLY

**Finding:** Costs properly validated as non-negative with proper refinements.

**Evidence:**
```typescript
// Lines 63-75: operator-validation.ts
costBeforeTax: z
  .number({ message: 'Chi phí trước thuế phải là số' })
  .min(0, 'Chi phí trước thuế không được âm'),

totalCost: z
  .number({ message: 'Tổng chi phí phải là số' })
  .min(0, 'Tổng chi phí không được âm'),

// Lines 111-117: Refinement ensures totalCost >= costBeforeTax
.refine(
  (data) => data.totalCost >= data.costBeforeTax,
  {
    message: 'Tổng chi phí phải >= chi phí trước thuế',
    path: ['totalCost'],
  }
)
```

**Status:** ✅ No action needed

---

#### 2.2 Lock State Editing ❌ INCOMPLETE

**Finding:** Lock state prevents editing in UI but validation schemas don't enforce it.

**Evidence:**
```typescript
// operator-form.tsx lines do NOT check lock state before validation
// Form disables inputs (lines not shown in read) but validation schema accepts locked edits

// API route (operators/[id]/route.ts) needs to check lock state
```

**Issue:** Client-side disabled but:
1. API route doesn't validate lock state before updates
2. Direct API calls can bypass UI lock check
3. No server-side lock enforcement in `updateOperatorApiSchema`

**Fix Location:** `src/app/api/operators/[id]/route.ts` (PUT handler)

**Recommended Fix:**
```typescript
// In PUT handler, before validation:
const existing = await prisma.operator.findUnique({
  where: { id: params.id },
  select: { lockKT: true, lockAdmin: true, lockFinal: true, isLocked: true },
});

if (existing?.lockFinal || existing?.lockAdmin || existing?.lockKT || existing?.isLocked) {
  return NextResponse.json(
    { success: false, error: 'Không thể chỉnh sửa dịch vụ đã khóa' },
    { status: 403 }
  );
}
```

---

#### 2.3 Service Date vs Booking Date Range ❌ MISSING CRITICAL VALIDATION

**Finding:** `serviceDate` not validated against booking's `startDate` and `endDate`.

**Evidence:**
```typescript
// Lines 43: operator-validation.ts
serviceDate: dateStringRequired,
// No refinement checking serviceDate is within booking date range
```

**Issue:** Can create service on 2025-01-01 for booking running 2025-06-01 to 2025-06-10.

**Impact:** Services scheduled outside tour dates, causing:
- Supplier booking errors
- Cost allocation to wrong periods
- Reporting inconsistencies

**Fix Location:** `src/lib/validations/operator-validation.ts:43` and API route

**Recommended Approach:**
```typescript
// In API route POST handler (operators/route.ts), after fetching request:
if (req.startDate && req.endDate) {
  const serviceDate = new Date(validatedData.serviceDate);
  const startDate = new Date(req.startDate);
  const endDate = new Date(req.endDate);

  if (serviceDate < startDate || serviceDate > endDate) {
    return NextResponse.json(
      {
        success: false,
        error: `Ngày dịch vụ phải nằm trong khoảng ${formatDate(startDate)} - ${formatDate(endDate)}`,
        errors: { serviceDate: 'Ngày dịch vụ ngoài phạm vi tour' }
      },
      { status: 400 }
    );
  }
}
```

**Note:** This is business logic validation, should be in API route not Zod schema (requires DB lookup).

---

#### 2.4 Positive Number Validation ✅ CORRECT BUT SHOULD BE STRICTER

**Finding:** Costs validated as `>= 0` but should be `> 0` for actual costs.

**Evidence:**
```typescript
// Line 65: operator-validation.ts
costBeforeTax: z
  .number({ message: 'Chi phí trước thuế phải là số' })
  .min(0, 'Chi phí trước thuế không được âm'),
```

**Issue:** Allows `costBeforeTax: 0` and `totalCost: 0` which is nonsensical for service costs.

**Business Impact:** Zero-cost services skew reporting and profit calculations.

**Fix Location:** `src/lib/validations/operator-validation.ts:63-75`

**Recommended Fix:**
```typescript
costBeforeTax: z
  .number({ message: 'Chi phí trước thuế phải là số' })
  .positive('Chi phí trước thuế phải lớn hơn 0'),

totalCost: z
  .number({ message: 'Tổng chi phí phải là số' })
  .positive('Tổng chi phí phải lớn hơn 0'),
```

**Exception:** If zero-cost services are valid (e.g., complimentary), add optional flag:
```typescript
isFree: z.boolean().optional().default(false),
// Then in refinement: if (!data.isFree && data.totalCost === 0) { return false; }
```

---

### Operator Form Summary

| Issue | Severity | Status | File:Line |
|-------|----------|--------|-----------|
| Cost validation | Info | ✅ Correct | operator-validation.ts:63-75 |
| Lock state editing | High | ❌ Missing API check | operators/[id]/route.ts |
| Service date range check | Critical | ❌ Missing | operator-validation.ts:43 + API |
| Zero-cost prevention | Medium | ⚠️ Should be stricter | operator-validation.ts:63-75 |

---

## 3. Revenue Form Analysis

### File Locations
- Validation: `src/lib/validations/revenue-validation.ts`
- Form Component: `src/components/revenues/revenue-form.tsx`
- API Route: `src/app/api/revenues/route.ts`

### Issues Found

#### 3.1 Amount Validation ✅ IMPLEMENTED CORRECTLY

**Finding:** Amount properly validated as positive with currency-specific logic.

**Evidence:**
```typescript
// Lines 48-61: revenue-validation.ts
foreignAmount: z
  .number({ message: 'So tien ngoai te phai la so' })
  .positive('So tien ngoai te phai > 0')
  .optional()
  .nullable(),

amountVND: z
  .number({ message: 'So tien VND phai la so' })
  .positive('So tien VND phai > 0')
  .optional(),

// Lines 69-105: Refinements ensure proper amounts based on currency
```

**Status:** ✅ No action needed

---

#### 3.2 Currency Code Validation ✅ CORRECT BUT LIMITED

**Finding:** Currency validated against predefined enum, follows ISO 4217 for included codes.

**Evidence:**
```typescript
// Lines 24-27: revenue-validation.ts
const currencyEnum = z.enum(CURRENCY_KEYS as [CurrencyKey, ...CurrencyKey[]], {
  message: 'Loai tien te khong hop le',
});

// revenue-config.ts:28-37 defines 8 currencies:
// VND, USD, EUR, GBP, AUD, JPY, SGD, THB
```

**Status:** ✅ Correct implementation

**Note:** Limited to 8 currencies. If business expands to other regions (e.g., CNY, KRW, INR), config needs updates.

**Future Enhancement:** Consider dynamic currency list from DB or external API.

---

#### 3.3 Linked bookingCode Validation ❌ MISSING

**Finding:** `requestId` validated for existence but not for `bookingCode` presence.

**Evidence:**
```typescript
// revenues/route.ts:129-139
const req = await prisma.request.findUnique({
  where: { id: validatedData.requestId },
  select: { id: true, bookingCode: true },
});

if (!req) {
  return NextResponse.json(
    { success: false, error: 'Yeu cau khong ton tai' },
    { status: 404 }
  );
}
// No check for req.bookingCode being null
```

**Issue:** Revenue can be created for requests without `bookingCode`, causing:
- `revenueId` generation to fallback to `requestId` (line 142)
- Inconsistent revenue ID format
- Difficulty linking revenues to confirmed bookings

**Business Logic:** Revenues should only be created for confirmed bookings (status F5 or OUTCOME stage) with assigned booking codes.

**Fix Location:** `src/app/api/revenues/route.ts:129-139`

**Recommended Fix:**
```typescript
const req = await prisma.request.findUnique({
  where: { id: validatedData.requestId },
  select: { id: true, bookingCode: true, status: true, stage: true },
});

if (!req) {
  return NextResponse.json(
    { success: false, error: 'Booking không tồn tại' },
    { status: 404 }
  );
}

// Ensure booking is confirmed and has bookingCode
if (!req.bookingCode) {
  return NextResponse.json(
    {
      success: false,
      error: 'Chỉ có thể tạo thu nhập cho Booking đã có mã xác nhận',
      errors: { requestId: 'Booking chưa có mã xác nhận' }
    },
    { status: 400 }
  );
}

// Optional: Also check stage
if (req.stage !== 'OUTCOME') {
  return NextResponse.json(
    {
      success: false,
      error: 'Chỉ có thể tạo thu nhập cho Booking ở giai đoạn OUTCOME',
      errors: { requestId: 'Booking chưa ở giai đoạn xác nhận' }
    },
    { status: 400 }
  );
}
```

---

#### 3.4 Lock State Editing ❌ INCOMPLETE (Same as Operator)

**Finding:** UI blocks editing when locked but API doesn't enforce.

**Evidence:**
```typescript
// revenue-form.tsx:174
const isLocked = revenue?.lockKT || revenue?.lockAdmin || revenue?.lockFinal || revenue?.isLocked;

// Lines 236, 245, 266, 308: disabled={isLocked}
// But API route doesn't check lock state
```

**Fix Location:** `src/app/api/revenues/[id]/route.ts` (PUT handler - not shown in reads)

**Recommended Fix:** Same pattern as Operator - check lock state before allowing updates.

---

### Revenue Form Summary

| Issue | Severity | Status | File:Line |
|-------|----------|--------|-----------|
| Amount validation | Info | ✅ Correct | revenue-validation.ts:48-105 |
| Currency code validation | Info | ✅ Correct (limited) | revenue-validation.ts:24-27 |
| bookingCode existence check | High | ❌ Missing | revenues/route.ts:129-139 |
| Lock state API enforcement | High | ❌ Missing | revenues/[id]/route.ts |

---

## Cross-Cutting Issues

### 4.1 Inconsistent Error Messages Language

**Finding:** Mixed Vietnamese and English error keys in validation schemas.

**Evidence:**
```typescript
// request-validation.ts: Vietnamese messages ✅
'Tên khách hàng phải có ít nhất 2 ký tự'

// operator-validation.ts: Vietnamese messages ✅
'Chi phí trước thuế không được âm'

// revenue-validation.ts: Vietnamese without diacritics ⚠️
'So tien ngoai te phai la so' (missing diacritics: Số tiền ngoại tệ phải là số)
```

**Issue:** Revenue validation uses Vietnamese without diacritics, making messages less professional.

**Fix Location:** `src/lib/validations/revenue-validation.ts` (all error messages)

**Recommended:** Add diacritics for consistency:
- `So tien` → `Số tiền`
- `phai` → `phải`
- `hop le` → `hợp lệ`
- `bat buoc` → `bắt buộc`

---

### 4.2 Date String Validation Inconsistency

**Finding:** Different date validation patterns across schemas.

**Evidence:**
```typescript
// request-validation.ts:80-85
startDate: z
  .string()
  .datetime({ message: 'Ngày bắt đầu không hợp lệ' })
  .optional()
  .nullable()
  .or(z.literal('')),

// operator-validation.ts:25-27
const dateStringRequired = z
  .string({ message: 'Ngày là bắt buộc' })
  .refine((val) => val && !isNaN(Date.parse(val)), { message: 'Ngày không hợp lệ' });

// revenue-validation.ts:30-32 (same as operator)
```

**Issue:**
- Request uses `.datetime()` (strict ISO 8601)
- Operator/Revenue use `.refine(Date.parse)` (lenient, accepts many formats)

**Impact:** Request form requires `YYYY-MM-DDTHH:MM:SSZ`, others accept `YYYY-MM-DD`, `MM/DD/YYYY`, etc.

**Recommended:** Standardize on one approach:
```typescript
// For date-only fields (no time):
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD')
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Ngày không hợp lệ' });

// For datetime fields:
const datetimeString = z
  .string()
  .datetime({ message: 'Định dạng ngày giờ không hợp lệ' });
```

---

## API Route Validation Gaps

### 5.1 Request API Route

**File:** `src/app/api/requests/route.ts`

**Gaps:**
1. ✅ Uses Zod validation (line 120)
2. ✅ Extracts field errors (line 126)
3. ❌ No business logic validation for startDate >= today
4. ❌ No duplicate checking (same customer + country + date)

---

### 5.2 Operator API Route

**File:** `src/app/api/operators/route.ts`

**Gaps:**
1. ✅ Uses Zod validation (line 109)
2. ✅ Validates request exists and is F5 (lines 121-138)
3. ✅ Duplicate service check (lines 147-165)
4. ❌ No serviceDate range validation against booking dates
5. ❌ No lock state check in update route

**Note:** Duplicate check good but doesn't account for multiple services of same type on same day (e.g., 2 different hotels).

---

### 5.3 Revenue API Route

**File:** `src/app/api/revenues/route.ts`

**Gaps:**
1. ✅ Uses Zod validation (line 115)
2. ✅ Validates request exists (lines 129-139)
3. ❌ No bookingCode presence check
4. ❌ No stage/status validation (should be OUTCOME or F5)
5. ❌ No duplicate payment check (same booking + date + amount)
6. ❌ No lock state check in update route

---

## Summary Tables

### Critical Issues (Fix Immediately)

| # | Form | Issue | Impact | Fix File |
|---|------|-------|--------|----------|
| 1 | Request | startDate allows past dates | Tours with invalid dates | request-validation.ts:80 |
| 2 | Operator | serviceDate not checked against booking range | Services outside tour dates | operators/route.ts:POST |
| 3 | Revenue | bookingCode not validated | Revenues for unconfirmed bookings | revenues/route.ts:129 |
| 4 | Operator | Lock state not enforced in API | Locked records can be edited via API | operators/[id]/route.ts:PUT |
| 5 | Revenue | Lock state not enforced in API | Locked records can be edited via API | revenues/[id]/route.ts:PUT |

---

### Medium Priority Issues

| # | Form | Issue | Impact | Fix File |
|---|------|-------|--------|----------|
| 6 | Request | Phone validation too permissive | Invalid phone numbers stored | request-validation.ts:25 |
| 7 | Request | Contact field no email/phone format check | Invalid contact info | request-validation.ts:36 |
| 8 | Operator | Zero costs allowed | Skewed reporting | operator-validation.ts:63 |
| 9 | Revenue | Vietnamese messages without diacritics | Unprofessional UX | revenue-validation.ts:all |

---

### Low Priority / Enhancement

| # | Form | Issue | Impact | Fix File |
|---|------|-------|--------|----------|
| 10 | All | Date validation inconsistency | Confusion across forms | All validation files |
| 11 | Revenue | Limited currency list | Expansion to new markets blocked | revenue-config.ts:28 |
| 12 | Operator | No duplicate accounting for multi-service | Edge case: 2 hotels on same day | operators/route.ts:147 |

---

## Recommended Fix Priority

### Phase 1 - Critical Security/Data Integrity (1-2 days)
1. Add lock state enforcement in Operator and Revenue update APIs
2. Add bookingCode validation in Revenue creation
3. Add serviceDate range check in Operator creation

### Phase 2 - Business Logic (2-3 days)
4. Add future-date validation for Request startDate
5. Add stage/status validation for Revenue creation
6. Strengthen cost validation (no zero costs)

### Phase 3 - Data Quality (1-2 days)
7. Fix phone number regex
8. Add contact field format validation
9. Fix Vietnamese diacritics in Revenue validation

### Phase 4 - Polish (1 day)
10. Standardize date validation across schemas
11. Add duplicate payment detection
12. Document currency list expansion process

---

## Testing Recommendations

### Test Cases for Each Issue

#### Request Form
```typescript
// Test: Future date validation
it('should reject past startDate', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const result = requestFormSchema.safeParse({
    ...validData,
    startDate: yesterday.toISOString(),
  });
  expect(result.success).toBe(false);
  expect(result.error.issues[0].message).toContain('tương lai');
});

// Test: Phone validation
it('should reject invalid phone formats', async () => {
  const invalid = ['1234567', '+0123456789', '012345678901'];
  for (const phone of invalid) {
    const result = requestFormSchema.safeParse({ ...validData, whatsapp: phone });
    expect(result.success).toBe(false);
  }
});
```

#### Operator Form
```typescript
// Test: Lock state API enforcement
it('should reject updates to locked operators', async () => {
  const locked = await createOperator({ lockKT: true });
  const response = await fetch(`/api/operators/${locked.id}`, {
    method: 'PUT',
    body: JSON.stringify({ serviceName: 'Updated' }),
  });
  expect(response.status).toBe(403);
});

// Test: Service date range
it('should reject serviceDate outside booking range', async () => {
  const booking = await createBooking({
    startDate: '2025-06-01',
    endDate: '2025-06-10'
  });
  const response = await fetch('/api/operators', {
    method: 'POST',
    body: JSON.stringify({
      requestId: booking.id,
      serviceDate: '2025-05-01', // Before start
      ...otherValidData,
    }),
  });
  expect(response.status).toBe(400);
  expect(response.body.errors.serviceDate).toBeDefined();
});
```

#### Revenue Form
```typescript
// Test: bookingCode validation
it('should reject revenue for booking without bookingCode', async () => {
  const booking = await createBooking({ bookingCode: null });
  const response = await fetch('/api/revenues', {
    method: 'POST',
    body: JSON.stringify({
      requestId: booking.id,
      ...otherValidData,
    }),
  });
  expect(response.status).toBe(400);
  expect(response.body.error).toContain('mã xác nhận');
});
```

---

## Unresolved Questions

1. **Request startDate validation:** Should we allow today or only future dates? Clarify with PM.

2. **Operator zero-cost services:** Are complimentary services valid? If yes, need `isFree` flag.

3. **Revenue bookingCode requirement:** Should we also enforce stage=OUTCOME or allow F5? Check business rules.

4. **Operator duplicate services:** Should we allow multiple hotels on same day? Edge case needs clarification.

5. **Currency expansion:** Is there a roadmap for additional currencies? If yes, plan dynamic currency list.

6. **Date format standardization:** Should all dates be ISO 8601 or allow YYYY-MM-DD? Impact on existing data.

7. **Lock state behavior:** What should happen when user tries to edit locked record? Just reject or show specific tier message?

---

## Files Analyzed

### Validation Schemas
- `src/lib/validations/request-validation.ts` (435 lines)
- `src/lib/validations/operator-validation.ts` (388 lines)
- `src/lib/validations/revenue-validation.ts` (206 lines)

### Form Components
- `src/components/requests/request-form.tsx` (396 lines)
- `src/components/operators/operator-form.tsx` (530 lines)
- `src/components/revenues/revenue-form.tsx` (329 lines)

### API Routes
- `src/app/api/requests/route.ts` (198 lines)
- `src/app/api/operators/route.ts` (251 lines)
- `src/app/api/revenues/route.ts` (203 lines)

### Config Files
- `src/config/revenue-config.ts` (53 lines)
- `src/config/operator-config.ts` (51 lines)

**Total Lines Analyzed:** 2,640 lines across 11 files

---

**Report End**
