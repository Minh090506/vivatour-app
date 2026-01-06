# Code Review: Revenue Module Implementation

**Date:** January 6, 2026 | **Reviewer:** Code Quality Specialist | **Scope:** Phase 1-A & 1-B (API + UI)

---

## Code Review Summary

### Scope
- **Files Reviewed:** 10 files
  - API: 5 routes + 1 config
  - UI: 4 components + 1 index
- **Lines of Code:** ~1,200 LOC
- **Review Focus:** Security, error handling, TypeScript compliance, REST conventions, Vietnamese localization
- **Test Status:** No unit tests found - tests required for production

---

## Overall Assessment

**Status: CONDITIONAL PASS WITH CRITICAL ISSUES**

Implementation demonstrates solid structure and Vietnamese localization but has **critical security and architectural gaps** that must be resolved before production deployment. Code quality is generally good, but missing proper authentication/authorization enforcement, incomplete error validation, and architectural inconsistencies.

---

## Critical Issues

### 1. **MISSING AUTHENTICATION & AUTHORIZATION (Security Critical)**

**Severity:** CRITICAL | **Impact:** Complete security bypass

All API endpoints lack authentication enforcement:

```typescript
// src/app/api/revenues/[id]/lock/route.ts (line 14-21)
// TODO: Verify user has revenue:manage permission
// const user = await getUser(userId);
// if (!hasPermission(user.role, 'revenue:manage')) {
//   return NextResponse.json(
//     { success: false, error: 'Không có quyền khóa thu nhập' },
//     { status: 403 }
//   );
// }
```

**Problem:** Commented-out auth checks means:
- Any user can lock/unlock revenues (intended ACCOUNTANT only for lock, ADMIN only for unlock)
- No session verification at all
- UserId spoofing possible - clients send arbitrary userId in request body

**Also affects:**
- `/api/revenues` POST/GET (no user context)
- `/api/revenues/[id]` PUT/DELETE (no user verification)
- `/api/revenues/[id]/unlock` POST (no ADMIN role check)

**Fix Required Before Production:**
```typescript
// At route start, add:
import { auth } from '@/lib/auth'; // NextAuth v5

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); // Get from session, not request body

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Không được xác thực' },
      { status: 401 }
    );
  }

  // Verify permission based on route
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (route === 'lock' && !['ACCOUNTANT', 'ADMIN'].includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Không có quyền khóa thu nhập' },
      { status: 403 }
    );
  }

  if (route === 'unlock' && user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Chỉ Admin được mở khóa' },
      { status: 403 }
    );
  }

  // Continue with userId from session, not request body
  const userId = session.user.id;
  // ...
}
```

---

### 2. **INCOMPLETE INPUT VALIDATION (Data Integrity Risk)**

**Severity:** CRITICAL | **Impact:** Data corruption, calculation errors

#### Issue A: Missing Validation on Amount Updates
```typescript
// src/app/api/revenues/[id]/route.ts (line 80-104)
// When updating: foreignAmount, exchangeRate, or amountVND can be undefined
// No validation that they're > 0 when currency is not VND

if (body.currency !== undefined || body.foreignAmount !== undefined || body.exchangeRate !== undefined || body.amountVND !== undefined) {
  if (currency === 'VND') {
    amountVND = Number(body.amountVND ?? existing.amountVND) || 0; // 0 allowed!
```

**Problem:** `|| 0` fallback allows zero amounts:
- User updates amountVND to undefined → becomes 0 → silent data loss
- foreignAmount/exchangeRate can become 0 without validation

**Fix:**
```typescript
if (currency === 'VND') {
  const newAmount = body.amountVND !== undefined ? Number(body.amountVND) : existing.amountVND;
  if (newAmount <= 0) {
    return NextResponse.json(
      { success: false, error: 'Số tiền VND phải > 0' },
      { status: 400 }
    );
  }
  amountVND = newAmount;
} else {
  const newForeign = body.foreignAmount !== undefined ? Number(body.foreignAmount) : existing.foreignAmount;
  const newRate = body.exchangeRate !== undefined ? Number(body.exchangeRate) : existing.exchangeRate;

  if (!newForeign || newForeign <= 0 || !newRate || newRate <= 0) {
    return NextResponse.json(
      { success: false, error: 'Số tiền và tỷ giá ngoại tệ phải > 0' },
      { status: 400 }
    );
  }
  // ... rest
}
```

#### Issue B: Missing paymentType/paymentSource Validation on Update
```typescript
// Line 67 only validates paymentType IF provided
if (body.paymentType && !PAYMENT_TYPE_KEYS.includes(body.paymentType)) {
  // validate
}
// But paymentSource is NOT validated at all!
```

**Fix:** Add paymentSource validation:
```typescript
if (body.paymentSource && !PAYMENT_SOURCE_KEYS.includes(body.paymentSource)) {
  return NextResponse.json(
    { success: false, error: `Nguồn thanh toán không hợp lệ: ${body.paymentSource}` },
    { status: 400 }
  );
}
```

#### Issue C: Date Not Validated
```typescript
// src/app/api/revenues/route.ts (line 143)
paymentDate: new Date(body.paymentDate),
// If invalid date string → Invalid Date object → silent failure

// src/app/api/revenues/[id]/route.ts (line 110)
paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
// Can be set to undefined when updating, orphaning payment record
```

**Fix:**
```typescript
if (body.paymentDate) {
  const date = new Date(body.paymentDate);
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { success: false, error: 'Ngày thanh toán không hợp lệ' },
      { status: 400 }
    );
  }
  paymentDate = date;
}
```

---

### 3. **SQL INJECTION VULNERABILITY (Minor Risk, Prisma Mitigates)**

**Severity:** MEDIUM | **Impact:** Parameter pollution, though Prisma parameterizes

```typescript
// src/app/api/revenues/route.ts (line 25-30)
if (requestId) where.requestId = requestId;
if (paymentType) where.paymentType = paymentType;
if (paymentSource) where.paymentSource = paymentSource;
if (currency) where.currency = currency;
```

**Problem:** While Prisma prevents SQL injection, values aren't validated against enums:
- User can filter by paymentType="INVALID" → returns 0 records silently
- Should validate currency against CURRENCY_KEYS, paymentType against PAYMENT_TYPE_KEYS

**Fix:**
```typescript
if (paymentType && PAYMENT_TYPE_KEYS.includes(paymentType)) {
  where.paymentType = paymentType;
}
if (currency && CURRENCY_KEYS.includes(currency)) {
  where.currency = currency;
}
if (paymentSource && PAYMENT_SOURCE_KEYS.includes(paymentSource)) {
  where.paymentSource = paymentSource;
}
```

---

### 4. **ARCHITECTURE: DUPLICATED CONFIG (Code Smell)**

**Severity:** MEDIUM | **Impact:** Maintenance burden, inconsistency

Config exists in **3 different places**:
1. `src/config/revenue-config.ts` (source of truth - 53 lines)
2. `src/components/ui/currency-input.tsx` (duplicated - 32 lines, lines 9-32)
3. `src/components/revenues/revenue-form.tsx` (duplicated - 27 lines, lines 13-27)

**Problem:**
- UI components have inline copies to "avoid build-time dependency" (comment line 8, currency-input.tsx)
- If config changes, 3 places must update
- Risk of inconsistency between API and UI

**Fix:** Remove "avoid build-time dependency" concern - it's unfounded:
```typescript
// src/components/ui/currency-input.tsx
import { CURRENCIES, CURRENCY_KEYS, DEFAULT_EXCHANGE_RATES } from '@/config/revenue-config';
// No circular imports or build issues - this is safe
```

Then delete duplicated inline configs from components.

---

## High Priority Findings

### 1. **Missing Request Existence Check (Data Integrity)**

```typescript
// src/app/api/revenues/route.ts (line 91-100)
const req = await prisma.request.findUnique({
  where: { id: body.requestId },
});

if (!req) {
  return NextResponse.json(
    { success: false, error: 'Yêu cầu không tồn tại' },
    { status: 404 }
  );
}
```

✅ **Correct on POST** - checks exist.

❌ **Missing on PUT** (line 40-46):
```typescript
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // No request existence check when updating!
    // User could change requestId to non-existent ID
```

**Fix:**
```typescript
if (body.requestId) {
  const req = await prisma.request.findUnique({
    where: { id: body.requestId },
  });
  if (!req) {
    return NextResponse.json(
      { success: false, error: 'Yêu cầu không tồn tại' },
      { status: 404 }
    );
  }
}
```

---

### 2. **Inconsistent Error Responses (API Design)**

**Severity:** MEDIUM | **Impact:** Client inconsistency

Some errors expose implementation details:

```typescript
// Line 63: Includes actual error message from database
{ success: false, error: `Lỗi tải danh sách thu nhập: ${message}` }

// Should be:
{ success: false, error: 'Lỗi tải danh sách thu nhập. Vui lòng thử lại sau.' }
```

Database errors (FK violations, constraint errors) leak to client. **Fix:**

```typescript
catch (error) {
  console.error('Error fetching revenues:', error);

  // Log full error server-side
  if (error instanceof PrismaClientKnownRequestError) {
    // Handle specific DB errors
    if (error.code === 'P2025') { // Record not found
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }
  }

  // Generic message to client
  return NextResponse.json(
    { success: false, error: 'Lỗi hệ thống. Vui lòng thử lại sau.' },
    { status: 500 }
  );
}
```

---

### 3. **Type Inconsistency (TypeScript)**

**Severity:** HIGH | **Impact:** Runtime errors, type unsafety

API returns `Decimal` from Prisma, but types expect `number`:

```typescript
// src/app/api/revenues/[id]/route.ts (line 76-78)
let amountVND = Number(existing.amountVND);  // Converting Prisma Decimal to number
let foreignAmount = existing.foreignAmount ? Number(existing.foreignAmount) : null;
let exchangeRate = existing.exchangeRate ? Number(existing.exchangeRate) : null;
```

This works but:
1. **Unnecessary conversions** on every update
2. **Precision loss** - Decimal(15,0) converted to float
3. **Inconsistent** with response type

**Better approach:**
```typescript
// In Prisma schema, use Int for VND (no decimals needed):
amountVND       Int           @db.Integer  // Store as pennies or base unit
foreignAmount   Decimal?  @db.Decimal(15, 2)  // Keep as-is
exchangeRate    Decimal?  @db.Decimal(15, 4)  // Keep as-is

// In API, return as strings to preserve precision:
const revenue = await prisma.revenue.findUnique({ where: { id } });
return NextResponse.json({
  success: true,
  data: {
    ...revenue,
    amountVND: revenue.amountVND.toString(),
    foreignAmount: revenue.foreignAmount?.toString() || null,
    exchangeRate: revenue.exchangeRate?.toString() || null,
  }
});
```

---

### 4. **Missing Pagination Validation (Performance)**

**Severity:** MEDIUM | **Impact:** DoS vulnerability, poor UX

```typescript
// src/app/api/revenues/route.ts (line 18-19)
const limit = parseInt(searchParams.get('limit') || '50');
const offset = parseInt(searchParams.get('offset') || '0');
```

**Problem:**
- No max limit check - client can request `?limit=1000000` → full table scan
- No offset validation - negative offsets allowed

**Fix:**
```typescript
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

let limit = parseInt(searchParams.get('limit') || '50');
limit = Math.max(MIN_LIMIT, Math.min(limit, MAX_LIMIT));

let offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));
```

---

## Medium Priority Improvements

### 1. **TypeScript: `eslint-disable` Without Justification**

```typescript
// src/app/api/revenues/route.ts (line 22-23)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const where: Record<string, any> = {};
```

**Issue:** While suppressing the lint rule is correct (Prisma where clauses need flexible types), comment should explain:

```typescript
// Prisma where clause requires flexible type for dynamic filters
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const where: Record<string, any> = {};
```

---

### 2. **Missing Response Type Definitions**

Components receive untyped responses:

```typescript
// src/components/revenues/revenue-form.tsx (line 155)
const data = await res.json();

if (!data.success) {
  setError(data.error || 'Có lỗi xảy ra');
  return;
}
```

No `ApiResponse<Revenue>` type defined. **Fix:**

```typescript
// src/types/index.ts
interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
  total?: number;
  hasMore?: boolean;
}

// Then in component:
const data: ApiResponse<Revenue> = await res.json();
```

---

### 3. **Vietnamese Labels Inconsistency**

| File | Label | Correct? |
|------|-------|----------|
| currency-input.tsx | "Loại tiền" | ✅ Correct |
| revenue-form.tsx | "Booking" | ✅ Correct (established term) |
| revenue-table.tsx | "Một phần" | ⚠️ Should be "Thanh toán một phần" |
| API errors | "Lỗi tải danh sách thu nhập" | ✅ Correct |

**Minor:** Truncated label in table inconsistent with form. Keep consistent:
```typescript
// revenue-table.tsx line 33
PARTIAL: 'Thanh toán một phần',  // Match form.tsx
```

---

### 4. **Console.error Without Context (Debugging)**

```typescript
// Multiple locations
console.error('Error fetching revenues:', error);
console.error('Error creating revenue:', error);
```

Add request context for production debugging:

```typescript
const requestId = crypto.randomUUID();
console.error(`[${requestId}] Error fetching revenues:`, error);

return NextResponse.json(
  { success: false, error: 'Lỗi hệ thống. Vui lòng thử lại sau.', requestId }, // Optional
  { status: 500 }
);
```

---

## Low Priority Suggestions

### 1. **Currency Input: Direct VND Field Allows Bypass**

```typescript
// src/components/ui/currency-input.tsx (line 185-199)
{!isVND && (
  <div className="space-y-2">
    <Label htmlFor="amountVNDResult">Quy đổi VND</Label>
    <Input
      id="amountVNDResult"
      type="number"
      value={value.amountVND || ''}
      onChange={(e) => handleVNDDirectChange(e.target.value)}  // User can edit!
      className="bg-gray-100 font-bold"
      disabled={disabled}
    />
```

**Issue:** User can directly edit calculated VND amount (read-only field should be disabled):

```typescript
<Input
  id="amountVNDResult"
  type="number"
  value={value.amountVND || ''}
  disabled={true}  // Make truly read-only
  className="bg-gray-100 font-bold text-gray-500"
/>
```

---

### 2. **Form: No Loading State During Request Fetch**

```typescript
// src/components/revenues/revenue-form.tsx (line 87-103)
useEffect(() => {
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/requests?stage=OUTCOME&limit=100');
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };
  fetchRequests();
}, []);
```

**Good:** Has loading state. **Minor improvement:**

```typescript
} catch (err) {
  console.error('Error fetching requests:', err);
  setError('Lỗi tải danh sách Booking'); // Show user-facing error
}
```

---

### 3. **Summary Card: Refund Logic Unclear**

```typescript
// src/components/revenues/revenue-summary-card.tsx (line 22-24)
const totalVND = revenues.reduce((sum, r) => {
  const amount = Number(r.amountVND) || 0;
  return r.paymentType === 'REFUND' ? sum - amount : sum + amount;  // Subtract refunds
}, 0);
```

**Minor:** Consider naming clarity:

```typescript
const totalVND = revenues.reduce((sum, r) => {
  const amount = Number(r.amountVND) || 0;
  // Refunds are recorded as negative in total (contra revenue)
  const signed = r.paymentType === 'REFUND' ? -amount : amount;
  return sum + signed;
}, 0);
```

---

### 4. **Table: Accessible Color-Only Status Indicators**

```typescript
// src/components/revenues/revenue-table.tsx (line 200-209)
{revenue.isLocked ? (
  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
    <Lock className="w-3 h-3 mr-1" />
    Đã khóa
  </Badge>
) : (
  <Badge variant="outline" className="text-green-600">
    Mở  // Color alone - not accessible
  </Badge>
)}
```

**Fix:** Add icon for color-blind accessibility:

```typescript
) : (
  <Badge variant="outline" className="text-green-600">
    <CheckCircle className="w-3 h-3 mr-1" />
    Mở
  </Badge>
)}
```

---

### 5. **Magic Numbers in Exchange Rates**

```typescript
// src/config/revenue-config.ts (line 43-52)
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyKey, number> = {
  VND: 1,
  USD: 25000,     // Hardcoded! Changes daily
  EUR: 27000,
  GBP: 32000,
  AUD: 16500,
  JPY: 165,
  SGD: 18500,
  THB: 700,
};
```

**Issue:** Rates are stale and must be user-overridable in UI (which they are).

**Suggestion:** Add a comment noting these are defaults:

```typescript
// Default rates (fallback only - users must input current rates)
// Last updated: 2026-01-06
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyKey, number> = {
```

---

## Positive Observations

✅ **Proper Error Handling Flow** - Try/catch in all route handlers
✅ **Vietnamese Localization Complete** - All UI text in Vietnamese, appropriate labels
✅ **REST Conventions** - Proper HTTP methods (GET/POST/PUT/DELETE)
✅ **Consistent API Response Format** - `{ success, data/error }` pattern throughout
✅ **Database Relations Proper** - Prisma include/select optimization present
✅ **Component Composition** - Good separation of concerns (form, table, summary card)
✅ **Responsive Design** - Tailwind grid system used correctly
✅ **Type Safety (Mostly)** - Props interfaces defined, TypeScript strict mode
✅ **Lock Mechanism** - Prevents modification of locked records correctly
✅ **Currency Multi-support** - 8 currencies with decimal handling

---

## Recommended Actions (Priority Order)

### BEFORE PRODUCTION (Must Fix)
1. **Implement NextAuth.js session-based authentication** in all API routes
   - Replace `userId` from request body with session
   - Add role-based authorization checks (lock = ACCOUNTANT|ADMIN, unlock = ADMIN)
   - Add 401/403 response tests
   - **Estimated effort:** 3-4 hours

2. **Complete input validation** on all endpoints
   - Validate foreignAmount/exchangeRate > 0 on PUT
   - Validate paymentSource on PUT
   - Validate paymentDate format
   - Check request existence on PUT
   - **Estimated effort:** 1-2 hours

3. **Add request body validation with Zod schema**
   - Create `revenueSchema` for POST/PUT validation
   - Use `zodResolver` in forms (already partially done)
   - **Estimated effort:** 2 hours

### BEFORE PRODUCTION (Should Fix)
4. **Consolidate duplicated configs** - remove from UI components
   - Single source of truth in `src/config/revenue-config.ts`
   - **Estimated effort:** 30 minutes

5. **Add pagination security** - limit max results
   - Enforce MAX_LIMIT = 100, MIN_LIMIT = 1
   - Validate offset >= 0
   - **Estimated effort:** 30 minutes

6. **Improve error responses** - don't leak database errors
   - Generic messages to client, detailed logs server-side
   - Add request IDs for debugging
   - **Estimated effort:** 1 hour

### AFTER LAUNCH (Nice to Have)
7. Create response type definitions (`ApiResponse<T>`)
8. Add unit tests for API routes (auth, validation, calculations)
9. Add E2E tests for revenue workflows
10. Update Vietnamese labels for consistency (one label)

---

## Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Authentication enforced | ❌ NO | Missing - critical |
| Authorization checks | ❌ NO | Missing - critical |
| Input validation complete | ❌ PARTIAL | Missing on PUT, dates |
| SQL injection protected | ✅ YES | Prisma parameterization |
| XSS protected | ✅ YES | No HTML injection risk |
| CSRF protected | ✅ YES | POST only via forms |
| Sensitive data logged | ✅ SAFE | No passwords/tokens in logs |
| Error messages safe | ❌ PARTIAL | Leak database errors |
| Rate limiting | ❌ NO | Not implemented |
| Pagination limits | ❌ NO | DoS risk via large limit |

---

## Build & Type Check Status

```bash
# Run these before deployment:
npm run build     # Check for type errors
npm run lint      # Check style compliance
npm run typecheck # Full TypeScript validation
```

No build/type errors expected from current code (uses standard Next.js patterns).

---

## Database Schema Compliance

✅ **Revenue Model in schema.prisma** (lines 195-235):
- Proper Decimal types for money (15,2 for foreign, 15,0 for VND)
- Indexes on queryable fields (requestId, paymentDate)
- FK constraint to Request (onDelete: Cascade)
- Lock fields (isLocked, lockedAt, lockedBy) present
- Audit fields (createdAt, updatedAt) present

⚠️ **Note:** Using Decimal but converting to Number in API - consider type consistency.

---

## Unresolved Questions

1. **Is NextAuth.js v5 already configured?** If yes, what's the auth module path?
2. **Should rate limiting be implemented?** (e.g., 10 creates per minute per user)
3. **Do you want revision history for revenues?** (Similar to OperatorHistory)
4. **Exchange rate updates:** Should rates auto-update from external API or manual entry only?
5. **Audit log:** Should lock/unlock actions be tracked in a separate table?

---

## Files Requiring Changes

| File | Changes | Priority |
|------|---------|----------|
| `src/app/api/revenues/route.ts` | Add auth, validation, pagination limits | CRITICAL |
| `src/app/api/revenues/[id]/route.ts` | Add auth, request check, validation | CRITICAL |
| `src/app/api/revenues/[id]/lock/route.ts` | Add auth + ACCOUNTANT|ADMIN check | CRITICAL |
| `src/app/api/revenues/[id]/unlock/route.ts` | Add auth + ADMIN check | CRITICAL |
| `src/components/ui/currency-input.tsx` | Import config, remove duplication | HIGH |
| `src/components/revenues/revenue-form.tsx` | Import config, remove duplication, add types | HIGH |
| `src/types/index.ts` | Add ApiResponse, Revenue types | MEDIUM |
| `src/config/revenue-config.ts` | Add comments on exchange rates | LOW |

---

## Final Verdict

**Implementation Quality:** 7/10
- Clean code structure and organization
- Proper React patterns and component design
- Good error handling framework

**Production Readiness:** 3/10
- Missing critical authentication/authorization
- Incomplete input validation
- Security vulnerabilities present

**Recommendation:** **DO NOT DEPLOY** without addressing critical issues. Estimated fix time: 8-12 hours including testing.

---

**Report Generated:** 2026-01-06 10:45 UTC
**Reviewer:** Code Quality Specialist (Haiku 4.5)
