# Phase 03: Revenue Creation & History Endpoint

## Context Links
- [Main Plan](./plan.md)
- [Phase 01: Revenue History Utility](./phase-01-revenue-history-utility.md)
- [Phase 02: Lock/Unlock Endpoints](./phase-02-lock-unlock-endpoints.md)
- Related: `src/lib/id-utils.ts`

## Overview

Update revenue creation to generate revenueId and create initial history entry. Add new GET endpoint for history retrieval.

## Requirements

### Revenue Creation Update
1. Get bookingCode from linked Request
2. Generate revenueId using `generateRevenueId(bookingCode)`
3. Create CREATE history entry after successful creation

### History Endpoint (NEW)
1. GET `/api/revenues/[id]/history` - Return history with user names
2. Require `revenue:view` permission
3. Return sorted by createdAt desc

## Related Files

| File | Purpose |
|------|---------|
| `src/app/api/revenues/route.ts` | Revenue POST endpoint |
| `src/lib/id-utils.ts` | generateRevenueId function |
| `src/lib/revenue-history.ts` | History utility (Phase 01) |
| `src/config/lock-config.ts` | Action labels for UI |

## Current Revenue Creation Analysis

```typescript
// Current: No revenueId generation, no history
const revenue = await prisma.revenue.create({
  data: {
    requestId: body.requestId,
    paymentDate: new Date(body.paymentDate),
    // ... other fields
    userId: session.user.id,
  },
});
```

## Implementation Steps

### 1. Update Revenue POST (route.ts)

```typescript
// File: src/app/api/revenues/route.ts

// Add imports
import { generateRevenueId } from '@/lib/id-utils';
import { createRevenueHistory, REVENUE_HISTORY_ACTIONS } from '@/lib/revenue-history';

// In POST handler, after request validation...

// Get bookingCode from request
const req = await prisma.request.findUnique({
  where: { id: body.requestId },
  select: { bookingCode: true }, // Already fetching request, add bookingCode
});

if (!req) {
  return NextResponse.json({ success: false, error: 'Yeu cau khong ton tai' }, { status: 404 });
}

// Generate revenueId
const revenueId = await generateRevenueId(req.bookingCode || body.requestId);

// Create revenue with revenueId
const revenue = await prisma.revenue.create({
  data: {
    revenueId, // Add this
    requestId: body.requestId,
    paymentDate: new Date(body.paymentDate),
    paymentType: body.paymentType,
    foreignAmount,
    currency,
    exchangeRate,
    amountVND,
    paymentSource: body.paymentSource,
    notes: body.notes?.trim() || null,
    userId: session.user.id,
  },
  include: {
    request: { select: { code: true, customerName: true, bookingCode: true } },
    user: { select: { id: true, name: true } },
  },
});

// Create history entry
await createRevenueHistory({
  revenueId: revenue.id,
  action: REVENUE_HISTORY_ACTIONS.CREATE,
  changes: {
    revenueId: { after: revenueId },
    amountVND: { after: amountVND },
    paymentType: { after: body.paymentType },
    paymentSource: { after: body.paymentSource },
  },
  userId: session.user.id,
});

return NextResponse.json({ success: true, data: revenue }, { status: 201 });
```

### 2. Create History Endpoint (NEW FILE)

```typescript
// File: src/app/api/revenues/[id]/history/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { getRevenueHistory } from '@/lib/revenue-history';

// GET /api/revenues/[id]/history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chua dang nhap' },
        { status: 401 }
      );
    }

    // Permission check
    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Khong co quyen xem lich su' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get history with user names
    const history = await getRevenueHistory(id);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching revenue history:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tai lich su: ${message}` },
      { status: 500 }
    );
  }
}
```

## Todo List

### Revenue Creation
- [x] Import generateRevenueId from id-utils
- [x] Import createRevenueHistory from revenue-history
- [x] Add bookingCode to request select
- [x] Generate revenueId before creation
- [x] Include revenueId in create data
- [x] Add createRevenueHistory call after creation

### History Endpoint
- [x] Create `src/app/api/revenues/[id]/history/route.ts`
- [x] Add auth check
- [x] Add revenue:view permission check
- [x] Call getRevenueHistory utility
- [x] Return consistent response format

## Success Criteria

1. New revenues have auto-generated revenueId
2. revenueId format: `{bookingCode}-{yyyyMMddHHmmss}-{rowNum}`
3. CREATE history entry saved with initial field values
4. History endpoint returns entries with userName
5. History sorted by createdAt descending
6. Proper error handling for missing revenue

## Status

**COMPLETED** - 2026-01-08T16:40:00Z
- Revenue creation endpoint updated with revenueId generation
- History endpoint created and functional
- All error handling implemented

## API Response Format

### History Endpoint Response
```json
{
  "success": true,
  "data": [
    {
      "id": "clxyz...",
      "revenueId": "rev123",
      "action": "CREATE",
      "changes": { "amountVND": { "after": 5000000 } },
      "userId": "user123",
      "userName": "Nguyen Van A",
      "createdAt": "2026-01-08T16:00:00Z"
    },
    {
      "id": "clxyz...",
      "revenueId": "rev123",
      "action": "LOCK_KT",
      "changes": { "KT": { "before": false, "after": true } },
      "userId": "user456",
      "userName": "Tran Thi B",
      "createdAt": "2026-01-08T17:00:00Z"
    }
  ]
}
```
