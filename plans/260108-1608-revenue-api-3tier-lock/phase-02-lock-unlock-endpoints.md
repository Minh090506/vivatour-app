# Phase 02: Lock/Unlock Endpoints

## Context Links
- [Main Plan](./plan.md)
- [Phase 01: Revenue History Utility](./phase-01-revenue-history-utility.md)
- Related: `src/lib/lock-utils.ts`

## Overview

Update lock/unlock endpoints to support 3-tier system with sequential validation and history tracking.

## Requirements

### Lock Endpoint
1. Accept `tier` body parameter: KT | Admin | Final
2. Use `canLock(role, tier)` for permission check
3. Use `canLockTier(state, tier)` for sequential validation
4. Use `getLockFields(tier, userId, true)` for DB update
5. Create history entry with `LOCK_{tier}` action

### Unlock Endpoint
1. Accept `tier` body parameter: KT | Admin | Final
2. Use `canUnlock(role, tier)` for permission check
3. Use `canUnlockTier(state, tier)` for reverse order validation
4. Use `getLockFields(tier, userId, false)` for DB update
5. Create history entry with `UNLOCK_{tier}` action

## Related Files

| File | Purpose |
|------|---------|
| `src/app/api/revenues/[id]/lock/route.ts` | Current lock endpoint (legacy) |
| `src/app/api/revenues/[id]/unlock/route.ts` | Current unlock endpoint (legacy) |
| `src/lib/lock-utils.ts` | Lock tier utilities |
| `src/lib/revenue-history.ts` | History utility (Phase 01) |

## Current Lock Endpoint Analysis

```typescript
// Current: Uses isLocked flag only
if (revenue.isLocked) {
  return { error: 'Thu nhap da duoc khoa' };
}
await prisma.revenue.update({
  data: { isLocked: true, lockedAt, lockedBy: userId }
});
```

## Implementation Steps

### 1. Update Lock Endpoint

```typescript
// File: src/app/api/revenues/[id]/lock/route.ts

import { canLock, canLockTier, getLockFields, type LockTier, LOCK_TIERS } from '@/lib/lock-utils';
import { createRevenueHistory, REVENUE_HISTORY_ACTIONS } from '@/lib/revenue-history';

export async function POST(request: NextRequest, { params }) {
  // Auth check (existing)...

  const { id } = await params;
  const body = await request.json();
  const tier = body.tier as LockTier;

  // Validate tier
  if (!tier || !LOCK_TIERS.includes(tier)) {
    return NextResponse.json(
      { success: false, error: 'Tier khong hop le. Phai la: KT, Admin, hoac Final' },
      { status: 400 }
    );
  }

  // Permission check
  const role = session.user.role as Role;
  if (!canLock(role, tier)) {
    return NextResponse.json(
      { success: false, error: `Khong co quyen khoa ${tier}` },
      { status: 403 }
    );
  }

  const revenue = await prisma.revenue.findUnique({ where: { id } });
  if (!revenue) {
    return NextResponse.json({ success: false, error: 'Khong tim thay thu nhap' }, { status: 404 });
  }

  // Sequential validation
  const lockState = {
    lockKT: revenue.lockKT,
    lockAdmin: revenue.lockAdmin,
    lockFinal: revenue.lockFinal,
  };

  if (!canLockTier(lockState, tier)) {
    return NextResponse.json(
      { success: false, error: `Khong the khoa ${tier}. Kiem tra thu tu khoa.` },
      { status: 400 }
    );
  }

  // Update with tier-specific fields
  const lockFields = getLockFields(tier, session.user.id, true);
  const updated = await prisma.revenue.update({
    where: { id },
    data: lockFields,
    include: { request: { select: { code: true, customerName: true } } },
  });

  // Create history
  await createRevenueHistory({
    revenueId: id,
    action: `LOCK_${tier.toUpperCase()}` as any,
    changes: { [tier]: { before: false, after: true } },
    userId: session.user.id,
  });

  return NextResponse.json({ success: true, data: updated });
}
```

### 2. Update Unlock Endpoint

```typescript
// File: src/app/api/revenues/[id]/unlock/route.ts

import { canUnlock, canUnlockTier, getLockFields, type LockTier, LOCK_TIERS } from '@/lib/lock-utils';
import { createRevenueHistory } from '@/lib/revenue-history';

export async function POST(request: NextRequest, { params }) {
  // Auth check (existing)...

  const { id } = await params;
  const body = await request.json();
  const tier = body.tier as LockTier;

  // Validate tier
  if (!tier || !LOCK_TIERS.includes(tier)) {
    return NextResponse.json(
      { success: false, error: 'Tier khong hop le. Phai la: KT, Admin, hoac Final' },
      { status: 400 }
    );
  }

  // Permission check
  const role = session.user.role as Role;
  if (!canUnlock(role, tier)) {
    return NextResponse.json(
      { success: false, error: `Khong co quyen mo khoa ${tier}` },
      { status: 403 }
    );
  }

  const revenue = await prisma.revenue.findUnique({ where: { id } });
  if (!revenue) {
    return NextResponse.json({ success: false, error: 'Khong tim thay thu nhap' }, { status: 404 });
  }

  // Reverse order validation
  const lockState = {
    lockKT: revenue.lockKT,
    lockAdmin: revenue.lockAdmin,
    lockFinal: revenue.lockFinal,
  };

  if (!canUnlockTier(lockState, tier)) {
    return NextResponse.json(
      { success: false, error: `Khong the mo khoa ${tier}. Phai mo khoa tier cao hon truoc.` },
      { status: 400 }
    );
  }

  // Update with tier-specific fields
  const lockFields = getLockFields(tier, session.user.id, false);
  const updated = await prisma.revenue.update({
    where: { id },
    data: lockFields,
    include: { request: { select: { code: true, customerName: true } } },
  });

  // Create history
  await createRevenueHistory({
    revenueId: id,
    action: `UNLOCK_${tier.toUpperCase()}` as any,
    changes: { [tier]: { before: true, after: false } },
    userId: session.user.id,
  });

  return NextResponse.json({ success: true, data: updated });
}
```

## Todo List

### Lock Endpoint
- [x] Import lock-utils functions
- [x] Import revenue-history functions
- [x] Add tier parameter validation
- [x] Replace hasPermission with canLock
- [x] Replace isLocked check with canLockTier
- [x] Use getLockFields for DB update
- [x] Add createRevenueHistory call

### Unlock Endpoint
- [x] Import lock-utils functions
- [x] Import revenue-history functions
- [x] Add tier parameter validation
- [x] Replace ADMIN check with canUnlock
- [x] Replace !isLocked check with canUnlockTier
- [x] Use getLockFields for DB update
- [x] Add createRevenueHistory call

## Success Criteria

1. Lock accepts tier parameter, validates KT|Admin|Final
2. Lock KT requires ACCOUNTANT or ADMIN role
3. Lock Admin/Final requires ADMIN role only
4. Lock validates: KT -> Admin -> Final progression
5. Unlock validates: Final -> Admin -> KT order
6. History entries created for each lock/unlock operation
7. API returns consistent success/error response format

## Status

**COMPLETED** - 2026-01-08T16:40:00Z
- Lock/unlock endpoints fully updated with 3-tier support
- Sequential validation implemented
- History tracking integrated
