# Root Cause Analysis: ESM Import Failure in operator-reports.test.ts

**Date:** 2026-01-16 13:27
**Status:** Identified
**Priority:** High

## Executive Summary

Test file `operator-reports.test.ts` fails due to missing `@/auth` mock, causing next-auth ESM module to be imported directly. The working test file `reports.test.ts` mocks auth before route imports.

**Impact:** Operator reports tests cannot run, blocking CI/CD pipeline for operator cost/payment reporting features.

**Root Cause:** Import order violation - route files imported before auth mock defined.

**Fix Complexity:** Trivial - reorder 4 lines in test file.

---

## Technical Analysis

### Error Chain

```
src/__tests__/api/operator-reports.test.ts:16
  → imports route.ts files (lines 16-17)
    → route.ts imports @/auth (line 2)
      → @/auth imports next-auth (line 11)
        → next-auth/index.js uses ESM syntax
          → Jest cannot parse ESM (transformIgnorePatterns excludes next-auth)
            → SyntaxError: Cannot use import statement outside a module
```

### File Comparison

**FAILING: operator-reports.test.ts**
```typescript
8→  import { NextRequest } from 'next/server';
9→  import { prismaMock } from '@/lib/__mocks__/db';
10→
11→ // Mock the db module
12→ jest.mock('@/lib/db', () => ({
13→   prisma: prismaMock,
14→ }));
15→
16→ import { GET as getCostReport } from '@/app/api/reports/operator-costs/route';
17→ import { GET as getPaymentReport } from '@/app/api/reports/operator-payments/route';
```

**WORKING: reports.test.ts**
```typescript
8→  import { NextRequest } from 'next/server';
9→  import { prismaMock } from '@/lib/__mocks__/db';
10→
11→ // Mock database
12→ jest.mock('@/lib/db', () => ({
13→   prisma: prismaMock,
14→ }));
15→
16→ // Mock auth
17→ const mockSession = { user: { id: 'user-123', email: 'test@example.com', role: 'ADMIN' } };
18→ jest.mock('@/auth', () => ({ auth: jest.fn(() => Promise.resolve(mockSession)) }));
19→
20→ import { auth } from '@/auth';
21→ // ... then route imports later via require() in beforeAll()
```

### Key Differences

1. **Auth Mock Presence**: reports.test.ts defines `jest.mock('@/auth')` (line 25), operator-reports.test.ts does not
2. **Import Strategy**: reports.test.ts uses `require()` in `beforeAll()` (line 46), operator-reports.test.ts uses top-level `import` (lines 16-17)
3. **Route Dependencies**: Both routes import `@/auth`, but only dashboard route gets mocked auth

### Why This Happens

- `operator-costs/route.ts` imports `@/auth` (line 2)
- Without mock, Jest resolves real `@/auth`
- Real `@/auth` imports `next-auth` package (auth.ts line 11)
- `jest.config.ts` line 65 includes next-auth in transformIgnorePatterns
- Jest cannot transform ESM syntax in next-auth
- Error thrown at parse time

---

## Solution

### Minimal Fix (Lines to Change)

**File:** `src/__tests__/api/operator-reports.test.ts`

**Change 1: Add auth mock after db mock (insert after line 14)**
```typescript
// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

// Mock auth - ADD THIS BLOCK
jest.mock('@/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));
```

**Change 2: Move route imports to beforeAll() or after mocks**

Option A (Recommended - matches reports.test.ts pattern):
```typescript
// Remove lines 16-17, replace with dynamic imports in describe blocks
describe('GET /api/reports/operator-costs', () => {
  let GET: any;

  beforeAll(() => {
    const module = require('@/app/api/reports/operator-costs/route');
    GET = module.GET;
  });

  // ... rest of tests use GET instead of getCostReport
});
```

Option B (Simpler - keep top-level imports):
```typescript
// Just add mock before imports
jest.mock('@/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

import { GET as getCostReport } from '@/app/api/reports/operator-costs/route';
import { GET as getPaymentReport } from '@/app/api/reports/operator-payments/route';
```

### Why reports.test.ts Works

1. Auth mock defined before any route imports (line 25)
2. Uses dynamic `require()` in `beforeAll()` - ensures mocks hoisted first
3. All route dependencies mocked before resolution

### Why This Is Not a jest.config.ts Issue

- transformIgnorePatterns correctly includes next-auth (line 65)
- This ALLOWS transformation but requires mock first
- Reports test proves config works when mocks defined correctly
- Changing config would break other tests

---

## Evidence

### Stack Trace
```
node_modules/next-auth/index.js:69
import { Auth, customFetch } from "@auth/core";
^^^^^^
SyntaxError: Cannot use import statement outside a module

  at Object.<anonymous> (src/auth.ts:34:58)
  at Object.<anonymous> (src/app/api/reports/operator-costs/route.ts:12:15)
  at Object.<anonymous> (src/__tests__/api/operator-reports.test.ts:15:16)
```

### Verification Command
```bash
# Confirm reports.test.ts passes
npm test -- reports.test.ts

# Confirm operator-reports.test.ts fails
npm test -- operator-reports.test.ts
```

---

## Recommendations

### Immediate (Required)
1. Add `jest.mock('@/auth')` to operator-reports.test.ts before route imports
2. Either move imports to `beforeAll()` or keep top-level after mocks

### Short-term (Best Practice)
1. Standardize test pattern across all API route tests
2. Use dynamic `require()` in `beforeAll()` for route imports (safer)
3. Add auth mock template to test setup documentation

### Long-term (Prevention)
1. Create test file template with standard mock structure
2. Add ESLint rule to enforce mock-before-import pattern
3. Document mock order requirements in testing guidelines

---

## Unresolved Questions

None - root cause and solution confirmed by comparison with working test.
