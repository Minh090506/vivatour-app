# Code Review Report: Sales Aggregation API & UI

**Review Date**: 2026-01-09
**Reviewer**: Code Reviewer Agent
**Scope**: Sales aggregation endpoint, UI components, and type definitions

---

## Scope

### Files Reviewed
1. `src/app/api/revenues/sales/route.ts` - Sales aggregation API endpoint
2. `src/components/revenues/sales-summary-table.tsx` - Sales summary table component
3. `src/types/index.ts` - New types (SaleItem, SalesSummary, SalesResponse)
4. `src/app/(dashboard)/revenues/page.tsx` - Revenue page with tabs

### Lines of Code Analyzed
~900 lines total across 4 files

### Review Focus
Security, permissions, code patterns, error handling, type safety, performance

---

## Overall Assessment

**Grade: B+ (Good with minor issues)**

Code is well-structured, follows project conventions, and implements security properly. TypeScript checking passes for new files. Minor issues with search filter logic, potential SQL injection risk, and missing input validation.

---

## Critical Issues

### 1. SQL Injection Risk via `bookingCode` Search
**File**: `src/app/api/revenues/sales/route.ts`
**Severity**: CRITICAL (Security)
**Line**: 37-38

**Issue**: Prisma filter uses `bookingCode: { not: null }` which is safe, but the `bookingCode` field from requests table could contain unsanitized input if entered through forms. While Prisma generally protects against SQL injection, the lack of input validation on search params could be exploited.

**Current Code**:
```typescript
const requestWhere: Record<string, unknown> = {
  bookingCode: { not: null },
};
```

**Risk**: If `bookingCode` comes from URL search params in future iterations and is used directly in queries without validation, this becomes exploitable.

**Recommendation**: Add explicit validation for month/year params:
```typescript
// Validate month format (YYYY-MM)
if (month && !/^\d{4}-\d{2}$/.test(month)) {
  return NextResponse.json(
    { success: false, error: 'Invalid month format (use YYYY-MM)' },
    { status: 400 }
  );
}

// Validate year format (YYYY)
if (year && !/^\d{4}$/.test(year)) {
  return NextResponse.json(
    { success: false, error: 'Invalid year format (use YYYY)' },
    { status: 400 }
  );
}
```

---

## High Priority Findings

### 2. No Input Validation for Date Parameters
**File**: `src/app/api/revenues/sales/route.ts`
**Severity**: HIGH
**Lines**: 41-63

**Issue**: Month and year parameters parsed directly without validation. Invalid formats could cause date construction errors.

**Example Attack**:
```
/api/revenues/sales?month=2025-13  // Invalid month
/api/revenues/sales?year=abcd      // Not a number
```

**Recommendation**: Add Zod schema validation or manual validation before date construction.

### 3. Unbounded Data Retrieval Risk
**File**: `src/app/api/revenues/sales/route.ts`
**Severity**: HIGH (Performance/DoS)
**Line**: 68

**Issue**: `MAX_BOOKINGS = 500` limit exists but no warning when limit is reached. Users don't know if data is incomplete.

**Current Code**:
```typescript
const MAX_BOOKINGS = 500;
// ...
take: MAX_BOOKINGS,
```

**Recommendation**: Return metadata about truncation:
```typescript
const requests = await prisma.request.findMany({
  where: requestWhere,
  take: MAX_BOOKINGS + 1, // Fetch one extra to detect truncation
  // ...
});

const isTruncated = requests.length > MAX_BOOKINGS;
const sales = requests
  .slice(0, MAX_BOOKINGS) // Take only MAX_BOOKINGS
  .filter((req) => req.bookingCode)
  // ...

return NextResponse.json({
  success: true,
  data: {
    sales,
    summary,
    isTruncated, // Inform client
    limit: MAX_BOOKINGS,
  },
});
```

### 4. Missing Permission Check on Revenue Tab
**File**: `src/app/(dashboard)/revenues/page.tsx`
**Severity**: HIGH (Security)
**Lines**: 88-107

**Issue**: Page fetches revenues with `can('revenue:view')` check on list tab, but sales aggregation tab fetches data without explicit permission verification in the frontend. While API has auth, UI should prevent unauthorized tab access.

**Current Code**:
```typescript
// Sales aggregation state
const [sales, setSales] = useState<SaleItem[]>([]);
// ...
// Fetch sales when tab changes
useEffect(() => {
  if (activeTab === 'sales') {
    fetchSales(); // No permission check here
  }
}, [activeTab, fetchSales]);
```

**Recommendation**: Add permission guard:
```typescript
// In component
if (!can('revenue:view')) {
  return <div>No permission to view revenues</div>;
}

// Or hide tab entirely
{can('revenue:view') && (
  <TabsTrigger value="sales">
    <BarChart3 className="h-4 w-4" />
    Tong hop doanh thu
  </TabsTrigger>
)}
```

---

## Medium Priority Improvements

### 5. Inconsistent Error Messages (Vietnamese Encoding)
**File**: `src/app/api/revenues/sales/route.ts`
**Severity**: MEDIUM
**Lines**: 17, 26, 140

**Issue**: Vietnamese text without proper Unicode escaping may cause display issues in some environments.

**Current**:
```typescript
{ success: false, error: 'Chua dang nhap' }
```

**Standard**: Codebase uses Vietnamese consistently, so this is acceptable. However, consider centralized i18n for future.

### 6. Type Safety Issue in Revenue Page
**File**: `src/app/(dashboard)/revenues/page.tsx`
**Severity**: MEDIUM
**Lines**: 34-59

**Issue**: Local `Revenue` interface duplicates fields from global type, causing maintenance overhead. If global type changes, local interface won't update.

**Current Code**:
```typescript
interface Revenue {
  id: string;
  requestId: string;
  paymentDate: Date | string;
  // ... 15+ fields duplicated from @/types
}
```

**Recommendation**: Import from types:
```typescript
import type { Revenue } from '@/types';
// Or extend if additional fields needed:
interface RevenueWithRelations extends Revenue {
  request?: {
    code: string;
    customerName: string;
    bookingCode?: string | null;
  };
}
```

### 7. Missing AbortController for Race Conditions
**File**: `src/app/(dashboard)/revenues/page.tsx`
**Severity**: MEDIUM
**Lines**: 159-189

**Issue**: Recent commits show `AbortController` was added to operators for race condition prevention, but revenues page doesn't implement it. If user switches tabs/months quickly, multiple API calls could complete out of order.

**Recommendation**: Follow pattern from operators:
```typescript
const fetchSales = useCallback(async () => {
  const abortController = new AbortController();
  setSalesLoading(true);

  try {
    const params = new URLSearchParams();
    if (salesMonth) params.set('month', salesMonth);

    const res = await fetch(`/api/revenues/sales?${params}`, {
      signal: abortController.signal,
    });
    // ... handle response
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return; // Request cancelled, ignore
    }
    console.error('Error fetching sales:', err);
  } finally {
    setSalesLoading(false);
  }

  return () => abortController.abort();
}, [salesMonth]);
```

### 8. Weak Type Safety in Revenue Calculation
**File**: `src/app/api/revenues/sales/route.ts`
**Severity**: MEDIUM
**Lines**: 93-101

**Issue**: Uses `Number()` coercion which could silently fail if data is corrupted. Prisma returns `Decimal` for numeric fields, not native numbers.

**Current Code**:
```typescript
const totalCost = req.operators.reduce(
  (sum, op) => sum + Number(op.totalCost),
  0
);
```

**Recommendation**: Add explicit type handling:
```typescript
const totalCost = req.operators.reduce((sum, op) => {
  const cost = typeof op.totalCost === 'object'
    ? op.totalCost.toNumber() // Prisma Decimal
    : Number(op.totalCost);
  return sum + (isNaN(cost) ? 0 : cost);
}, 0);
```

---

## Low Priority Suggestions

### 9. Component Could Be More Reusable
**File**: `src/components/revenues/sales-summary-table.tsx`
**Severity**: LOW
**Lines**: 97-115

**Issue**: `SummaryCard` component is defined inline but could be extracted to `src/components/ui/` for reuse across dashboard.

**Recommendation**: Extract to `src/components/ui/summary-card.tsx` if used elsewhere.

### 10. Missing Loading Skeleton
**File**: `src/components/revenues/sales-summary-table.tsx`
**Severity**: LOW

**Issue**: Page shows "Dang tai du lieu..." text during loading. Modern UX pattern uses skeleton loaders.

**Recommendation**: Add skeleton from shadcn/ui:
```typescript
import { Skeleton } from '@/components/ui/skeleton';

{salesLoading ? (
  <div className="space-y-4">
    <div className="grid grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
    </div>
    <Skeleton className="h-[400px]" />
  </div>
) : (
  <SalesSummaryTable sales={sales} summary={salesSummary} />
)}
```

### 11. No CSV Export for Sales Summary
**File**: `src/components/revenues/sales-summary-table.tsx`
**Severity**: LOW

**Issue**: Recent commits added CSV export to profit report (`0368112`), but sales summary lacks export functionality. Inconsistent UX.

**Recommendation**: Add export button similar to profit report:
```typescript
<Button onClick={handleExportCSV} variant="outline">
  <Download className="w-4 h-4 mr-2" />
  Xuat CSV
</Button>
```

---

## Positive Observations

### Security ✓
- Authentication properly checked with `await auth()` before data access
- Permission verification using `hasPermission(role, 'revenue:view')` follows RBAC pattern
- No direct database queries with user input (uses Prisma ORM)
- Session user ID used from authenticated session, not request body

### Code Quality ✓
- Follows project conventions (kebab-case files, PascalCase components)
- Consistent error handling with try-catch blocks
- TypeScript types properly defined in `src/types/index.ts`
- API response format matches standard `{ success, data }` pattern
- Vietnamese text encoding consistent with rest of codebase

### Architecture ✓
- Follows Next.js 15 App Router conventions
- API route in correct location (`src/app/api/revenues/sales/route.ts`)
- Component properly organized in feature folder
- Uses Prisma aggregations for efficient queries
- Implements proper separation of concerns (API, UI, types)

### Performance ✓
- Uses `select` to limit fields returned from database
- Aggregates data in single query with `include` (no N+1 problem)
- Implements MAX_BOOKINGS limit to prevent unbounded queries
- Sorts in database (`orderBy`) instead of client-side

### TypeScript ✓
- No type errors in new files (verified with `npx tsc --noEmit`)
- Proper type imports from `@/types`
- Interface definitions follow naming conventions
- Type safety maintained with discriminated union for API responses

---

## Recommended Actions

### Must Fix (Critical/High)
1. **Add input validation** for month/year parameters to prevent injection/errors
2. **Implement truncation warning** when MAX_BOOKINGS limit is reached
3. **Add AbortController** to prevent race conditions on tab/filter changes
4. **Guard sales tab** with permission check in UI layer

### Should Fix (Medium)
5. Remove duplicate `Revenue` interface, import from `@/types` instead
6. Add explicit type handling for Prisma `Decimal` fields in calculations
7. Improve error messages with context about truncation/limits

### Nice to Have (Low)
8. Extract `SummaryCard` to reusable component
9. Add loading skeleton for better UX
10. Implement CSV export for consistency with profit report

---

## Metrics

- **Type Coverage**: 100% (all new code fully typed)
- **Test Coverage**: Not measured (no tests for new files yet)
- **Linting Issues**: 0 for new files
- **Security Issues**: 1 critical (input validation), 1 high (permission check)
- **Performance Issues**: 1 high (unbounded data warning)

---

## Unresolved Questions

1. Should sales aggregation support pagination instead of hard limit?
2. Is 500 bookings the correct limit for production scale?
3. Should we implement caching for expensive aggregation queries?
4. Do we need audit logging for sales report access (compliance)?
5. Should month filter default to current month or show all-time data?
