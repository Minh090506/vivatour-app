---
phase: 2
title: "API Routes"
status: completed
effort: 1d
completed: 2026-01-04
---

# Phase 2: API Routes

## Context

- **Parent Plan:** [plan.md](plan.md)
- **Dependencies:** Phase 1 (Schema & Config)
- **Patterns:** [operator-patterns-report](research/operator-patterns-report.md)

---

## Overview

Update existing request API routes and create config API routes. Implement permission filtering, auto-ID generation, and status transition logic.

---

## Requirements

### 2.1 Update GET /api/requests (route.ts)

Add features:
- Stage filter: `?stage=LEAD`
- Seller permission filter (check ConfigUser.canViewAll)
- Include seller info in response
- Sort by receivedDate desc

```typescript
// Query params
const stage = searchParams.get('stage');
const followup = searchParams.get('followup'); // overdue, today, upcoming

// Permission check
const configUser = await prisma.configUser.findUnique({
  where: { userId: currentUserId }
});
if (!configUser?.canViewAll) {
  where.sellerId = currentUserId;
}

// Follow-up filter
if (followup === 'overdue') {
  where.nextFollowUp = { lt: new Date() };
} else if (followup === 'today') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  where.nextFollowUp = { gte: today, lt: tomorrow };
}
```

### 2.2 Update POST /api/requests (route.ts)

Add logic:
- Auto-generate RQID using generateRQID()
- Set receivedDate = now
- Set stage from status using getStageFromStatus()
- Calculate nextFollowUp if status is F1-F4

```typescript
import { generateRQID, calculateNextFollowUp } from '@/lib/request-utils';
import { getStageFromStatus } from '@/config/request-config';

// In POST handler
const rqid = await generateRQID();
const stage = getStageFromStatus(body.status);

let nextFollowUp = null;
if (['F1', 'F2', 'F3', 'F4'].includes(body.status) && body.lastContactDate) {
  nextFollowUp = await calculateNextFollowUp(body.status, new Date(body.lastContactDate));
}
```

### 2.3 Update PUT /api/requests/[id] (route.ts)

Add logic:
- Update stage when status changes
- Auto-calculate endDate when startDate or tourDays changes
- Recalculate nextFollowUp when status or lastContactDate changes
- Handle BOOKING status transition (Phase 5)

```typescript
// Status change → update stage
if (body.status && body.status !== existing.status) {
  updateData.stage = getStageFromStatus(body.status);

  // Recalc nextFollowUp
  if (['F1', 'F2', 'F3', 'F4'].includes(body.status)) {
    const contactDate = body.lastContactDate || existing.lastContactDate || new Date();
    updateData.nextFollowUp = await calculateNextFollowUp(body.status, new Date(contactDate));
  } else {
    updateData.nextFollowUp = null;
  }
}

// Date calculation
if (body.startDate && (body.tourDays || existing.tourDays)) {
  const days = body.tourDays || existing.tourDays;
  updateData.endDate = calculateEndDate(new Date(body.startDate), days);
}
```

### 2.4 Create GET/POST /api/config/follow-up

```typescript
// GET - List all follow-up configs
export async function GET() {
  const configs = await prisma.configFollowUp.findMany({
    orderBy: { stage: 'asc' }
  });
  return NextResponse.json({ success: true, data: configs });
}

// POST - Create/update config (upsert by stage)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const config = await prisma.configFollowUp.upsert({
    where: { stage: body.stage },
    update: { daysToWait: body.daysToWait, isActive: body.isActive },
    create: { stage: body.stage, daysToWait: body.daysToWait }
  });
  return NextResponse.json({ success: true, data: config });
}
```

### 2.5 Create GET/POST /api/config/user (Admin Only)

```typescript
import { getCurrentUser } from '@/lib/auth'; // Assumes auth helper exists

// GET - List all user configs (admin only)
export async function GET() {
  // Admin-only check
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Chỉ Admin mới có quyền truy cập' },
      { status: 403 }
    );
  }

  const configs = await prisma.configUser.findMany({
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  return NextResponse.json({ success: true, data: configs });
}

// POST - Create/update user config (admin only)
export async function POST(request: NextRequest) {
  // Admin-only check
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Chỉ Admin mới có quyền thực hiện' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const config = await prisma.configUser.upsert({
    where: { userId: body.userId },
    update: { sellerCode: body.sellerCode, canViewAll: body.canViewAll },
    create: { userId: body.userId, sellerCode: body.sellerCode, canViewAll: body.canViewAll ?? false }
  });
  return NextResponse.json({ success: true, data: config });
}
```

---

## Implementation Steps

- [ ] 2.1 Update src/app/api/requests/route.ts GET handler
- [ ] 2.2 Update src/app/api/requests/route.ts POST handler
- [ ] 2.3 Update src/app/api/requests/[id]/route.ts PUT handler
- [ ] 2.4 Create src/app/api/config/follow-up/route.ts
- [ ] 2.5 Create src/app/api/config/user/route.ts
- [ ] 2.6 Test API endpoints with curl/Postman

---

## API Summary

| Endpoint | Method | Changes |
|----------|--------|---------|
| /api/requests | GET | +stage filter, +permission, +followup filter |
| /api/requests | POST | +auto RQID, +stage calc, +nextFollowUp |
| /api/requests/[id] | PUT | +stage update, +endDate calc, +nextFollowUp |
| /api/config/follow-up | GET/POST | New - CRUD for follow-up config |
| /api/config/user | GET/POST | New - CRUD for user config |

---

## Success Criteria

- [ ] GET filters by stage, seller, followup status
- [ ] POST auto-generates RQID
- [ ] PUT updates stage when status changes
- [ ] Config APIs work correctly
- [ ] Build passes

---

## Related Files

| File | Action |
|------|--------|
| src/app/api/requests/route.ts | Modify |
| src/app/api/requests/[id]/route.ts | Modify |
| src/app/api/config/follow-up/route.ts | Create |
| src/app/api/config/user/route.ts | Create |
