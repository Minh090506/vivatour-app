# Data Fetching Patterns Research

## Executive Summary

Next.js codebase uses **client-side data fetching** with `useState` + `useEffect` + `useCallback`. Two fetch utility wrappers exist (`safeFetch`, `safePost`) for error handling. Permission checks via `usePermission` hook. No React Query/SWR detected.

---

## 1. Custom Hooks

### usePermission Hook
**Location:** `src/hooks/use-permission.ts`

- **Purpose:** Client-side permission checking using NextAuth session
- **Returns:** `{ can(), canAll(), canAny(), role, userId, isLoading, isAuthenticated, isAdmin, isAccountant, isSeller, isOperator }`
- **Pattern:** Wraps `nextauth.useSession()` + `hasPermission()` utility
- **Usage:** Conditional UI rendering (`if (can('revenue:manage'))`)

### Index Export
**Location:** `src/hooks/index.ts` (exists but contents not shown)

---

## 2. Fetch Patterns in Dashboard Pages

### Pattern A: URLSearchParams + fetch + useState
**Examples:** `revenues/page.tsx`, `operators/page.tsx`

```typescript
// useCallback with dependency array
const fetchRevenues = useCallback(async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    // ... more filters
    const res = await fetch(`/api/revenues?${params}`);
    const data = await res.json();
    if (data.success) {
      setRevenues(data.data || []);
      setTotal(data.total || 0);
    }
  } catch (err) {
    console.error('Error fetching revenues:', err);
  } finally {
    setLoading(false);
  }
}, [filters]);
```

**Key Points:**
- Manual `URLSearchParams` construction
- Try-catch with console.error (no toast errors in revenues)
- Loading state management
- Dependencies: `[filters]` triggers refetch

### Pattern B: Abort Controller (Race Condition Prevention)
**Example:** `operators/page.tsx`

```typescript
const abortRef = useRef<AbortController | null>(null);

const fetchOperators = useCallback(async (signal?: AbortSignal) => {
  setLoading(true);
  setError(null);

  const { data, error: fetchError } = await safeFetch<OperatorListResponse>(
    `/api/operators?${params}`,
    { signal }
  );

  if (signal?.aborted) return; // Ignore if aborted

  if (fetchError) {
    setError(fetchError);
  } else if (data) {
    setOperators(data.data || []);
    setTotal(data.total || 0);
  }
  setLoading(false);
}, [filters]);

// Abort previous requests
useEffect(() => {
  abortRef.current?.abort();
  abortRef.current = new AbortController();
  fetchOperators(abortRef.current.signal);

  return () => {
    abortRef.current?.abort();
  };
}, [fetchOperators]);
```

**Key Points:**
- Uses `safeFetch` wrapper for type-safe responses
- AbortController in ref to cancel stale requests
- Returns error/data tuple
- Prevents race conditions on rapid filter changes

### Pattern C: Debounced Search
**Example:** `revenues/page.tsx`

```typescript
// Debounce search input
useEffect(() => {
  const timer = setTimeout(() => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
  }, 300);
  return () => clearTimeout(timer);
}, [searchInput]);

// Trigger fetch on filter change
useEffect(() => {
  fetchRevenues();
}, [fetchRevenues]); // fetchRevenues deps on filters
```

**Key Points:**
- 300ms debounce on search input
- Separate state for input vs active filter
- Two-effect chain: input → debounce → filter → fetch

---

## 3. Loading & Error States

### Loading States
- **Basic:** `if (loading) { <div>Dang tai du lieu...</div> }`
- **Consistent:** Text "Dang tai..." or "Đang tải..." (Vietnamese)
- **Component-level:** No global loading indicator
- **Tab-specific:** Sales tab has separate `salesLoading` state

### Error Handling

**Type 1: Silent with Retry (Revenues)**
```typescript
catch (err) {
  console.error('Error fetching revenues:', err);
}
```
- No user notification
- Generic loading fallback

**Type 2: Explicit Error State (Operators)**
```typescript
if (error) {
  <ErrorFallback
    title="Lỗi tải danh sách"
    message={error}
    onRetry={() => fetchOperators()}
    retryLabel="Tải lại"
  />
}
```
- Uses `ErrorFallback` component
- Retry button available
- Error stored in state

**Type 3: Toast Notifications (Auto-Archive)**
```typescript
if (error) {
  toast.error(error);
} else if (data) {
  toast.success(data.message);
  fetchOperators();
}
```
- Uses `sonner` toast library
- Success + refetch on mutation

---

## 4. Fetch Utilities (Wrapper Layer)

### safeFetch & safePost
**Location:** `@/lib/api/fetch-utils` (imported but not analyzed)

**Inferred API:**
```typescript
const { data, error } = await safeFetch<T>(url, { signal });
const { data, error } = await safePost<T>(url, payload);
```

**Benefits:**
- Type-safe responses
- Error tuple pattern (error-first callback style)
- AbortSignal support

---

## 5. API Response Format

**Standard Success Response:**
```typescript
{
  success: true,
  data: [...],
  total: number
}
```

**Standard Mutation Response:**
```typescript
{
  success: true,
  data: { archivedCount: number, message: string },
  message?: string
}
```

---

## 6. State Management Summary

| Aspect | Pattern | Library |
|--------|---------|---------|
| Auth/Permissions | useSession() | NextAuth.js v5 |
| Component State | useState | React 19 |
| Side Effects | useEffect | React 19 |
| Callbacks | useCallback | React 19 |
| Refs (AbortController) | useRef | React 19 |
| Toasts | sonner | Sonner |
| No global state detected | - | - |

---

## Key Observations

1. **No React Query/SWR** - Manual fetch management throughout
2. **Consistent Error Handling Gap** - Revenues lacks error UI, operators handles it well
3. **Race Condition Prevention** - Only operators page implements AbortController
4. **Permission-Driven UI** - All tables respect `can()` checks
5. **Debouncing Inconsistency** - Only search input debounced; filter changes fetch immediately
6. **Dialog Pattern** - Add/Edit with callback refetch on success
7. **Multi-tab Fetching** - Sales tab only fetches when tab activated

---

## Recommendations (For Implementation)

1. Apply AbortController pattern to all fetch pages (especially revenues)
2. Standardize error handling: use ErrorFallback for all list pages
3. Extract fetch logic to custom hook: `useFetchWithFilters(url, filters)`
4. Add retry logic with exponential backoff to mutations
5. Consider React Query for Phase 08+ if data complexity increases

---

**Report Generated:** 2026-01-09
**Codebase:** MyVivaTour Next.js 16 + Prisma 7
