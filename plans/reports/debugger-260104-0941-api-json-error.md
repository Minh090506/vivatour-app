# Investigation Report: "Unexpected token '<', is not valid JSON"

**Date:** 2026-01-04
**Investigator:** Debugger Agent
**Severity:** HIGH - Blocking operator module functionality

---

## Executive Summary

**Root Cause:** Missing `/api/requests` API route implementation causing Next.js to return HTML 404 error page instead of JSON response.

**Impact:** Operator form (`OperatorForm` component) fails to load F5 requests dropdown, preventing users from creating/editing operator entries.

**Immediate Fix Required:** Implement missing `/api/requests/route.ts` endpoint.

---

## Root Cause Analysis

### 1. Missing API Endpoint

**Location:** `src/app/api/requests/`

**Finding:** Directory exists but contains NO route handlers (route.ts file missing)

```bash
$ ls -la src/app/api/requests
total 4
drwxr-xr-x 1 Admin 197121 0 Jan  2 18:14 .
drwxr-xr-x 1 Admin 197121 0 Jan  3 21:57 ..
# NO FILES - Empty directory
```

### 2. Client-Side Fetch Call

**File:** `src/components/operators/operator-form.tsx`
**Line:** 82

```typescript
const [reqRes, supRes] = await Promise.all([
  fetch('/api/requests?status=F5&limit=100'),  // ❌ This endpoint does NOT exist
  fetch('/api/suppliers?isActive=true'),        // ✅ This works fine
]);
```

**Behavior:**
- When fetching `/api/requests?status=F5&limit=100`
- Next.js returns HTML 404 error page (not JSON)
- JavaScript tries to parse HTML as JSON → **Error: "Unexpected token '<', is not valid JSON"**

### 3. Evidence Trail

**Files calling missing endpoint:**
1. `src/components/operators/operator-form.tsx:82` - ✅ **CONFIRMED**
2. `docs/system-architecture.md:28` - Documentation reference only
3. `SETUP_GUIDE.md:86` - Documentation reference only

**Database schema verification:**
- `Request` model exists in `prisma/schema.prisma` (lines 44-89) ✅
- Model fields match expected structure (code, customerName, status, etc.) ✅
- No API implementation ❌

---

## Technical Analysis

### Request Model Schema

```prisma
model Request {
  id              String    @id @default(cuid())
  code            String    @unique  // Booking Code: 240101-JOHN-US
  customerName    String
  contact         String
  status          String    @default("F2")  // F1, F2, F3, F4, F5
  sellerId        String
  seller          User      @relation(fields: [sellerId], references: [id])
  // ... other fields
}
```

### Expected API Behavior

Based on operator-form.tsx requirements:

```typescript
// Expected response structure
GET /api/requests?status=F5&limit=100
→ { success: true, data: Request[] }

interface Request {
  id: string;
  code: string;
  customerName: string;
  status: string;
}
```

### Current Behavior (Error Scenario)

```
1. Client: fetch('/api/requests?status=F5&limit=100')
2. Next.js: No route handler found → Return 404 HTML page
3. Client: await res.json() → Try to parse HTML
4. Error: Unexpected token '<' (HTML tag in 404 page)
```

---

## Impact Assessment

### Affected Features

1. **Operator Form** (`src/components/operators/operator-form.tsx`)
   - Cannot load F5 booking list for dropdown
   - Form initialization fails
   - Users cannot create/edit operators

2. **Operator Module Pages**
   - `/operators/create` - Broken ❌
   - `/operators/[id]/edit` - Broken ❌

### Data Impact

- No database corruption
- No data loss
- Blocking UX only

### User Experience

- Form shows "Không có Booking F5" (No F5 bookings) even if data exists
- Cannot create operator entries
- Console errors visible in browser DevTools

---

## Recommended Fixes

### Priority 1: Implement Missing API Route

**File to create:** `src/app/api/requests/route.ts`

**Required exports:**
```typescript
// GET /api/requests - List requests with filters
export async function GET(request: NextRequest) {
  // Filter by status, limit, search params
  // Return: { success: true, data: Request[] }
}

// POST /api/requests - Create request
export async function POST(request: NextRequest) {
  // Create new request
  // Return: { success: true, data: Request }
}
```

**Reference implementation:** Follow patterns from:
- `src/app/api/suppliers/route.ts` (filtering, pagination)
- `src/app/api/operators/route.ts` (status filtering)

### Priority 2: Implement Detail Route (Optional)

**File to create:** `src/app/api/requests/[id]/route.ts`

**Required exports:**
```typescript
export async function GET(request, { params }) // Get by ID
export async function PUT(request, { params }) // Update
export async function DELETE(request, { params }) // Delete
```

### Priority 3: Add Error Handling

**File:** `src/components/operators/operator-form.tsx`
**Lines:** 81-98

Add try-catch with better error messaging:

```typescript
try {
  const [reqRes, supRes] = await Promise.all([...]);

  if (!reqRes.ok) {
    console.error('Failed to fetch requests:', reqRes.status, await reqRes.text());
    // Show user-friendly error
  }

  const [reqData, supData] = await Promise.all([
    reqRes.json(),
    supRes.json(),
  ]);
  // ...
} catch (err) {
  console.error('Error fetching data:', err);
  // Show fallback UI
}
```

---

## Supporting Evidence

### Git History Context

Recent commits show operator module development but no request API:
```
e5b6a3a feat(operators): implement phase 4 reports
dd74eeb feat(operators): implement accounting period lock
099851f feat(operators): implement complete operator CRUD
```

**Missing:** Request API implementation

### Documentation References

1. **README.md** - Lists `/api/requests` as planned endpoint (line 163)
2. **system-architecture.md** - References requests API as part of architecture (line 28)
3. **SETUP_GUIDE.md** - Mentions `src/app/api/requests/route.ts` should exist (line 86)

**Conclusion:** Documentation assumes API exists, but implementation was skipped.

---

## Prevention Measures

### 1. API Route Verification Script

Create validation script to check documented endpoints exist:

```bash
# scripts/verify-api-routes.sh
#!/bin/bash
# Check all documented API routes have implementations
```

### 2. TypeScript API Client

Create typed API client to catch missing endpoints at compile time:

```typescript
// src/lib/api-client.ts
export const api = {
  requests: {
    list: (filters) => fetch('/api/requests?...')
  }
}
```

### 3. Integration Tests

Add tests for critical API flows:
```typescript
describe('Operator Form Data Loading', () => {
  it('should load F5 requests and suppliers', async () => {
    const res = await fetch('/api/requests?status=F5');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
```

---

## Unresolved Questions

1. **User Model:** Request schema references `User.sellerId` - Is User table seeded with data?
2. **Authentication:** API routes have no auth checks - Is this intentional for MVP?
3. **Request Creation:** Where/how are requests currently created if API doesn't exist?
4. **Test Data:** Does database have F5 requests to test dropdown functionality?

---

## Next Steps

1. ✅ **IMMEDIATE:** Implement `src/app/api/requests/route.ts` with GET endpoint
2. ⚠️ **HIGH:** Implement `src/app/api/requests/[id]/route.ts` for CRUD operations
3. 📝 **MEDIUM:** Add error handling to operator-form.tsx
4. 🧪 **LOW:** Add integration tests for request APIs
5. 📋 **LOW:** Update documentation with implementation status

---

**Report Status:** Complete
**Recommended Action:** Implement missing API route immediately to unblock operator module
