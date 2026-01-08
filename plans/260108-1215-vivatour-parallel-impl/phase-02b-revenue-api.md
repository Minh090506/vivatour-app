# Phase 2B: Revenue API Updates

**Owner**: Window 3
**Duration**: ~45 min
**Depends on**: Phase 1 (Foundation) complete
**Parallel with**: Phase 2A (Operator API)

---

## Overview

Update Revenue module with 3-tier lock system and add history tracking.

---

## Task 2B.1: Create Revenue History Utility (10 min)

### File: `src/lib/revenue-history.ts` (NEW)

```typescript
/**
 * Revenue History Utility
 * Creates audit trail entries for revenue operations
 */

import { prisma } from './db';

export interface RevenueHistoryInput {
  revenueId: string;
  action: string;
  changes: Record<string, unknown>;
  userId: string;
}

export async function createRevenueHistory(input: RevenueHistoryInput) {
  return prisma.revenueHistory.create({
    data: {
      revenueId: input.revenueId,
      action: input.action,
      changes: input.changes,
      userId: input.userId,
    },
  });
}

export async function getRevenueHistory(revenueId: string) {
  return prisma.revenueHistory.findMany({
    where: { revenueId },
    orderBy: { createdAt: 'desc' },
  });
}
```

---

## Task 2B.2: Update Lock Endpoint (15 min)

### File: `src/app/api/revenues/[id]/lock/route.ts`

**Current**: Simple `isLocked=true` with `revenue:manage` permission
**New**: Tier-based locking with progression validation

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createRevenueHistory } from '@/lib/revenue-history';
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
    if (!canLock(role, tier)) {
      return NextResponse.json(
        { error: `Permission denied for lock tier: ${tier}` },
        { status: 403 }
      );
    }

    // Get current revenue state
    const revenue = await prisma.revenue.findUnique({
      where: { id },
      select: {
        id: true,
        lockKT: true,
        lockAdmin: true,
        lockFinal: true,
        paymentType: true,
        amountVND: true,
      },
    });

    if (!revenue) {
      return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });
    }

    // Validate tier progression
    const lockState = {
      lockKT: revenue.lockKT,
      lockAdmin: revenue.lockAdmin,
      lockFinal: revenue.lockFinal,
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
    const updated = await prisma.revenue.update({
      where: { id },
      data: lockFields,
    });

    // Create history entry
    await createRevenueHistory({
      revenueId: id,
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
      revenue: updated,
    });
  } catch (error) {
    console.error('Lock revenue error:', error);
    return NextResponse.json(
      { error: 'Failed to lock revenue' },
      { status: 500 }
    );
  }
}
```

---

## Task 2B.3: Update Unlock Endpoint (15 min)

### File: `src/app/api/revenues/[id]/unlock/route.ts`

**Current**: Admin-only simple unlock
**New**: Tier-specific unlock with reverse order validation

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createRevenueHistory } from '@/lib/revenue-history';
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

    // Get current revenue state
    const revenue = await prisma.revenue.findUnique({
      where: { id },
      select: {
        id: true,
        lockKT: true,
        lockAdmin: true,
        lockFinal: true,
        paymentType: true,
      },
    });

    if (!revenue) {
      return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });
    }

    // Validate unlock order (reverse: Final → Admin → KT)
    const lockState = {
      lockKT: revenue.lockKT,
      lockAdmin: revenue.lockAdmin,
      lockFinal: revenue.lockFinal,
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
    const updated = await prisma.revenue.update({
      where: { id },
      data: unlockFields,
    });

    // Create history entry
    await createRevenueHistory({
      revenueId: id,
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
      revenue: updated,
    });
  } catch (error) {
    console.error('Unlock revenue error:', error);
    return NextResponse.json(
      { error: 'Failed to unlock revenue' },
      { status: 500 }
    );
  }
}
```

---

## Task 2B.4: Update Revenue Creation (10 min)

### File: `src/app/api/revenues/route.ts`

Add revenueId generation and history tracking.

```typescript
// Add imports at top
import { generateRevenueId } from '@/lib/id-utils';
import { createRevenueHistory } from '@/lib/revenue-history';

// In POST handler, after validation:

// Get bookingCode from request
const request = await prisma.request.findUnique({
  where: { id: body.requestId },
  select: { bookingCode: true },
});

// Generate revenueId if bookingCode available
let generatedRevenueId: string | null = null;
if (request?.bookingCode) {
  generatedRevenueId = await generateRevenueId(request.bookingCode);
}

// Create revenue with revenueId
const revenue = await prisma.revenue.create({
  data: {
    // ... existing fields ...
    revenueId: generatedRevenueId,
    // Lock tiers default to false via schema
  },
});

// Create history entry for CREATE
await createRevenueHistory({
  revenueId: revenue.id,
  action: 'CREATE',
  changes: {
    paymentType: revenue.paymentType,
    amountVND: revenue.amountVND.toString(),
    paymentDate: revenue.paymentDate.toISOString(),
  },
  userId: session.user.id,
});
```

---

## Task 2B.5: Add Revenue History Endpoint (10 min)

### File: `src/app/api/revenues/[id]/history/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRevenueHistory } from '@/lib/revenue-history';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify revenue exists
    const revenue = await prisma.revenue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!revenue) {
      return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });
    }

    // Get history with user info
    const history = await prisma.revenueHistory.findMany({
      where: { revenueId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        // Note: RevenueHistory doesn't have user relation in schema
        // Will need to join manually or add relation
      },
    });

    // Fetch user names for history entries
    const userIds = [...new Set(history.map((h) => h.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const historyWithUsers = history.map((h) => ({
      ...h,
      userName: userMap.get(h.userId) || 'Unknown',
    }));

    return NextResponse.json(historyWithUsers);
  } catch (error) {
    console.error('Get revenue history error:', error);
    return NextResponse.json(
      { error: 'Failed to get revenue history' },
      { status: 500 }
    );
  }
}
```

---

## Verification Checklist

- [ ] RevenueHistory model in schema (Phase 1)
- [ ] `revenue-history.ts` utility working
- [ ] Lock endpoint accepts `tier` parameter
- [ ] Lock validates progression (KT → Admin → Final)
- [ ] Unlock validates reverse order (Final → Admin → KT)
- [ ] History entries created for lock/unlock
- [ ] revenueId generated on create
- [ ] History endpoint returns entries
- [ ] No TypeScript errors

---

## API Contract Summary

### POST `/api/revenues/[id]/lock`
```json
// Request
{ "tier": "KT" | "Admin" | "Final" }

// Response
{
  "success": true,
  "tier": "KT",
  "revenue": { ... }
}
```

### POST `/api/revenues/[id]/unlock`
```json
// Request
{ "tier": "KT" | "Admin" | "Final" }

// Response
{
  "success": true,
  "tier": "KT",
  "revenue": { ... }
}
```

### GET `/api/revenues/[id]/history`
```json
// Response
[
  {
    "id": "cuid...",
    "revenueId": "cuid...",
    "action": "LOCK_KT",
    "changes": { "tier": "KT", ... },
    "userId": "cuid...",
    "userName": "Admin User",
    "createdAt": "2026-01-08T14:30:00Z"
  }
]
```

---

## Database Changes Summary

### RevenueHistory Table

| Field | Type | Description |
|-------|------|-------------|
| id | cuid | Primary key |
| revenueId | String | FK to Revenue |
| action | String | CREATE, UPDATE, LOCK_*, UNLOCK_* |
| changes | Json | Changed fields |
| userId | String | Who made change |
| createdAt | DateTime | When |

### Revenue Table Additions

| Field | Type | Description |
|-------|------|-------------|
| lockKT | Boolean | Tier 1 lock |
| lockKTAt | DateTime? | When tier 1 locked |
| lockKTBy | String? | Who locked tier 1 |
| lockAdmin | Boolean | Tier 2 lock |
| lockAdminAt | DateTime? | When tier 2 locked |
| lockAdminBy | String? | Who locked tier 2 |
| lockFinal | Boolean | Tier 3 lock |
| lockFinalAt | DateTime? | When tier 3 locked |
| lockFinalBy | String? | Who locked tier 3 |
