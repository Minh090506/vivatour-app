# Phase 2A: Operator API Updates

**Owner**: Window 2
**Duration**: ~45 min
**Depends on**: Phase 1 (Foundation) complete
**Parallel with**: Phase 2B (Revenue API)

---

## Overview

Update Operator module API endpoints to support 3-tier lock system.

---

## Task 2A.1: Update Lock Endpoint (15 min)

### File: `src/app/api/operators/[id]/lock/route.ts`

**Current**: Simple `isLocked=true` toggle
**New**: Accept lock tier parameter, validate progression

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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

    // Apply lock
    const lockFields = getLockFields(tier, session.user.id, true);
    const updated = await prisma.operator.update({
      where: { id },
      data: lockFields,
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: id,
      action: getLockHistoryAction(tier, true),
      changes: {
        tier,
        ...lockFields,
      },
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

## Task 2A.2: Update Unlock Endpoint (15 min)

### File: `src/app/api/operators/[id]/unlock/route.ts`

**Current**: Admin-only, clears all lock fields
**New**: Tier-specific unlock, reverse order validation

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
    const updated = await prisma.operator.update({
      where: { id },
      data: unlockFields,
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: id,
      action: getLockHistoryAction(tier, false),
      changes: {
        tier,
        ...unlockFields,
      },
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

## Task 2A.3: Update Lock Period Endpoint (15 min)

### File: `src/app/api/operators/lock-period/route.ts`

**Current**: Batch locks all unlocked operators in month
**New**: Accept tier parameter, apply specific tier lock

### GET Handler (Preview)

```typescript
// Update GET handler to include tier state
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const tier = (searchParams.get('tier') as LockTier) || 'KT';

    if (!month) {
      return NextResponse.json({ error: 'Month required' }, { status: 400 });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find operators that can be locked at this tier
    const tierField = `lock${tier}` as 'lockKT' | 'lockAdmin' | 'lockFinal';

    // For KT tier: not yet locked at KT
    // For Admin tier: locked at KT but not Admin
    // For Final tier: locked at Admin but not Final
    const whereClause: Record<string, unknown> = {
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

    return NextResponse.json({
      month,
      tier,
      count: operators.length,
      operators,
    });
  } catch (error) {
    console.error('Lock period preview error:', error);
    return NextResponse.json(
      { error: 'Failed to preview lock period' },
      { status: 500 }
    );
  }
}
```

### POST Handler (Apply)

```typescript
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { month, tier = 'KT' } = body;

    if (!month) {
      return NextResponse.json({ error: 'Month required' }, { status: 400 });
    }

    // Check permission
    if (!canLock(session.user.role, tier)) {
      return NextResponse.json(
        { error: `Permission denied for lock tier: ${tier}` },
        { status: 403 }
      );
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Build where clause based on tier
    const whereClause: Record<string, unknown> = {
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

    // Get operators to lock
    const operators = await prisma.operator.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (operators.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No operators to lock',
        count: 0,
      });
    }

    // Apply lock in transaction
    const lockFields = getLockFields(tier, session.user.id, true);

    const result = await prisma.$transaction(async (tx) => {
      // Update all operators
      await tx.operator.updateMany({
        where: { id: { in: operators.map((o) => o.id) } },
        data: lockFields,
      });

      // Create history entries
      const historyEntries = operators.map((op) => ({
        operatorId: op.id,
        action: getLockHistoryAction(tier, true),
        changes: { tier, batch: true, month },
        userId: session.user.id,
      }));

      await tx.operatorHistory.createMany({
        data: historyEntries,
      });

      return operators.length;
    });

    return NextResponse.json({
      success: true,
      tier,
      month,
      count: result,
    });
  } catch (error) {
    console.error('Lock period error:', error);
    return NextResponse.json(
      { error: 'Failed to lock period' },
      { status: 500 }
    );
  }
}
```

---

## Task 2A.4: Update Operator Creation (10 min)

### File: `src/app/api/operators/route.ts`

Add serviceId generation on create.

```typescript
// Add import at top
import { generateServiceId } from '@/lib/id-utils';

// In POST handler, after validation, before prisma.operator.create:
// Generate serviceId if bookingCode available
let serviceId: string | null = null;
if (request.bookingCode) {
  serviceId = await generateServiceId(request.bookingCode);
}

// Add to create data:
const operator = await prisma.operator.create({
  data: {
    // ... existing fields ...
    serviceId,
    // Initialize lock tiers (all false by default via schema)
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
- [ ] No TypeScript errors

---

## API Contract Summary

### POST `/api/operators/[id]/lock`
```json
// Request
{ "tier": "KT" | "Admin" | "Final" }

// Response
{
  "success": true,
  "tier": "KT",
  "operator": { ... }
}
```

### POST `/api/operators/[id]/unlock`
```json
// Request
{ "tier": "KT" | "Admin" | "Final" }

// Response
{
  "success": true,
  "tier": "KT",
  "operator": { ... }
}
```

### GET `/api/operators/lock-period?month=YYYY-MM&tier=KT`
```json
// Response
{
  "month": "2026-01",
  "tier": "KT",
  "count": 15,
  "operators": [...]
}
```

### POST `/api/operators/lock-period`
```json
// Request
{ "month": "2026-01", "tier": "KT" }

// Response
{
  "success": true,
  "tier": "KT",
  "month": "2026-01",
  "count": 15
}
```
