# Phase 2A: Operator API Updates

**Owner**: Window 2
**Duration**: ~25 min
**Depends on**: Phase 1 (Foundation) complete
**Parallel with**: Phase 2B (Revenue API)

---

## Overview

Update Operator module API endpoints to support 3-tier lock system.

---

## Task 2A.1: Update Lock Endpoint (10 min)

### File: `src/app/api/operators/[id]/lock/route.ts`

**Current**: Simple `isLocked=true` toggle
**New**: Accept lock tier parameter, validate progression

Replace existing POST handler with:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import {
  canLock,
  canLockTier,
  getLockFields,
  getLockHistoryAction,
  type LockTier,
  LOCK_TIERS,
} from '@/lib/lock-utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const tier = (body.tier as LockTier) || 'KT'; // Default to KT tier

    // Validate tier
    if (!LOCK_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid lock tier: ${tier}` },
        { status: 400 }
      );
    }

    // Check permission for this tier
    const role = session.user.role;
    if (!canLock(role, tier)) {
      return NextResponse.json(
        { error: `Permission denied for lock tier: ${tier}` },
        { status: 403 }
      );
    }

    // Get current operator state
    const operator = await prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        lockKT: true,
        lockAdmin: true,
        lockFinal: true,
        serviceName: true,
      },
    });

    if (!operator) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
    }

    // Validate tier progression
    const lockState = {
      lockKT: operator.lockKT,
      lockAdmin: operator.lockAdmin,
      lockFinal: operator.lockFinal,
    };

    if (!canLockTier(lockState, tier)) {
      return NextResponse.json(
        {
          error: `Cannot lock tier ${tier}. Check progression: KT → Admin → Final`,
          currentState: lockState,
        },
        { status: 400 }
      );
    }

    // Apply lock + update legacy isLocked
    const lockFields = getLockFields(tier, session.user.id, true);
    const updated = await prisma.operator.update({
      where: { id },
      data: {
        ...lockFields,
        isLocked: true, // Keep legacy field in sync
      },
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: id,
      action: getLockHistoryAction(tier, true),
      changes: { tier, ...lockFields },
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      tier,
      operator: updated,
    });
  } catch (error) {
    console.error('Lock operator error:', error);
    return NextResponse.json(
      { error: 'Failed to lock operator' },
      { status: 500 }
    );
  }
}
```

---

## Task 2A.2: Update Unlock Endpoint (10 min)

### File: `src/app/api/operators/[id]/unlock/route.ts`

**Current**: Admin-only, clears all lock fields
**New**: Tier-specific unlock, reverse order validation

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import {
  canUnlock,
  canUnlockTier,
  getLockFields,
  getLockHistoryAction,
  type LockTier,
  LOCK_TIERS,
} from '@/lib/lock-utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const tier = (body.tier as LockTier) || 'KT';

    // Validate tier
    if (!LOCK_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid lock tier: ${tier}` },
        { status: 400 }
      );
    }

    // Check permission for this tier
    const role = session.user.role;
    if (!canUnlock(role, tier)) {
      return NextResponse.json(
        { error: `Permission denied to unlock tier: ${tier}` },
        { status: 403 }
      );
    }

    // Get current operator state
    const operator = await prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        lockKT: true,
        lockAdmin: true,
        lockFinal: true,
        serviceName: true,
      },
    });

    if (!operator) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
    }

    // Validate unlock order (reverse: Final → Admin → KT)
    const lockState = {
      lockKT: operator.lockKT,
      lockAdmin: operator.lockAdmin,
      lockFinal: operator.lockFinal,
    };

    if (!canUnlockTier(lockState, tier)) {
      return NextResponse.json(
        {
          error: `Cannot unlock tier ${tier}. Must unlock in reverse order: Final → Admin → KT`,
          currentState: lockState,
        },
        { status: 400 }
      );
    }

    // Apply unlock
    const unlockFields = getLockFields(tier, session.user.id, false);

    // Check if all tiers will be unlocked
    const willBeFullyUnlocked =
      tier === 'KT' ||
      (tier === 'Admin' && !operator.lockFinal) ||
      (tier === 'Final' && !operator.lockAdmin && !operator.lockKT);

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        ...unlockFields,
        // Update legacy isLocked only when fully unlocked
        ...(tier === 'KT' ? { isLocked: false } : {}),
      },
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: id,
      action: getLockHistoryAction(tier, false),
      changes: { tier, ...unlockFields },
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      tier,
      operator: updated,
    });
  } catch (error) {
    console.error('Unlock operator error:', error);
    return NextResponse.json(
      { error: 'Failed to unlock operator' },
      { status: 500 }
    );
  }
}
```

---

## Task 2A.3: Update Lock Period Endpoint (5 min)

### File: `src/app/api/operators/lock-period/route.ts`

Update GET and POST handlers to accept tier parameter. Key changes:

**GET Handler - Preview:**
```typescript
// Add tier parameter
const tier = (searchParams.get('tier') as LockTier) || 'KT';

// Update where clause based on tier
const whereClause: Prisma.OperatorWhereInput = {
  serviceDate: { gte: startDate, lt: endDate },
};

if (tier === 'KT') {
  whereClause.lockKT = false;
} else if (tier === 'Admin') {
  whereClause.lockKT = true;
  whereClause.lockAdmin = false;
} else if (tier === 'Final') {
  whereClause.lockAdmin = true;
  whereClause.lockFinal = false;
}

// Include tier status in response
const operators = await prisma.operator.findMany({
  where: whereClause,
  select: {
    id: true,
    serviceName: true,
    serviceDate: true,
    totalCost: true,
    lockKT: true,
    lockAdmin: true,
    lockFinal: true,
  },
  orderBy: { serviceDate: 'asc' },
});

return NextResponse.json({ month, tier, count: operators.length, operators });
```

**POST Handler - Apply:**
```typescript
// Add tier parameter
const { month, tier = 'KT' } = body;

// Permission check
if (!canLock(session.user.role, tier)) {
  return NextResponse.json(
    { error: `Permission denied for lock tier: ${tier}` },
    { status: 403 }
  );
}

// Apply lock with tier
const lockFields = getLockFields(tier, session.user.id, true);

await prisma.$transaction(async (tx) => {
  await tx.operator.updateMany({
    where: { id: { in: operatorIds } },
    data: {
      ...lockFields,
      isLocked: true, // Keep legacy in sync
    },
  });

  // Create history entries with tier info
  const historyEntries = operatorIds.map((opId) => ({
    operatorId: opId,
    action: getLockHistoryAction(tier, true),
    changes: { tier, batch: true, month },
    userId: session.user.id,
  }));

  await tx.operatorHistory.createMany({ data: historyEntries });
});
```

---

## Task 2A.4: Add ServiceId on Create (5 min)

### File: `src/app/api/operators/route.ts`

In POST handler, add serviceId generation:

```typescript
// Add import at top
import { generateServiceId } from '@/lib/lock-utils';

// In POST handler, after getting request data:
// Generate serviceId if bookingCode available
const request = await prisma.request.findUnique({
  where: { id: data.requestId },
  select: { bookingCode: true },
});

let serviceId: string | null = null;
if (request?.bookingCode) {
  serviceId = generateServiceId(request.bookingCode);
}

// Add to create data
const operator = await prisma.operator.create({
  data: {
    ...data,
    serviceId,
    // Initialize lock tiers (defaults to false via schema)
  },
});
```

---

## Verification Checklist

- [ ] Lock endpoint accepts `tier` parameter
- [ ] Lock validates progression (KT → Admin → Final)
- [ ] Unlock validates reverse order (Final → Admin → KT)
- [ ] Lock-period supports tier parameter
- [ ] History entries include tier info
- [ ] serviceId generated on create
- [ ] Legacy isLocked field stays in sync
- [ ] No TypeScript errors

---

## API Contract

### POST `/api/operators/[id]/lock`
```json
// Request
{ "tier": "KT" | "Admin" | "Final" }

// Response 200
{ "success": true, "tier": "KT", "operator": { ... } }

// Response 400 - Invalid progression
{ "error": "Cannot lock tier Admin...", "currentState": {...} }
```

### POST `/api/operators/[id]/unlock`
```json
// Request
{ "tier": "KT" | "Admin" | "Final" }

// Response 200
{ "success": true, "tier": "KT", "operator": { ... } }
```

### GET `/api/operators/lock-period?month=2026-01&tier=KT`
```json
{ "month": "2026-01", "tier": "KT", "count": 15, "operators": [...] }
```

### POST `/api/operators/lock-period`
```json
// Request
{ "month": "2026-01", "tier": "KT" }

// Response
{ "success": true, "tier": "KT", "month": "2026-01", "count": 15 }
```
