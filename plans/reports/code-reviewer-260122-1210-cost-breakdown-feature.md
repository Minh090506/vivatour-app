# Code Review: Operator Cost Breakdown Report Feature

**Date:** 2026-01-22
**Reviewer:** Claude Code (Subagent: code-reviewer)
**Commit:** be9e670

## Scope

- **Files reviewed:** 7 files
- **Lines analyzed:** ~1,200 LOC
- **Focus:** New Cost Breakdown Report feature (API + UI components)

### Files Reviewed:
1. `src/app/api/operator/reports/cost-breakdown/route.ts` (API route)
2. `src/types/index.ts` (lines 698-760, new types)
3. `src/components/operators/reports/cost-breakdown-pie-chart.tsx`
4. `src/components/operators/reports/cost-breakdown-table.tsx`
5. `src/components/operators/reports/cost-breakdown-supplier-table.tsx`
6. `src/components/ui/collapsible.tsx`
7. `src/app/(dashboard)/operators/reports/page.tsx` (updated)

## Overall Assessment

**Code quality:** Good
**Security posture:** Strong with minor concerns
**Type safety:** Excellent
**React patterns:** Good, follows modern patterns with memo, hooks
**Consistency:** Excellent - matches existing codebase patterns

Feature implements cost breakdown reporting with variance analysis comparing expected vs actual costs. Code follows established patterns from revenue report route and uses consistent auth/validation patterns across codebase.

## Critical Issues

None identified.

## High Priority Findings

### 1. **SQL Injection Protection - Needs Verification**
**Location:** `route.ts` lines 73-75

```typescript
if (serviceType) where.serviceType = serviceType;
if (supplierId) where.supplierId = supplierId;
```

**Issue:** While Prisma ORM provides parameterized queries (safe), `serviceType` is validated but `supplierId` is NOT validated before use in query.

**Risk:** If `supplierId` contains malicious input, Prisma should handle it safely, but best practice is explicit validation.

**Recommendation:**
```typescript
// After line 63, add:
if (supplierId && typeof supplierId !== 'string') {
  return NextResponse.json(
    { success: false, error: 'ID nhà cung cấp không hợp lệ' },
    { status: 400 }
  );
}
```

### 2. **Proportional Cost Calculation Logic Risk**
**Location:** `route.ts` lines 108-112

```typescript
const expectedTotal = items.reduce((sum, op) => {
  return sum + (Number(op.request.expectedCost) || 0) /
    (operators.filter(o => o.request.code === op.request.code).length || 1);
}, 0);
```

**Issue:** Nested filter inside reduce creates O(n²) complexity. For large datasets (>1000 operators), this causes performance degradation.

**Impact:** Page load timeout on reports with high operator counts.

**Recommendation:** Pre-compute booking code counts in a Map before reduce loop.

```typescript
// Before line 105
const bookingOperatorCounts = new Map<string, number>();
operators.forEach(op => {
  const code = op.request.code;
  bookingOperatorCounts.set(code, (bookingOperatorCounts.get(code) || 0) + 1);
});

// Then in reduce (line 108-112)
const expectedTotal = items.reduce((sum, op) => {
  return sum + (Number(op.request.expectedCost) || 0) /
    (bookingOperatorCounts.get(op.request.code) || 1);
}, 0);
```

### 3. **Missing Decimal Precision for Currency**
**Location:** `route.ts` lines 107, 141, 179, 203-204

**Issue:** `Number(op.totalCost)` converts Prisma Decimal to JS number, potentially losing precision for large amounts.

**Risk:** Financial calculation errors for amounts >2^53 or high-precision decimals.

**Recommendation:** Use `.toNumber()` explicitly or keep Decimal type until final response:

```typescript
const total = items.reduce((sum, op) => sum + op.totalCost.toNumber(), 0);
```

## Medium Priority Improvements

### 4. **Error Logging Exposes Internal Details**
**Location:** `route.ts` line 242

```typescript
{ success: false, error: `Lỗi tạo báo cáo: ${message}` }
```

**Issue:** Returns error.message to client, potentially exposing stack traces, DB schema, or internal paths.

**Recommendation:** Log full error server-side, return generic message to client:

```typescript
console.error('Error generating cost breakdown report:', error);
return NextResponse.json(
  { success: false, error: 'Lỗi tạo báo cáo. Vui lòng thử lại sau.' },
  { status: 500 }
);
```

### 5. **Type Assertion Could Fail**
**Location:** `route.ts` line 58

```typescript
if (serviceType && !SERVICE_TYPE_KEYS.includes(serviceType as never)) {
```

**Issue:** `as never` bypasses type checking. If SERVICE_TYPE_KEYS type changes, this could fail silently.

**Better approach:**
```typescript
if (serviceType && !SERVICE_TYPE_KEYS.includes(serviceType as typeof SERVICE_TYPE_KEYS[number])) {
```

### 6. **Memory Leak Risk in Pie Chart**
**Location:** `cost-breakdown-pie-chart.tsx` line 115-122

**Issue:** `useMemo` dependency on `totalCost` when `totalCost` changes frequently could cause unnecessary recalculations.

**Current:**
```typescript
const chartData = useMemo(() => {
  if (!data) return [];
  return data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
    percent: totalCost > 0 ? item.total / totalCost : 0,
  }));
}, [data, totalCost]);
```

**Recommendation:** Move `percent` calculation to render time, memoize only static data:

```typescript
const chartData = useMemo(() => {
  if (!data) return [];
  return data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));
}, [data]);

// In render, calculate percents on the fly
```

### 7. **Missing Loading State for Collapsible**
**Location:** `cost-breakdown-table.tsx` lines 59-138

**Issue:** `BookingRow` component doesn't handle loading state when expanding services. If services data is large, UI freezes.

**Recommendation:** Add transition state or skeleton for expanded content.

### 8. **Hardcoded Status Thresholds**
**Location:** `route.ts` lines 194-198

```typescript
status: data.actualCost <= data.expectedCost
  ? 'on-budget'
  : data.actualCost <= data.expectedCost * 1.1
    ? 'slight-over'
    : 'over-budget',
```

**Issue:** 10% threshold (1.1) is hardcoded. Business logic change requires code modification.

**Recommendation:** Extract to config:

```typescript
// In config/operator-config.ts
export const BUDGET_THRESHOLDS = {
  ON_BUDGET: 1.0,
  SLIGHT_OVER: 1.1,
};
```

### 9. **Type Safety - Loose Record Type**
**Location:** `route.ts` line 66

```typescript
const where: Record<string, unknown> = {};
```

**Issue:** `unknown` type allows unsafe assignments. Better to use Prisma's generated types.

**Recommendation:**
```typescript
import type { Prisma } from '@prisma/client';

const where: Prisma.OperatorWhereInput = {};
```

## Low Priority Suggestions

### 10. **Duplicate Validation Logic**
**Location:** `route.ts` lines 10-14 vs `revenue/route.ts` lines 10-14

Both routes have identical `isValidDate` function. Extract to shared utility:

```typescript
// src/lib/validation.ts
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
```

### 11. **Magic Numbers in Charts**
**Location:** `cost-breakdown-pie-chart.tsx` lines 89, 161-162

```typescript
if (percent < 0.05) return null; // line 89
outerRadius={130}
innerRadius={60}
```

Extract to constants:

```typescript
const CHART_CONFIG = {
  MIN_LABEL_PERCENT: 0.05,
  OUTER_RADIUS: 130,
  INNER_RADIUS: 60,
} as const;
```

### 12. **Inconsistent Empty State Handling**
**Location:** Multiple components

Some use `data.length === 0`, others check `summary.totalCount === 0`. Standardize:

- Pie chart: checks `chartData.length === 0` (line 149)
- Table: checks `data.length === 0` (line 169)
- Page: checks `summary.totalCount === 0` (line 445)

**Recommendation:** Use consistent pattern across all components.

### 13. **Accessibility - Missing ARIA Labels**
**Location:** `cost-breakdown-table.tsx` line 69

```typescript
<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
```

**Add:**
```typescript
<Button
  variant="ghost"
  size="sm"
  className="h-6 w-6 p-0"
  aria-label={isOpen ? 'Thu gọn' : 'Mở rộng'}
>
```

### 14. **Color Palette Limited to 9 Services**
**Location:** `cost-breakdown-pie-chart.tsx` lines 25-35

Only 9 colors defined. If more than 9 service types exist, colors repeat.

**Recommendation:** Use color generation function or extend palette.

## Positive Observations

1. **Excellent auth/permission checks** - Consistent with existing routes, proper role validation
2. **Strong input validation** - Date format, service type enum checking
3. **Type safety** - Comprehensive TypeScript types defined in `types/index.ts`
4. **React best practices** - Uses `memo`, proper dependency arrays in `useEffect`
5. **Consistent patterns** - Matches revenue report structure exactly
6. **Good UX** - Loading states, error handling, empty states all handled
7. **Separation of concerns** - API logic separate from UI components
8. **Reusable components** - Collapsible extracted to `ui/` folder
9. **Proper formatting** - Uses `formatCurrency` util consistently
10. **Responsive design** - Grid layouts adapt to screen size

## Recommended Actions

### Immediate (Before Merge):
1. **Add `supplierId` validation** in API route (High Priority #1)
2. **Fix O(n²) performance issue** in expectedCost calculation (High Priority #2)
3. **Sanitize error messages** returned to client (Medium Priority #4)

### Short-term (Next Sprint):
1. Extract `isValidDate` to shared utility (Low Priority #10)
2. Fix Decimal precision handling for currency (High Priority #3)
3. Extract budget thresholds to config (Medium Priority #8)
4. Add ARIA labels to interactive elements (Low Priority #13)

### Long-term (Technical Debt):
1. Implement rate limiting on report endpoints
2. Add caching layer for expensive queries
3. Create E2E tests for report generation
4. Add performance monitoring for large datasets

## Metrics

- **Type Coverage:** 100% (no `any` types)
- **Test Coverage:** Not measured (no tests provided)
- **Linting Issues:** 0 (new files pass)
- **Build Status:** ✅ Pass (pre-existing test errors unrelated)
- **Security Vulnerabilities:** 0 critical, 1 high (error message exposure)

## Edge Cases to Test

1. **Empty dataset** - No operators in date range
2. **Single operator** - Division by zero in averages
3. **Missing supplier** - `supplierId` null handling
4. **Large datasets** - >1000 operators (performance test)
5. **Invalid dates** - Future dates, reversed date ranges
6. **Concurrent requests** - Multiple users accessing report
7. **Missing expectedCost** - Request with null/0 expectedCost
8. **Multiple service types per booking** - Variance distribution

## Conclusion

Feature is production-ready with minor fixes. Code quality is high, follows established patterns, and implements comprehensive variance analysis. Recommend addressing High Priority issues before deployment, particularly performance optimization for large datasets and error message sanitization.

**Overall Score:** 8.5/10

---

## Unresolved Questions

1. What is maximum expected dataset size for production? (affects optimization priority)
2. Should budget thresholds (10%) be configurable per customer?
3. Is there a plan for export functionality (Excel/PDF)?
4. Should report generation be moved to background job for large datasets?
