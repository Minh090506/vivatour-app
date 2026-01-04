# Debug Report: API Returning HTML Instead of JSON

**Report ID:** debugger-260104-1620-api-html-json-error
**Date:** 2026-01-04
**Severity:** HIGH
**Status:** Root Cause Identified

---

## Executive Summary

**Issue:** Frontend receiving HTML (404 pages) instead of JSON from API, causing "Unexpected token '<', <!DOCTYPE is not valid JSON" error.

**Root Cause:** Missing API route `/api/users` that is being called from requests page to fetch sellers list.

**Impact:**
- Requests page (/requests) fails to load sellers filter
- Users with ADMIN role cannot filter by seller
- Error silently caught but degrades UX

**Priority Fix:** Create missing `/api/users` route handler

---

## Technical Analysis

### 1. Missing API Route

**Location:** `src/app/(dashboard)/requests/page.tsx:104`

**Code:**
```typescript
const sellersRes = await fetch('/api/users?role=SELLER');
```

**Problem:**
- API route `/api/users` does NOT exist in codebase
- Next.js returns 404 HTML page
- Frontend tries to parse HTML as JSON → error

**Evidence:**
```bash
# Verified API routes exist:
✓ /api/requests
✓ /api/operators
✓ /api/suppliers
✓ /api/config/user/me
✗ /api/users (MISSING)
```

### 2. API Routes Inventory

**Existing routes:**
```
/api/config/follow-up/route.ts
/api/config/user/route.ts
/api/config/user/me/route.ts
/api/operators/route.ts
/api/operators/[id]/route.ts
/api/requests/route.ts
/api/requests/[id]/route.ts
/api/suppliers/route.ts
/api/suppliers/[id]/route.ts
/api/supplier-transactions/route.ts
/api/reports/supplier-balance/route.ts
/api/reports/operator-costs/route.ts
/api/reports/operator-payments/route.ts
```

**Missing route:**
```
/api/users/route.ts (DOES NOT EXIST)
```

### 3. Error Flow

1. **Page Load:** `/requests` page mounts
2. **Init Check:** `useEffect` calls `/api/config/user/me` ✓
3. **Check Permissions:** If `canViewAll === true`
4. **Fetch Sellers:** Calls `/api/users?role=SELLER` ✗
5. **Next.js Response:** Returns 404 HTML page (no route found)
6. **JSON Parse:** `await res.json()` tries to parse `<!DOCTYPE html>...`
7. **Error:** "Unexpected token '<', <!DOCTYPE is not valid JSON"
8. **Catch Block:** Error logged to console, `sellers` remains empty array

### 4. Code Context

**File:** `src/app/(dashboard)/requests/page.tsx`

```typescript
// Init: check permissions and fetch sellers
useEffect(() => {
  async function init() {
    try {
      const configRes = await fetch('/api/config/user/me');
      const configData = await configRes.json();
      if (configData.success && configData.data?.canViewAll) {
        setCanViewAll(true);
        const sellersRes = await fetch('/api/users?role=SELLER'); // ← FAILS HERE
        const sellersData = await sellersRes.json(); // ← HTML parsed as JSON
        if (sellersData.success) setSellers(sellersData.data);
      }
    } catch (err) {
      console.error('Error initializing:', err); // ← Error logged
    }
  }
  init();
}, []);
```

### 5. Database Model

**Prisma Schema:** User model exists
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      UserRole @default(SELLER)
  // ...
}

enum UserRole {
  ADMIN
  SELLER
  ACCOUNTANT
}
```

---

## Root Cause Identification

### Primary Cause
**Missing API route handler:** `/api/users/route.ts` does not exist

### Secondary Issues
None identified. Single missing route.

### Why It Happened
- Feature implemented (requests page with seller filter)
- API route creation overlooked during development
- No type checking between frontend fetch calls and API routes
- Error silently caught, no visible failure in UI

---

## Solution Development

### Immediate Fix

**Create:** `src/app/api/users/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/users
 * List users with optional role filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const where = role ? { role } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch users: ${message}` },
      { status: 500 }
    );
  }
}
```

**Location:** Create new file at `src/app/api/users/route.ts`

### Verification Steps

1. Create API route file
2. Restart dev server
3. Navigate to `/requests` page
4. Open browser DevTools → Network tab
5. Verify `/api/users?role=SELLER` returns JSON (not HTML)
6. Check Console → no JSON parse errors
7. Verify seller filter dropdown populates

### Preventive Measures

**1. API Route Validation**
- Add pre-commit hook to check fetch URLs match existing routes
- Create script to audit all fetch calls vs API routes

**2. Better Error Handling**
```typescript
const res = await fetch('/api/users?role=SELLER');
if (!res.ok) {
  throw new Error(`API error: ${res.status} ${res.statusText}`);
}
const data = await res.json();
```

**3. Type Safety**
- Use typed API client (tRPC, React Query with typed endpoints)
- Generate API types from route handlers

**4. Development Checks**
- Add ESLint rule to warn on hardcoded `/api/*` strings
- Centralize API endpoints in `src/lib/api-endpoints.ts`

---

## Supporting Evidence

### Fetch Call Locations

**All fetch calls in codebase:**
```
src/app/(dashboard)/requests/page.tsx:100    → /api/config/user/me ✓
src/app/(dashboard)/requests/page.tsx:104    → /api/users?role=SELLER ✗
src/app/(dashboard)/requests/create/page.tsx:17 → /api/config/user/me ✓
src/app/(dashboard)/requests/create/page.tsx:39 → /api/requests ✓
src/components/requests/request-services-table.tsx:99 → /api/operators ✓
src/components/requests/request-services-table.tsx:125 → /api/operators/[id] ✓
src/components/operators/operator-form.tsx:82 → /api/requests?status=F5 ✓
src/components/operators/operator-form.tsx:83 → /api/suppliers?isActive=true ✓
src/components/layout/Header.tsx:33 → /api/operators/pending-payments ✓
```

### API Routes Audit

**Status:**
- Total fetch calls: 9
- Matched routes: 8 ✓
- Missing routes: 1 ✗ (`/api/users`)

### Error Reproduction

**Steps:**
1. Open browser → http://localhost:3000/requests
2. User has ADMIN role (canViewAll = true)
3. Console shows: `Error initializing: SyntaxError: Unexpected token '<'...`
4. Network tab shows: `/api/users?role=SELLER` → 404 (HTML)

---

## Actionable Recommendations

### High Priority (Immediate)

1. **Create `/api/users/route.ts`** (see Solution section above)
   - Estimated time: 5 minutes
   - Risk: None (additive change)

2. **Test on requests page**
   - Verify seller dropdown works
   - Check no console errors

### Medium Priority (This Sprint)

3. **Improve error handling** in fetch calls
   - Check `res.ok` before parsing JSON
   - Show user-friendly error messages

4. **Create API endpoints inventory**
   - Document all routes in README
   - Keep synchronized with implementation

### Low Priority (Future)

5. **Add API route linting**
   - Validate fetch URLs at build time
   - Generate route map from file system

6. **Consider typed API client**
   - Evaluate tRPC or similar
   - Type safety between client/server

---

## Test Results

### Before Fix
```
✗ GET /api/users?role=SELLER → 404 HTML
✗ JSON parse error in console
✗ Seller filter empty
```

### After Fix (Expected)
```
✓ GET /api/users?role=SELLER → 200 JSON
✓ No console errors
✓ Seller filter populated
```

---

## Unresolved Questions

None. Root cause definitively identified.

---

## Appendix

### Related Files
- `src/app/(dashboard)/requests/page.tsx` - Caller
- `src/app/api/config/user/me/route.ts` - Similar pattern
- `prisma/schema.prisma` - User model definition

### References
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Error: "Unexpected token '<'": Indicates HTML parsed as JSON (404/500 page)
