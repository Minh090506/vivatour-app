# Code Review: Revenue Module Integration Phase 01

**Date:** 2026-01-06
**Reviewer:** Code Reviewer Agent
**Plan:** [plans/260106-1057-revenue-integration/phase-01-session-userid-hookup.md](../260106-1057-revenue-integration/phase-01-session-userid-hookup.md)
**Scope:** Session userId Integration

---

## Executive Summary

**Critical Issues:** 3
**High Priority:** 4
**Medium Priority:** 2
**Low Priority:** 1

**Overall Assessment:** Implementation incomplete with CRITICAL security vulnerabilities. Authentication bypass possible, authorization checks missing, user input trust issues.

---

## Scope

**Files Reviewed:**
- `src/hooks/use-permission.ts` (+3 lines)
- `src/components/revenues/revenue-table.tsx` (+4 lines, 3 changes)
- `src/components/revenues/revenue-form.tsx` (+4 lines, 2 changes)
- `src/app/api/revenues/route.ts` (context)
- `src/app/api/revenues/[id]/route.ts` (context)
- `src/app/api/revenues/[id]/lock/route.ts` (context)
- `src/app/api/revenues/[id]/unlock/route.ts` (context)

**Lines Analyzed:** ~1,400
**Focus:** Security, authentication, authorization, input validation
**Build Status:** ✅ Successful (no TypeScript errors)

---

## Critical Issues (Must Fix Immediately)

### 1. **CRITICAL: Client-Side userId Vulnerable to Tampering**

**Location:** All revenue API endpoints
**Severity:** 🔴 CRITICAL (OWASP A01:2021 - Broken Access Control)

**Problem:**
Client sends `userId` in request body, which can be manipulated by attackers. API accepts client-provided userId without server-side verification.

```typescript
// revenue-form.tsx:148
userId: userId || 'unknown',  // Client controls this value

// revenue-table.tsx:113, 136
body: JSON.stringify({ userId: userId || 'unknown' }),  // Client controls this

// API route.ts:151
userId: body.userId || 'system',  // Trusts client-provided value
```

**Attack Scenario:**
1. Attacker intercepts POST /api/revenues
2. Changes `userId` to another user's ID
3. Revenue record shows attacker performed action as victim user
4. Audit trail compromised, attribution broken

**Impact:**
- User impersonation
- Audit trail manipulation
- Compliance violations (SOX, GDPR)
- Data integrity compromise

**Fix Required:**
```typescript
// In API routes, extract userId from session:
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Use server-side session userId, NEVER client-provided
  const userId = session.user.id;

  // Remove body.userId entirely - don't trust client
  const revenue = await prisma.revenue.create({
    data: {
      // ... other fields
      userId: userId,  // From authenticated session only
    },
  });
}
```

**Apply to:** All 7 API endpoints (POST/PUT/DELETE revenues, lock/unlock)

---

### 2. **CRITICAL: Missing Authorization Checks**

**Location:** All revenue API endpoints
**Severity:** 🔴 CRITICAL (OWASP A01:2021 - Broken Access Control)

**Problem:**
TODO comments indicate authorization checks planned but NOT implemented:

```typescript
// lock/route.ts:14-21
// TODO: Verify user has revenue:manage permission
// if (!hasPermission(user.role, 'revenue:manage')) {
//   return NextResponse.json(
//     { success: false, error: 'Không có quyền khóa thu nhập' },
//     { status: 403 }
//   );
// }

// unlock/route.ts:14-21
// TODO: Verify user is ADMIN
// if (user.role !== 'ADMIN') {
//   return NextResponse.json(
//     { success: false, error: 'Chỉ Admin được mở khóa thu nhập' },
//     { status: 403 }
//   );
// }
```

**Attack Scenario:**
1. SELLER role user (should not have access) calls /api/revenues
2. No permission check = operation succeeds
3. Unauthorized revenue creation/modification

**Fix Required:**
```typescript
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const role = session.user.role as Role;

  // Check permission before ANY operation
  if (!hasPermission(role, 'revenue:manage')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Proceed with authorized operation
}
```

**Required Permissions:**
- GET /api/revenues → `revenue:view`
- POST /api/revenues → `revenue:manage`
- PUT /api/revenues/[id] → `revenue:manage`
- DELETE /api/revenues/[id] → `revenue:manage`
- POST /api/revenues/[id]/lock → `revenue:manage`
- POST /api/revenues/[id]/unlock → `ADMIN` role only (stricter)

---

### 3. **CRITICAL: No Authentication Required**

**Location:** All API routes
**Severity:** 🔴 CRITICAL (OWASP A07:2021 - Identification and Authentication Failures)

**Problem:**
API routes accept unauthenticated requests. No session verification at route entry.

**Current State:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();  // No auth check!
    // Process request...
  }
}
```

**Attack Scenario:**
1. Attacker sends direct HTTP requests to /api/revenues
2. No authentication check = requests processed
3. Unauthenticated data manipulation

**Fix Required:**
Add auth middleware or implement per-route auth:

```typescript
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  // FIRST thing: verify authentication
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Then check authorization
  // Then process request
}
```

**Alternative:** Create auth middleware wrapper to DRY up code.

---

## High Priority Issues

### 4. **Fallback to 'unknown' Hides Authentication Failures**

**Location:** `revenue-form.tsx:148`, `revenue-table.tsx:113, 136`
**Severity:** 🟠 HIGH

**Problem:**
```typescript
userId: userId || 'unknown',  // Silently fails to 'unknown'
```

If session fails to load, operation proceeds with 'unknown' instead of blocking. Creates audit trail pollution and masks auth issues.

**Fix:**
```typescript
// Block operation if userId unavailable
if (!userId) {
  toast.error('Session expired. Please login again.');
  return;
}

// Send only authenticated userId
body: JSON.stringify({ userId }),
```

---

### 5. **SQL Injection Risk in Date Filters**

**Location:** `src/app/api/revenues/route.ts:35-37`
**Severity:** 🟠 HIGH (OWASP A03:2021 - Injection)

**Problem:**
```typescript
if (fromDate) where.paymentDate.gte = new Date(fromDate);
if (toDate) where.paymentDate.lte = new Date(toDate);
```

Invalid date strings cause `Invalid Date` objects, potentially bypassing filters or causing query errors.

**Attack Scenario:**
```
GET /api/revenues?fromDate='; DROP TABLE revenues; --
```

Prisma mitigates SQL injection, but invalid dates break filtering logic.

**Fix:**
```typescript
// Validate date format
const fromDate = searchParams.get('fromDate');
const toDate = searchParams.get('toDate');

if (fromDate) {
  const date = new Date(fromDate);
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { success: false, error: 'Invalid fromDate format' },
      { status: 400 }
    );
  }
  where.paymentDate = { ...where.paymentDate, gte: date };
}

// Same for toDate
```

---

### 6. **Type Safety: userId Type Inconsistency**

**Location:** `use-permission.ts:62`
**Severity:** 🟠 HIGH

**Problem:**
```typescript
userId: (session?.user?.id as string) || null,
```

Session types show `user.id` may be `string | undefined`, but assertion to `string` masks potential undefined case.

**Fix:**
```typescript
// Explicit handling without type assertion
userId: session?.user?.id ?? null,
```

Type is correctly `string | null` without unsafe assertion.

---

### 7. **Missing Rate Limiting**

**Location:** All mutation endpoints (POST/PUT/DELETE)
**Severity:** 🟠 HIGH (OWASP A05:2021 - Security Misconfiguration)

**Problem:**
No rate limiting on revenue mutations. Attackers can spam create/delete operations.

**Fix:**
Implement rate limiting middleware (e.g., `next-rate-limit`, Redis-based) or Cloudflare rules.

```typescript
// Example with next-rate-limit
import rateLimit from 'next-rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    await limiter.check(10, 'REVENUE_CREATE'); // 10 requests/min
  } catch {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Process request
}
```

---

## Medium Priority Issues

### 8. **Error Messages Leak Internal Details**

**Location:** All API routes error handlers
**Severity:** 🟡 MEDIUM (OWASP A04:2021 - Insecure Design)

**Problem:**
```typescript
catch (error) {
  console.error('Error creating revenue:', error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { success: false, error: `Lỗi tạo thu nhập: ${message}` },
    { status: 500 }
  );
}
```

Database errors, validation errors exposed to client. Information disclosure risk.

**Fix:**
```typescript
catch (error) {
  console.error('Error creating revenue:', error);

  // Log full error server-side
  // Return generic message to client
  return NextResponse.json(
    { success: false, error: 'Lỗi tạo thu nhập. Vui lòng thử lại.' },
    { status: 500 }
  );
}
```

For known errors (validation), return specific messages. For unknown errors, return generic.

---

### 9. **Inconsistent Error Handling in Components**

**Location:** `revenue-form.tsx:100, 124, 147`
**Severity:** 🟡 MEDIUM

**Problem:**
Empty catch blocks swallow network errors:

```typescript
} catch {
  toast.error('Lỗi kết nối');  // No error logging
}
```

Debugging difficult, monitoring impossible.

**Fix:**
```typescript
} catch (error) {
  console.error('Error creating revenue:', error);
  toast.error('Lỗi kết nối. Vui lòng thử lại.');
}
```

---

## Low Priority Issues

### 10. **Magic String 'unknown' Hardcoded**

**Location:** Multiple files
**Severity:** 🟢 LOW

**Problem:**
```typescript
userId: userId || 'unknown',
```

Magic string duplicated across files. Should be constant.

**Fix:**
```typescript
// In config/constants.ts
export const UNKNOWN_USER_ID = 'unknown';

// Usage
userId: userId || UNKNOWN_USER_ID,
```

**Note:** After fixing Critical Issue #1, this becomes unnecessary as operations block without userId.

---

## Positive Observations

✅ **Type Safety:** Components properly typed with interfaces
✅ **Build Success:** No TypeScript compilation errors
✅ **Lock Mechanism:** Proper locked state checking before edit/delete
✅ **Client-Side Validation:** Form validates required fields before submit
✅ **Prisma Usage:** ORM mitigates SQL injection risks
✅ **Component Separation:** Clean separation of concerns (form, table, summary)
✅ **Error Recovery:** Loading states properly managed

---

## Task Completeness Analysis

**Phase 01 Requirements:**

| Task | Status | Issues |
|------|--------|--------|
| Extend usePermission to include userId | ✅ Complete | None |
| Update RevenueTable lock/unlock with userId | ⚠️ Incomplete | Critical #1, #2, #3 |
| Update RevenueForm submit with userId | ⚠️ Incomplete | Critical #1, #2, #3 |
| Test lock/unlock with authenticated user | ❌ Blocked | Cannot test until Critical issues fixed |

**Overall Phase Status:** 🔴 **FAILED** - Critical security issues block completion.

---

## Recommended Actions (Priority Order)

### Immediate (Before Any Deployment)

1. **Fix Critical #1:** Remove client-provided userId, use server-side session
2. **Fix Critical #2:** Implement authorization checks in all API routes
3. **Fix Critical #3:** Add authentication verification to all routes

### Before Merge

4. **Fix High #4:** Remove 'unknown' fallback, block operations without userId
5. **Fix High #5:** Add date validation in API filters
6. **Fix High #6:** Remove unsafe type assertions

### Before Production

7. **Fix High #7:** Implement rate limiting
8. **Fix Medium #8:** Sanitize error messages
9. **Fix Medium #9:** Add error logging in components

### Technical Debt

10. **Fix Low #10:** Extract magic strings to constants (after fixing Critical #1)

---

## Security Best Practices Violations

**OWASP Top 10 2021:**
- ❌ A01: Broken Access Control (Issues #1, #2, #3)
- ❌ A03: Injection (Issue #5)
- ❌ A04: Insecure Design (Issue #8)
- ❌ A05: Security Misconfiguration (Issue #7)
- ❌ A07: Identification and Authentication Failures (Issue #3)

**Severity Distribution:**
- 🔴 Critical: 3 (100% must fix)
- 🟠 High: 4 (100% recommended)
- 🟡 Medium: 2 (80% recommended)
- 🟢 Low: 1 (optional)

---

## Next Steps

1. **DO NOT DEPLOY** current code to production
2. Implement Critical fixes (#1-3) in separate commits
3. Re-run code review after fixes
4. Add integration tests for auth/authz flows
5. Security audit before Phase 02

---

## Code Examples: Complete Secure API Route

```typescript
// src/app/api/revenues/route.ts (SECURE VERSION)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { PAYMENT_TYPE_KEYS, CURRENCY_KEYS } from '@/config/revenue-config';

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. AUTHORIZATION
    const role = session.user.role as Role;

    if (!hasPermission(role, 'revenue:manage')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 3. INPUT VALIDATION
    const body = await request.json();

    if (!body.requestId || !body.paymentDate || !body.paymentType || !body.paymentSource) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!PAYMENT_TYPE_KEYS.includes(body.paymentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment type' },
        { status: 400 }
      );
    }

    // 4. BUSINESS LOGIC
    const currency = body.currency || 'VND';
    let amountVND: number;
    let foreignAmount: number | null = null;
    let exchangeRate: number | null = null;

    if (currency === 'VND') {
      amountVND = Number(body.amountVND) || 0;
    } else {
      if (!CURRENCY_KEYS.includes(currency)) {
        return NextResponse.json(
          { success: false, error: 'Invalid currency' },
          { status: 400 }
        );
      }

      foreignAmount = Number(body.foreignAmount) || 0;
      exchangeRate = Number(body.exchangeRate) || 0;

      if (foreignAmount <= 0 || exchangeRate <= 0) {
        return NextResponse.json(
          { success: false, error: 'Foreign amount and exchange rate must be positive' },
          { status: 400 }
        );
      }

      amountVND = Math.round(foreignAmount * exchangeRate);
    }

    if (amountVND <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // 5. DATABASE OPERATION (use session userId, NOT client-provided)
    const revenue = await prisma.revenue.create({
      data: {
        requestId: body.requestId,
        paymentDate: new Date(body.paymentDate),
        paymentType: body.paymentType,
        foreignAmount,
        currency,
        exchangeRate,
        amountVND,
        paymentSource: body.paymentSource,
        notes: body.notes?.trim() || null,
        userId: session.user.id,  // SERVER-SIDE SESSION ONLY
      },
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: revenue }, { status: 201 });

  } catch (error) {
    // 6. ERROR HANDLING
    console.error('Error creating revenue:', error);

    // Don't leak internal details
    return NextResponse.json(
      { success: false, error: 'Failed to create revenue. Please try again.' },
      { status: 500 }
    );
  }
}
```

---

## Unresolved Questions

1. Which MFA/2FA strategy for ADMIN unlock operations?
2. Should revenue locks auto-expire after N days?
3. Should lock/unlock operations create audit log entries separate from revenue records?
4. What rate limit thresholds appropriate for production load?
5. Should we implement CSRF protection for mutation endpoints?

---

**Review Status:** ⚠️ **FAILED - Critical Issues Found**
**Recommendation:** **BLOCK MERGE** until Critical issues #1-3 resolved
**Next Review:** After security fixes implemented
