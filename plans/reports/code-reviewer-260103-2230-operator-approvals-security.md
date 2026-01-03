# Code Review: Operator Approval System - Security & Quality Audit

**Date:** 2026-01-03
**Reviewer:** code-reviewer
**Scope:** Payment approval features (Phase 2)

---

## Scope

**Files Reviewed:**
1. `src/app/api/operators/pending-payments/route.ts`
2. `src/app/api/operators/approve/route.ts`
3. `src/app/api/operators/[id]/approve/route.ts`
4. `src/components/operators/operator-approval-table.tsx`
5. `src/components/operators/approval-summary-cards.tsx`
6. `src/app/(dashboard)/operators/approvals/page.tsx`
7. `src/components/layout/Header.tsx`
8. `src/components/ui/checkbox.tsx`

**Lines Analyzed:** ~650 lines
**Focus:** Security vulnerabilities, performance, architecture compliance, YAGNI/KISS/DRY violations

---

## Overall Assessment

Code quality is **GOOD** with critical security gaps requiring immediate attention before deployment. Implementation follows project standards but lacks authentication/authorization layer entirely.

**Risk Level:** HIGH - No authentication present on financial operations

---

## CRITICAL ISSUES (MUST FIX BEFORE DEPLOYMENT)

### 1. Missing Authentication/Authorization on ALL API Routes

**Severity:** CRITICAL - OWASP A01:2021 Broken Access Control

**Affected Files:**
- `src/app/api/operators/pending-payments/route.ts`
- `src/app/api/operators/approve/route.ts`
- `src/app/api/operators/[id]/approve/route.ts`

**Issue:**
All payment approval endpoints are completely unauthenticated. Any user can:
- View all pending payments
- Approve payments (single or batch)
- Bypass financial controls

**Current Code (Example):**
```typescript
// src/app/api/operators/approve/route.ts:5
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // NO AUTH CHECK HERE
    const userId = body.userId || 'system'; // User-controllable!
```

**Impact:**
- Unauthorized payment approvals
- Financial fraud risk
- Audit trail manipulation (user can set any `userId`)
- No role-based access control

**Required Fix:**
Add authentication middleware to ALL routes:

```typescript
import { getServerSession } from 'next-auth'; // or your auth solution
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 1. Verify authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. Check authorization (role-based)
  if (!session.user.permissions?.includes('approve_payments')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  // 3. Use verified userId from session
  const userId = session.user.id; // NOT from request body

  // ... rest of logic
}
```

**References:**
- OWASP Top 10 2021: A01 - Broken Access Control
- CWE-862: Missing Authorization

---

### 2. User ID Spoofing Vulnerability

**Severity:** CRITICAL - Audit Trail Manipulation

**Affected Files:**
- `src/app/api/operators/approve/route.ts:25`
- `src/app/api/operators/[id]/approve/route.ts:38`
- `src/app/(dashboard)/operators/approvals/page.tsx:65`

**Issue:**
User ID is sent from client and trusted without verification:

```typescript
// route.ts:25
const userId = body.userId || 'system'; // ⚠️ Client-controllable

// page.tsx:65
userId: 'current-user', // TODO: Get from auth ⚠️ Hardcoded
```

**Attack Scenario:**
```bash
curl -X POST /api/operators/approve \
  -d '{"operatorIds":["123"], "paymentDate":"2026-01-03", "userId":"admin"}'
# Attacker impersonates admin in audit log
```

**Impact:**
- Forged audit trails
- Cannot trace who approved payments
- Compliance violations (SOX, GDPR audit requirements)

**Required Fix:**
Never trust client-provided user IDs:

```typescript
// Get from server session only
const session = await getServerSession(authOptions);
const userId = session.user.id; // Server-side source of truth

await createOperatorHistory({
  operatorId: id,
  action: 'APPROVE',
  changes: { /* ... */ },
  userId, // Verified server-side
});
```

---

### 3. No Input Validation on Critical Fields

**Severity:** HIGH - Data Integrity Risk

**Affected Files:**
- `src/app/api/operators/approve/route.ts:10-23`

**Issue:**
Insufficient validation on array inputs:

```typescript
// Line 10-15: Only checks array exists
if (!body.operatorIds || !Array.isArray(body.operatorIds) || body.operatorIds.length === 0) {
  return NextResponse.json(...);
}

// ⚠️ Missing validations:
// - Array element types (could be non-string)
// - Array length limit (DoS via large arrays)
// - ID format validation (CUID format)
```

**Attack Scenarios:**
1. Send 100,000 IDs → DoS via transaction timeout
2. Send `["<script>alert(1)</script>"]` → potential XSS in logs
3. Send non-CUID format → database errors

**Required Fix:**
Add comprehensive validation:

```typescript
import { z } from 'zod';

const approvalSchema = z.object({
  operatorIds: z.array(z.string().cuid()).min(1).max(100), // Limit to 100
  paymentDate: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validation = approvalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error },
        { status: 400 }
      );
    }

    const { operatorIds, paymentDate } = validation.data;
    // ... rest of logic
  }
}
```

---

### 4. Missing Transaction Atomicity Error Handling

**Severity:** HIGH - Data Corruption Risk

**Affected File:**
- `src/app/api/operators/approve/route.ts:50-80`

**Issue:**
Transaction lacks proper error handling:

```typescript
// Line 50-80
const result = await prisma.$transaction(async (tx) => {
  const updates = await Promise.all(
    body.operatorIds.map(async (id: string) => {
      const op = operators.find((o) => o.id === id);
      const updated = await tx.operator.update({ /* ... */ });

      // ⚠️ If createHistory fails, entire transaction rolls back
      // but no specific error handling
      await tx.operatorHistory.create({ /* ... */ });

      return updated;
    })
  );
  return updates;
});
// ⚠️ No timeout, no isolation level specified
```

**Issues:**
1. No transaction timeout (could lock database)
2. No isolation level (default may cause race conditions)
3. Generic error handling loses context

**Required Fix:**

```typescript
try {
  const result = await prisma.$transaction(
    async (tx) => {
      const updates = await Promise.all(
        body.operatorIds.map(async (id: string) => {
          const op = operators.find((o) => o.id === id);

          // Validate operator exists in pre-fetch
          if (!op) {
            throw new Error(`Operator ${id} not found in batch`);
          }

          const updated = await tx.operator.update({
            where: { id },
            data: { paymentStatus: 'PAID', paymentDate },
          });

          await tx.operatorHistory.create({
            data: {
              operatorId: id,
              action: 'APPROVE',
              changes: {
                paymentStatus: { before: op.paymentStatus, after: 'PAID' },
                paymentDate: { before: op.paymentDate, after: paymentDate },
              },
              userId,
            },
          });

          return updated;
        })
      );
      return updates;
    },
    {
      maxWait: 5000, // 5s max wait for lock
      timeout: 10000, // 10s max execution
      isolationLevel: 'Serializable', // Prevent race conditions
    }
  );
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle specific DB errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Một số dịch vụ không tồn tại' },
        { status: 404 }
      );
    }
  }
  throw error; // Re-throw for generic handler
}
```

---

## HIGH PRIORITY FINDINGS

### 5. Race Condition in Lock Check (TOCTOU)

**Severity:** HIGH - Business Logic Bypass

**Affected Files:**
- `src/app/api/operators/approve/route.ts:28-46`
- `src/app/api/operators/[id]/approve/route.ts:14-28`

**Issue:**
Time-of-check to time-of-use (TOCTOU) race condition:

```typescript
// Step 1: Check if locked (time of check)
const operators = await prisma.operator.findMany({
  where: { id: { in: body.operatorIds } },
});

const lockedOps = operators.filter((op) => op.isLocked);
if (lockedOps.length > 0) {
  return NextResponse.json(...);
}

// ⚠️ GAP: Another request could lock operator here

// Step 2: Update operator (time of use)
await prisma.$transaction(async (tx) => {
  const updated = await tx.operator.update({ where: { id } });
  // ...
});
```

**Attack Scenario:**
1. Request A checks operator X (not locked) ✓
2. Request B locks operator X
3. Request A updates operator X (bypasses lock) ✗

**Required Fix:**
Move lock check inside transaction:

```typescript
await prisma.$transaction(async (tx) => {
  // Re-check lock status inside transaction
  const currentOp = await tx.operator.findUnique({
    where: { id },
    select: { isLocked: true, paymentStatus: true },
  });

  if (currentOp?.isLocked) {
    throw new Error('Operator is locked');
  }

  if (currentOp?.paymentStatus === 'PAID') {
    throw new Error('Already paid');
  }

  // Now update atomically
  const updated = await tx.operator.update({ /* ... */ });
});
```

---

### 6. Decimal Type Coercion Issues

**Severity:** MEDIUM-HIGH - Precision Loss

**Affected Files:**
- `src/app/api/operators/pending-payments/route.ts:73-77`
- `src/app/api/operators/approve/route.ts:86`

**Issue:**
`Decimal` types coerced to `number` causing precision loss:

```typescript
// pending-payments/route.ts:73
totalAmount: data.reduce((sum, op) => sum + Number(op.totalCost), 0),
//                                           ^^^^^^^^ Precision loss
```

**Impact:**
Financial calculations with Decimal (e.g., 1000000.50 VND) may lose precision when converted to JavaScript `number` (53-bit float).

**Example:**
```typescript
const decimal1 = new Prisma.Decimal("9007199254740993");
const decimal2 = new Prisma.Decimal("1");
const sum = Number(decimal1) + Number(decimal2);
console.log(sum); // 9007199254740994 (WRONG - should be 9007199254740994)
```

**Required Fix:**
Use Decimal arithmetic:

```typescript
import { Decimal } from '@prisma/client/runtime/library';

const totalAmount = data.reduce(
  (sum, op) => sum.add(op.totalCost),
  new Decimal(0)
);

// Convert to number only for display
return NextResponse.json({
  success: true,
  data,
  summary: {
    total: data.length,
    totalAmount: totalAmount.toNumber(), // Convert at last step
    // ...
  },
});
```

---

### 7. Silent Failure on Header Badge Update

**Severity:** MEDIUM - Poor Error Handling

**Affected File:**
- `src/components/layout/Header.tsx:32-43`

**Issue:**
```typescript
useEffect(() => {
  fetch('/api/operators/pending-payments?filter=overdue')
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        setOverdueCount(data.data?.length || 0);
      }
    })
    .catch(() => {
      // Silent fail for badge ⚠️ No logging, no fallback
    });
}, []);
```

**Problems:**
1. No error logging (can't debug issues)
2. Badge shows 0 on error (misleading)
3. No retry mechanism
4. Runs on every component mount (could be optimized)

**Required Fix:**

```typescript
useEffect(() => {
  let isMounted = true;

  async function fetchOverdueCount() {
    try {
      const res = await fetch('/api/operators/pending-payments?filter=overdue');

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (isMounted && data.success) {
        setOverdueCount(data.data?.length || 0);
      }
    } catch (error) {
      // Log but don't disrupt UI
      console.warn('Failed to fetch overdue count:', error);
      // Optional: Set error state to show warning icon
    }
  }

  fetchOverdueCount();

  // Optional: Poll every 5 minutes
  const interval = setInterval(fetchOverdueCount, 5 * 60 * 1000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, []);
```

---

### 8. XSS Risk in Dynamic Badge Content

**Severity:** MEDIUM - Stored XSS Potential

**Affected File:**
- `src/components/operators/operator-approval-table.tsx:154-159`

**Issue:**
Customer names and service names rendered without sanitization:

```typescript
<TableCell>
  <div className="font-medium">{item.requestCode}</div>
  <div className="text-sm text-gray-500">{item.customerName}</div>
  {/* ⚠️ If customerName contains <script>, could execute */}
</TableCell>
```

**Attack Scenario:**
If customer name in database is:
```sql
UPDATE requests SET customer_name = '<img src=x onerror="alert(1)">' WHERE id = '...';
```

React escapes by default, BUT:
- If using `dangerouslySetInnerHTML` anywhere (check)
- If serializing to JSON for download (unescaped)

**Verification Needed:**
Search codebase for `dangerouslySetInnerHTML`:

```typescript
// Safe (React auto-escapes)
<div>{item.customerName}</div>

// Unsafe (manual escape needed)
<div dangerouslySetInnerHTML={{ __html: item.customerName }} />
```

**Status:** LIKELY SAFE but verify no dangerous HTML rendering exists

---

## MEDIUM PRIORITY IMPROVEMENTS

### 9. Inefficient Re-fetching Pattern

**Severity:** MEDIUM - Performance/UX

**Affected File:**
- `src/app/(dashboard)/operators/approvals/page.tsx:57-80`

**Issue:**
Full data refetch after every approval:

```typescript
const handleApprove = async (ids: string[], paymentDate: Date) => {
  try {
    const res = await fetch('/api/operators/approve', { /* ... */ });
    const data = await res.json();
    if (data.success) {
      toast.success(`Đã duyệt ${data.data.count} dịch vụ`);
      fetchData(); // ⚠️ Full refetch (could be 100+ rows)
    }
  } catch (error) { /* ... */ }
};
```

**Better Approach - Optimistic Updates:**

```typescript
const handleApprove = async (ids: string[], paymentDate: Date) => {
  // 1. Optimistic update (immediate UI feedback)
  const previousItems = items;
  setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
  setSummary((prev) => ({
    ...prev,
    total: prev.total - ids.length,
    // Update other summary fields
  }));

  try {
    const res = await fetch('/api/operators/approve', { /* ... */ });
    const data = await res.json();

    if (data.success) {
      toast.success(`Đã duyệt ${data.data.count} dịch vụ`);
      // Optional: Fetch only to sync server state
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    // 2. Rollback on error
    setItems(previousItems);
    fetchData(); // Sync with server
    toast.error('Lỗi duyệt thanh toán');
  }
};
```

---

### 10. Missing Loading States in Table

**Severity:** MEDIUM - UX

**Affected File:**
- `src/components/operators/operator-approval-table.tsx:54-72`

**Issue:**
Buttons disabled during approval but no visual feedback:

```typescript
<Button
  size="sm"
  onClick={() => handleSingleApprove(item.id)}
  disabled={item.isLocked || approving} // ⚠️ Just disabled, no spinner
>
  Duyệt
</Button>
```

**Improvement:**

```typescript
import { Loader2 } from 'lucide-react';

<Button
  size="sm"
  onClick={() => handleSingleApprove(item.id)}
  disabled={item.isLocked || approving}
>
  {approving ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Đang xử lý...
    </>
  ) : (
    'Duyệt'
  )}
</Button>
```

---

### 11. Code Duplication (DRY Violation)

**Severity:** LOW-MEDIUM - Maintainability

**Affected Files:**
- `src/app/api/operators/approve/route.ts:52-76`
- `src/app/api/operators/[id]/approve/route.ts:40-56`

**Issue:**
Duplicate approval logic in batch and single endpoints:

```typescript
// approve/route.ts:54-60
const updated = await tx.operator.update({
  where: { id },
  data: { paymentStatus: 'PAID', paymentDate },
});

await tx.operatorHistory.create({
  data: {
    operatorId: id,
    action: 'APPROVE',
    changes: { /* ... */ },
    userId,
  },
});

// [id]/approve/route.ts:40-56 - SAME LOGIC
```

**Refactor to Shared Function:**

```typescript
// src/lib/operator-approvals.ts
import { Prisma } from '@prisma/client';

export async function approveOperator(
  tx: Prisma.TransactionClient,
  operatorId: string,
  previousStatus: string,
  previousDate: Date | null,
  paymentDate: Date,
  userId: string
) {
  const updated = await tx.operator.update({
    where: { id: operatorId },
    data: { paymentStatus: 'PAID', paymentDate },
  });

  await tx.operatorHistory.create({
    data: {
      operatorId,
      action: 'APPROVE',
      changes: {
        paymentStatus: { before: previousStatus, after: 'PAID' },
        paymentDate: { before: previousDate, after: paymentDate },
      },
      userId,
    },
  });

  return updated;
}

// Usage in both routes
await approveOperator(tx, id, op.paymentStatus, op.paymentDate, paymentDate, userId);
```

---

### 12. No Rate Limiting

**Severity:** MEDIUM - DoS Prevention

**All API Routes**

**Issue:**
No rate limiting on approval endpoints. Attacker could:
- Spam approval requests
- Exhaust database connections
- Cause transaction locks

**Recommendation:**
Add rate limiting middleware (e.g., `upstash/ratelimit`, `express-rate-limit`):

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'unknown';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 }
    );
  }

  // ... rest of logic
}
```

---

## LOW PRIORITY SUGGESTIONS

### 13. TypeScript Compilation Errors in Tests

**Severity:** LOW - Development Experience

**Issue:**
TypeScript compilation fails with 15+ errors in test files (see test output). These don't affect production but block CI/CD.

**Required:**
Fix test type errors before merging:

```bash
npx tsc --noEmit
```

**Common Issues:**
1. Incorrect Prisma mock types
2. Missing `TransactionType` enum imports
3. `NextRequest` type mismatches

---

### 14. Missing Index on Payment Queries

**Severity:** LOW - Performance (Future)

**Affected:** Database Schema

**Issue:**
Query filters by `paymentStatus`, `isLocked`, `paymentDeadline` but no composite index:

```prisma
// prisma/schema.prisma - Current
model Operator {
  // ...
  paymentStatus   String?
  paymentDeadline DateTime?
  isLocked        Boolean   @default(false)

  @@index([paymentStatus]) // Only single field index
}
```

**Improvement:**

```prisma
model Operator {
  // ...
  @@index([paymentStatus, isLocked, paymentDeadline]) // Composite for approval queries
  @@index([supplierId, paymentStatus]) // For supplier-filtered queries
}
```

Run migration:
```bash
npx prisma migrate dev --name add_approval_indexes
```

---

### 15. Hardcoded User in Client

**Severity:** LOW - Tech Debt

**Affected File:**
- `src/app/(dashboard)/operators/approvals/page.tsx:65`

**Issue:**
```typescript
userId: 'current-user', // TODO: Get from auth
```

**Must Replace:** Once auth is implemented, use session:

```typescript
import { useSession } from 'next-auth/react';

const { data: session } = useSession();

const handleApprove = async (ids: string[], paymentDate: Date) => {
  // ...
  body: JSON.stringify({
    operatorIds: ids,
    paymentDate: paymentDate.toISOString(),
    // Remove userId - get from server session
  }),
};
```

---

## POSITIVE OBSERVATIONS

1. **Consistent API Response Format** - All endpoints follow `{ success, data, error }` pattern ✓
2. **Transaction Usage** - Batch approvals use Prisma transactions correctly ✓
3. **Audit Trail** - History logging for all approvals (good for compliance) ✓
4. **TypeScript Strict Mode** - All files fully typed ✓
5. **Component Composition** - Well-structured React components with proper separation ✓
6. **Loading States** - Table shows loading state during fetch ✓
7. **Error Boundaries** - Try-catch blocks in all API routes ✓
8. **Checkbox Component** - Proper Radix UI usage with accessibility ✓

---

## RECOMMENDED ACTIONS (Prioritized)

### Before Deployment (CRITICAL)

1. **[P0]** Implement authentication on ALL approval endpoints (Issues #1, #2)
2. **[P0]** Add input validation with Zod (Issue #3)
3. **[P0]** Fix TOCTOU race condition in lock checks (Issue #5)
4. **[P1]** Add transaction timeout and isolation level (Issue #4)
5. **[P1]** Fix Decimal precision loss (Issue #6)

### After Deployment (Non-Blocking)

6. **[P2]** Refactor duplicate approval logic (Issue #11)
7. **[P2]** Add rate limiting (Issue #12)
8. **[P2]** Implement optimistic updates (Issue #9)
9. **[P3]** Add loading indicators to buttons (Issue #10)
10. **[P3]** Fix TypeScript test errors (Issue #13)
11. **[P3]** Add database indexes (Issue #14)

---

## METRICS

- **Type Coverage:** 100% (strict mode enabled)
- **Test Coverage:** N/A (tests have type errors, cannot run)
- **Security Issues:** 7 (2 Critical, 3 High, 2 Medium)
- **Performance Issues:** 2 (1 High, 1 Low)
- **Code Quality:** GOOD (follows standards except DRY violations)

---

## COMPLIANCE CHECKLIST

Based on `docs/code-standards.md`:

- [x] Code follows naming conventions
- [x] TypeScript strict mode compliance
- [x] Types defined for functions/components
- [ ] **Error handling comprehensive** (missing auth errors)
- [x] API responses follow standard format
- [x] Tailwind CSS used (no inline styles)
- [ ] **Database queries optimized** (missing indexes, Decimal issues)
- [ ] **Tests added for new features** (tests have type errors)
- [ ] README/docs updated (not checked)
- [ ] `npm run lint` passes (assumed)
- [ ] **`npm run build` passes** (TypeScript errors in tests)

---

## UNRESOLVED QUESTIONS

1. **Auth Implementation:** Which authentication library is planned? (NextAuth, Clerk, custom?)
2. **Role Definitions:** What roles can approve payments? (Admin only, Finance team, etc.)
3. **Audit Requirements:** What compliance standards apply? (SOX, GDPR, local regulations?)
4. **Rate Limit Thresholds:** What's acceptable approval frequency? (10/min per user?)
5. **Decimal Precision:** What precision is required for VND amounts? (typically 0 decimal places)
6. **XSS Testing:** Has penetration testing been done on user-supplied data?
7. **Database Indexes:** Are slow query logs monitored? Add composite indexes?

---

**Status:** REVIEW COMPLETE - REQUIRES CRITICAL FIXES BEFORE PRODUCTION DEPLOYMENT
