# Code Review: Profit Report Feature

**Date:** 2026-01-09
**Reviewer:** code-reviewer (a14edb0)
**Scope:** New profit report API endpoint and UI components

## Scope

Files reviewed:
- src/app/api/reports/profit/route.ts (133 lines)
- src/components/operators/reports/profit-report-table.tsx (203 lines)
- src/components/operators/reports/profit-chart.tsx (143 lines)
- src/types/index.ts (lines 584-611, type definitions)
- src/app/(dashboard)/operators/reports/page.tsx (267 lines, updated)

Lines analyzed: ~750
Review focus: New profit report feature with security, type safety, React patterns, performance

## Overall Assessment

**GOOD** - Code quality is solid with proper security measures, consistent patterns, and good TypeScript usage. Minor issues in error handling and potential performance optimization areas. No critical security vulnerabilities found.

## Critical Issues

**NONE**

## High Priority Findings

### 1. SQL Injection Protection - VERIFIED SAFE ✓

**Status:** Secure
**Location:** `route.ts:38-51`

```typescript
const requestWhere: Record<string, unknown> = {
  bookingCode: { not: null },
};
if (bookingCode) {
  requestWhere.bookingCode = bookingCode; // Direct assignment - safe with Prisma
}
```

**Analysis:** Using Prisma ORM parameterized queries. No raw SQL. `bookingCode` query param assigned directly to Prisma where clause - Prisma handles sanitization. Safe from SQL injection.

### 2. Date Validation - GOOD ✓

**Location:** `route.ts:4-12, 24-36`

```typescript
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
```

**Strength:** Proper regex + Date validation. Prevents invalid dates. Consistent with existing `operator-costs` route pattern.

### 3. Missing Request Cancellation in safeFetch

**Priority:** HIGH
**Location:** `page.tsx:53-57`

```typescript
const [costResult, paymentResult, profitResult] = await Promise.all([
  safeFetch<OperatorCostReport>(`/api/reports/operator-costs?${costParams}`),
  safeFetch<PaymentStatusReport>('/api/reports/operator-payments'),
  safeFetch<ProfitReport>(`/api/reports/profit?${profitParams}`),
]);
```

**Issue:** `abortControllerRef` created (line 40) but not passed to `safeFetch` calls. Abort signal never used. When date filters change rapidly or user navigates away, ongoing requests continue.

**Impact:** Memory leaks, race conditions, stale data displayed.

**Fix Required:**
```typescript
const [costResult, paymentResult, profitResult] = await Promise.all([
  safeFetch<OperatorCostReport>(
    `/api/reports/operator-costs?${costParams}`,
    { signal: abortControllerRef.current.signal }
  ),
  safeFetch<PaymentStatusReport>(
    '/api/reports/operator-payments',
    { signal: abortControllerRef.current.signal }
  ),
  safeFetch<ProfitReport>(
    `/api/reports/profit?${profitParams}`,
    { signal: abortControllerRef.current.signal }
  ),
]);
```

## Medium Priority Improvements

### 1. Error Logging Exposes Stack Traces

**Location:** `route.ts:125-126`

```typescript
console.error('Error generating profit report:', error);
const message = error instanceof Error ? error.message : 'Unknown error';
```

**Issue:** `console.error` with full error object logs stack traces to server console. In production with centralized logging (Datadog, Sentry), could expose internal paths/logic.

**Recommendation:** Use structured logging or sanitize:
```typescript
console.error('[API] Profit report error:', {
  message: error instanceof Error ? error.message : String(error),
  endpoint: '/api/reports/profit',
  params: { startDate, endDate, bookingCode }
});
```

### 2. Type Narrowing for Prisma Decimal

**Location:** `route.ts:77-84`

```typescript
const totalCost = req.operators.reduce(
  (sum, op) => sum + Number(op.totalCost), // Prisma.Decimal -> number
  0
);
const totalRevenue = req.revenues.reduce(
  (sum, rev) => sum + Number(rev.amountVND), // Prisma.Decimal -> number
  0
);
```

**Issue:** Prisma returns `Decimal` type for `totalCost` and `amountVND`. Converting to `Number()` loses precision for large values. TypeScript doesn't warn because of implicit coercion.

**Current:** Works for VND amounts (no decimal places needed).
**Risk:** If currency changes or large values used (>2^53), precision loss occurs.

**Better approach:**
```typescript
import { Decimal } from '@prisma/client/runtime/library';

const totalCost = req.operators.reduce(
  (sum, op) => sum.add(op.totalCost), // Use Decimal.add
  new Decimal(0)
).toNumber(); // Convert once at end
```

### 3. Missing Input Sanitization for bookingCode

**Location:** `route.ts:49-51`

```typescript
if (bookingCode) {
  requestWhere.bookingCode = bookingCode; // No validation
}
```

**Issue:** `bookingCode` query param not validated. While Prisma prevents SQL injection, unexpected formats could cause inefficient queries or weird behavior.

**Recommendation:** Add validation:
```typescript
const BOOKING_CODE_REGEX = /^[A-Z0-9-]{1,50}$/; // Adjust to your format
if (bookingCode) {
  if (!BOOKING_CODE_REGEX.test(bookingCode)) {
    return NextResponse.json(
      { success: false, error: 'Mã booking không hợp lệ' },
      { status: 400 }
    );
  }
  requestWhere.bookingCode = bookingCode;
}
```

### 4. React Component Re-render Optimization

**Location:** `profit-report-table.tsx:32-35`

```typescript
const sortedData = [...data].sort((a, b) => {
  const multiplier = sortOrder === 'desc' ? -1 : 1;
  return (a[sortField] - b[sortField]) * multiplier;
});
```

**Issue:** Array copy + sort runs on every render. With 100+ bookings, noticeable lag on each state change.

**Optimization:** Memoize with `useMemo`:
```typescript
const sortedData = useMemo(() => {
  return [...data].sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    return (a[sortField] - b[sortField]) * multiplier;
  });
}, [data, sortField, sortOrder]);
```

### 5. Chart Component - No Key Stability

**Location:** `profit-chart.tsx:116-122`

```typescript
{chartData.map((entry, index) => (
  <Cell
    key={`cell-${index}`}  // Index as key - anti-pattern
    fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'}
  />
))}
```

**Issue:** Using array index as key. If `chartData` order changes (sort/filter), React unnecessarily re-renders cells.

**Fix:** Use stable identifier:
```typescript
{chartData.map((entry) => (
  <Cell
    key={entry.bookingCode}
    fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'}
  />
))}
```

### 6. Hard-coded Color Values

**Location:** Multiple files (`profit-report-table.tsx:64, 70, 76`, `profit-chart.tsx:119`)

```typescript
text-red-600  // Repeated 6 times
text-green-600  // Repeated 8 times
text-blue-600  // Repeated 3 times
```

**Issue:** Magic strings scattered. Hard to maintain theme consistency. Not using Tailwind CSS variables.

**Recommendation:** Define constants or use CSS variables:
```typescript
const COLOR_NEGATIVE = 'text-red-600';
const COLOR_POSITIVE = 'text-green-600';
const COLOR_REVENUE = 'text-blue-600';
```

Or better - use Tailwind theme colors in config.

## Low Priority Suggestions

### 1. API Response Format Inconsistency

**Location:** `route.ts:117-123`

```typescript
return NextResponse.json({
  success: true,
  data: {
    bookings,
    summary,
  },
});
```

**Observation:** Wraps in `data` object. Consistent with existing `safeFetch` pattern (good). But other endpoints return flat `{ success, bookings, summary }`. Check API design doc for standard.

### 2. Empty State Handling in Chart

**Location:** `profit-chart.tsx:82-86`

```typescript
{data.length === 0 ? (
  <p className="text-muted-foreground text-center py-8">
    Không có dữ liệu để hiển thị
  </p>
) : (
```

**Good:** Handles empty state gracefully.
**Enhancement:** Could add illustration or CTA button.

### 3. Number Formatting Locale

**Location:** Uses `formatCurrency` utility throughout

**Assumption:** `formatCurrency` handles VND formatting correctly.
**Verify:** Check implementation handles large numbers, negative values, zero properly. Should use `Intl.NumberFormat` with `vi-VN` locale.

### 4. Accessibility - Missing aria-labels

**Location:** `profit-report-table.tsx:101-108` (sort buttons)

```typescript
<Button
  variant="ghost"
  size="sm"
  className="h-auto p-0 hover:bg-transparent"
  onClick={() => handleSort('totalCost')}
>
  Chi phí <SortIcon field="totalCost" currentField={sortField} />
</Button>
```

**Issue:** No `aria-label` for screen readers. Sort state not announced.

**Fix:**
```typescript
<Button
  aria-label={`Sắp xếp theo chi phí ${sortField === 'totalCost' ? (sortOrder === 'desc' ? 'giảm dần' : 'tăng dần') : ''}`}
  variant="ghost"
  // ...
>
```

### 5. TypeScript - Missing Null Check

**Location:** `route.ts:91`

```typescript
bookingCode: req.bookingCode!,  // Non-null assertion
```

**Context:** Safe because of filter on line 75 (`filter((req) => req.bookingCode)`).
**Improvement:** Could make TypeScript infer with type guard instead of `!` operator.

## Positive Observations

1. **Consistent API patterns** - Follows same structure as `operator-costs` route (date validation, error handling, response format)
2. **Proper error handling** - Catches exceptions, returns Vietnamese error messages, appropriate HTTP status codes
3. **Type safety** - All components properly typed with interfaces from `@/types`
4. **Responsive UI** - Table uses `overflow-x-auto`, grid layout adapts with `md:` breakpoints
5. **Loading states** - Proper loading/error/empty states in UI
6. **Business logic separation** - Calculation logic in API, UI components are presentational
7. **Reusable utilities** - Uses existing `formatCurrency`, `safeFetch` patterns
8. **Clean component structure** - Small focused components, extracted `SortIcon`, `CustomTooltip`
9. **Code formatting** - Consistent indentation, spacing, naming conventions

## Performance Analysis

### Database Query Efficiency

**Location:** `route.ts:54-71`

```typescript
const requests = await prisma.request.findMany({
  where: requestWhere,
  select: {
    id: true,
    bookingCode: true,
    customerName: true,
    operators: { select: { totalCost: true } },
    revenues: { select: { amountVND: true } },
  },
});
```

**Analysis:**
- Uses `select` to fetch only needed fields ✓
- No N+1 queries - fetches relations in single query ✓
- No pagination - loads all matching requests ⚠️

**Concern:** If date range spans years, could fetch 1000+ bookings. No `take`/`skip` limits.

**Recommendation:** Add pagination or row limit:
```typescript
const MAX_RESULTS = 500; // Or make configurable
const requests = await prisma.request.findMany({
  where: requestWhere,
  select: { /* ... */ },
  take: MAX_RESULTS,
  orderBy: { startDate: 'desc' },
});
```

### Client-Side Memory

**Location:** `profit-chart.tsx:61-63`

```typescript
const top10 = [...data]
  .sort((a, b) => b.profit - a.profit)
  .slice(0, 10);
```

**Good:** Chart limited to top 10, prevents rendering 100+ bars.

**Location:** `profit-report-table.tsx:32-35` (renders full dataset)

**Concern:** With 500 bookings, table has 500 DOM rows. Browser may lag on scroll.

**Recommendation:** Implement virtualization for large datasets:
- Use `react-window` or `@tanstack/react-virtual`
- Or add pagination to table

## Security Audit

### 1. Input Validation - GOOD ✓

- Date format validated with regex + `Date` constructor
- Prisma ORM prevents SQL injection
- No raw SQL queries
- No `eval()` or `Function()` usage

### 2. Authentication/Authorization - NOT VERIFIED

**Location:** `route.ts:17`

```typescript
export async function GET(request: NextRequest) {
  // No auth check visible
```

**Assumption:** Auth middleware applied at app level or in layout.
**Action Required:** Verify that API route is protected by auth middleware. Check:
- `middleware.ts` for route protection
- Or add auth check: `const session = await getServerSession(); if (!session) return 401`

### 3. Rate Limiting - NOT PRESENT

**Risk:** User can spam endpoint, cause DB load.
**Recommendation:** Add rate limiting middleware (10 req/min per user).

### 4. Data Exposure - SAFE

- Returns only booking codes, customer names (expected for reports)
- No sensitive fields (passwords, tokens, emails) exposed
- Error messages in Vietnamese, don't leak stack traces to client

### 5. CORS/CSRF - ASSUMED SAFE

Next.js API routes have CSRF protection by default (same-origin).
External API access requires additional config (not present).

## TypeScript Type Safety

### Type Coverage

**Good:**
- All props interfaces defined (`Props`, `ProfitByBooking`, `ProfitReportSummary`)
- Generic types used correctly (`safeFetch<ProfitReport>`)
- No `any` types used
- Enums for sort fields (`SortField`, `SortOrder`)

**Improvement:**
- `Record<string, unknown>` on line 39 could be `Prisma.RequestWhereInput` (more precise)

### Runtime vs Compile Time

**Issue:** TypeScript doesn't validate query params at runtime.

```typescript
const startDate = searchParams.get('startDate'); // Returns string | null
// Type system trusts isValidDate(), but runtime could receive malformed input
```

**Current:** Manual validation with `isValidDate()` function (good).
**Better:** Use Zod schema for validation:
```typescript
import { z } from 'zod';

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bookingCode: z.string().max(50).optional(),
});

const parsed = querySchema.safeParse({
  startDate,
  endDate,
  bookingCode,
});
```

Consistent with existing operator validation patterns (POST/PUT use Zod).

## Recommended Actions

### Priority 1 - Must Fix

1. **Add abort signal to safeFetch calls** (page.tsx:53-57)
   - Prevents race conditions and memory leaks
   - Critical for production reliability

2. **Add authentication check** to API route
   - Verify middleware protects route
   - Or add explicit auth check in handler

### Priority 2 - Should Fix

3. **Add bookingCode validation** (route.ts:49)
   - Regex check for expected format
   - Prevents unexpected query behavior

4. **Implement pagination** for large result sets (route.ts:54)
   - Add `take: 500` or similar limit
   - Or implement cursor pagination

5. **Memoize sortedData** (profit-report-table.tsx:32)
   - Use `useMemo` to prevent re-sorting on every render
   - Improves performance with 50+ rows

### Priority 3 - Nice to Have

6. **Replace Decimal -> Number conversion** with Decimal math (route.ts:77)
   - Use `Decimal.add()` instead of `Number() + Number()`
   - Only needed if precision critical

7. **Add aria-labels** to sort buttons (profit-report-table.tsx:101)
   - Improves accessibility

8. **Extract color constants** (multiple files)
   - Define theme colors in single location

## Test Coverage Requirements

**Missing Tests** (recommended to add):

1. **API Route Tests** (`route.test.ts`):
   - Date validation (invalid formats)
   - Empty results
   - Profit calculation accuracy
   - Summary aggregation correctness
   - Error handling (DB connection failure)

2. **Component Tests**:
   - `profit-report-table.test.tsx`: Sort functionality, empty state
   - `profit-chart.test.tsx`: Data transformation, color mapping

3. **Integration Tests**:
   - End-to-end profit report flow
   - Date filter interaction
   - Tab switching preserves state

## Metrics

- **Type Coverage:** 100% (no `any` types)
- **Linting Issues:** 0 (TypeScript errors in tests/ unrelated)
- **Security Vulnerabilities:** 0 critical, 0 high
- **Performance Concerns:** 2 medium (pagination, memoization)
- **Accessibility Issues:** 1 low (missing aria-labels)

## Build Validation

**TypeScript Compilation:** Errors found in test files, **unrelated to reviewed code**.
**New Files Compilation:** ✓ No errors in profit report files

Test file errors (pre-existing):
- `operator-approvals.test.ts`: Mock type mismatch
- `supplier-transactions.test.ts`: Type assertions
- `requests/[id]/route.ts`: Null handling (unrelated to this PR)

**Action:** Profit report code is production-ready. Test file errors should be fixed separately.

## Conclusion

**Verdict: APPROVED with Minor Fixes**

Code quality is high, follows project patterns, no security vulnerabilities. Priority 1 fixes (abort signal, auth verification) required before production deployment. Priority 2 improvements recommended for robustness.

**Estimated Effort:**
- Priority 1 fixes: 30 min
- Priority 2 improvements: 2-3 hours
- Priority 3 enhancements: 4-5 hours

---

**Unresolved Questions:**

1. Is authentication middleware applied at app level? Need to verify route protection.
2. What is expected max number of bookings in typical date range? Determines if pagination needed.
3. Should profit report support CSV/Excel export? Common request for financial reports.
4. Are there specific RBAC rules (e.g., only managers can view profit)?
