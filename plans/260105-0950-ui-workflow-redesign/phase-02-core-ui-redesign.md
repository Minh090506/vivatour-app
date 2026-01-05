# Phase 2: Core UI Redesign

## Context

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-foundation-auth-layout.md) (Auth + Layout components)
- Research: [UI Patterns Report](./research/researcher-ui-patterns-report.md)

## Overview

| Field | Value |
|-------|-------|
| Description | Redesign Request/Operator/Revenue modules with Master-Detail, implement claim mechanism |
| Priority | P1 |
| Status | Pending |
| Review | Not started |

## Key Insights from Research

1. **Key prop reset**: Always add `key={selectedId}` to detail panel to reset state
2. **URL sync**: Store selectedId in URL params for bookmarking
3. **Virtualization**: Only needed for 100+ items (not required initially)
4. **Tabs in detail**: Use shadcn Tabs for Info/Timeline/Services sections

## Requirements

### R1: Request Module Redesign
- MasterDetailLayout with list (40%) + detail (60%)
- List columns: RQID, Customer, Country, Status, Stage, Next Follow-up, Seller
- Detail tabs: Info, Timeline, Services (read-only), Revenue (read-only)
- Actions: Change Status, Add Note, Set Follow-up, Convert to Booking

### R2: Booking Conversion Validation
When Seller changes status to BOOKING, **require complete validation**:
- `startDate` - Tour start date (required)
- `tourDays` - Number of days (required, min 1)
- `pax` - Number of passengers (required, min 1)
- `bookingDate` - Auto-set to status change timestamp
- `expectedRevenue` - Expected revenue amount (required)
- `expectedCost` - Expected cost amount (required)
- All other Request fields must be filled before conversion

### R3: Booking Claim Mechanism
- Schema: Add claimedById, claimedAt to Request
- API: POST /api/requests/[id]/claim with optimistic locking
- UI: "Claim" button visible only to OPERATOR role on unclaimed BOOKING requests
- Prevent race condition with DB transaction
- Conflict UX: Toast error "Booking đã được nhận" (no modal)

### R4: Operator Module Redesign
- List columns: BookingCode, Customer, Date Range, Total Cost, Payment Status, Claimed By
- Detail tabs: Booking Info, Services (CRUD), Payments, History
- Filter by: Claimed (mine/all), Payment Status, Date range
- Actions: Claim, Add Service, Submit for Approval

### R5: Revenue Module Basic
- List columns: BookingCode, Customer, Date, Amount, Currency, Source, Status
- Detail: Payment info, linked booking summary
- CRUD for Accountant role only

## Architecture Decisions

### AD1: Request List Performance
- Initial load: No virtualization (typical <100 items per seller)
- Add virtualization later if needed (react-window)
- Pagination: Server-side, 50 per page

### AD2: Claim Mechanism
```typescript
// Optimistic locking pattern
async function claimRequest(requestId: string, userId: string) {
  return prisma.request.update({
    where: {
      id: requestId,
      claimedById: null,  // Only if unclaimed
      status: 'BOOKING'   // Only BOOKING status
    },
    data: {
      claimedById: userId,
      claimedAt: new Date()
    }
  });
}
```

### AD3: Module-specific Detail Panels
Each module has its own DetailPanel component:
- `RequestDetailPanel` - existing, refactor
- `OperatorDetailPanel` - new
- `RevenueDetailPanel` - new

## Related Code Files

**Existing (to refactor):**
- `src/app/(dashboard)/requests/page.tsx` - Use MasterDetailLayout
- `src/components/requests/request-list-panel.tsx` - Enhance columns
- `src/components/requests/request-detail-panel.tsx` - Add tabs structure
- `src/components/requests/request-services-table.tsx` - Read-only for seller

**New files:**
- `src/app/(dashboard)/operators/page.tsx` - Operator module page
- `src/components/operators/operator-detail-panel.tsx` - Detail with tabs
- `src/components/operators/operator-list-panel.tsx` - List panel
- `src/components/operators/claim-button.tsx` - Claim action
- `src/app/(dashboard)/revenue/page.tsx` - Revenue module
- `src/components/revenue/revenue-list-panel.tsx`
- `src/components/revenue/revenue-detail-panel.tsx`
- `src/app/api/requests/[id]/claim/route.ts` - Claim API

## Implementation Steps

### Step 1: Schema Migration
```prisma
model Request {
  // ... existing
  claimedById     String?
  claimedBy       User?     @relation("ClaimedRequests", fields: [claimedById], references: [id])
  claimedAt       DateTime?
}

model User {
  // ... existing
  claimedRequests Request[] @relation("ClaimedRequests")
}
```
```bash
npx prisma migrate dev --name add_claim_fields
```

### Step 2: Claim API Endpoint
Create `src/app/api/requests/[id]/claim/route.ts`:
```typescript
export async function POST(req, { params }) {
  const session = await auth();
  if (session?.user?.role !== 'Operator') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const request = await prisma.request.update({
      where: {
        id: params.id,
        claimedById: null,
        status: 'BOOKING'
      },
      data: {
        claimedById: session.user.id,
        claimedAt: new Date()
      }
    });
    return Response.json({ success: true, data: request });
  } catch (e) {
    return Response.json({ error: 'Already claimed' }, { status: 409 });
  }
}
```

### Step 3: Refactor Request Page
Update `src/app/(dashboard)/requests/page.tsx`:
- Import MasterDetailLayout from Phase 1
- Replace flex layout with MasterDetailLayout
- Pass selectedId via URL param
- Add key prop to detail panel

### Step 4: Enhance Request List Panel
Update `src/components/requests/request-list-panel.tsx`:
- Add columns: Stage, Next Follow-up (highlight overdue), Seller avatar
- Highlight row when overdue
- Sort by nextFollowUp by default

### Step 5: Add Tabs to Request Detail
Update `src/components/requests/request-detail-panel.tsx`:
```typescript
<Tabs defaultValue="info">
  <TabsList>
    <TabsTrigger value="info">Thông tin</TabsTrigger>
    <TabsTrigger value="timeline">Timeline</TabsTrigger>
    <TabsTrigger value="services">Dịch vụ</TabsTrigger>
    <TabsTrigger value="revenue">Thanh toán</TabsTrigger>
  </TabsList>
  <TabsContent value="info">...</TabsContent>
  // ...
</Tabs>
```

### Step 6: Create Operator Module Page
Create `src/app/(dashboard)/operators/page.tsx`:
- MasterDetailLayout structure
- Filter: My Claims / All (for Admin)
- List of BOOKING requests with claim status

### Step 7: Create Operator List Panel
Create `src/components/operators/operator-list-panel.tsx`:
- Columns: BookingCode, Customer, Date Range, Cost, Status, Claimed By
- Filter controls: My/All, Payment Status, Date
- Unclaimed items highlighted

### Step 8: Create Claim Button
Create `src/components/operators/claim-button.tsx`:
```typescript
export function ClaimButton({ requestId, onClaimed }) {
  const { can } = usePermission();
  if (!can('operator:claim')) return null;

  async function handleClaim() {
    const res = await fetch(`/api/requests/${requestId}/claim`, { method: 'POST' });
    if (res.ok) {
      toast.success('Đã nhận booking');
      onClaimed();
    } else {
      toast.error('Booking đã được nhận');
    }
  }

  return <Button onClick={handleClaim}>Nhận Booking</Button>;
}
```

### Step 9: Create Operator Detail Panel
Create `src/components/operators/operator-detail-panel.tsx`:
- Tabs: Booking Info, Services, Payments, History
- Services tab: CRUD service items (use existing operator-form)
- Show claim status and claimed by

### Step 10: Create Revenue Module
Create `src/app/(dashboard)/revenue/page.tsx`:
- MasterDetailLayout
- Accountant-only actions

Create list and detail panels:
- `src/components/revenue/revenue-list-panel.tsx`
- `src/components/revenue/revenue-detail-panel.tsx`

### Step 11: Update Navigation
Update `src/components/layout/Header.tsx`:
- Add Operators link (visible to Admin, Operator, Accountant)
- Add Revenue link (visible to Admin, Accountant)
- Use usePermission to conditionally render

### Step 12: Integration Testing
- Test request selection updates URL
- Test claim prevents double-claim
- Test role-based visibility

## Todo List

- [ ] Add claimedById, claimedAt to schema
- [ ] Run prisma migrate
- [ ] Create claim API endpoint
- [ ] Refactor requests page to MasterDetailLayout
- [ ] Add tabs to request detail panel
- [ ] Create operator module page
- [ ] Create operator list panel
- [ ] Create claim button component
- [ ] Create operator detail panel
- [ ] Create revenue module page
- [ ] Create revenue panels
- [ ] Update Header navigation
- [ ] Test claim race condition handling
- [ ] Test role-based UI visibility

## Success Criteria

- [ ] Requests page uses MasterDetailLayout
- [ ] Detail panel has 4 tabs
- [ ] URL reflects selected request
- [ ] Operator can claim unclaimed BOOKING
- [ ] Double-claim returns 409 conflict
- [ ] Claimed requests show claimed by info
- [ ] Revenue module accessible to Accountant
- [ ] Navigation reflects user role

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing request flow | High | Feature flag, gradual rollout |
| Claim race condition | Medium | DB-level optimistic locking |
| Performance with many services | Low | Paginate services list |

## Security Considerations

- Claim API checks role before action
- Users cannot unclaim others' bookings
- Services edit restricted to claimed operator
- Revenue edit restricted to Accountant

## Next Steps

After Phase 2:
1. Proceed to [Phase 3](./phase-03-accounting-admin.md)
2. Add Expense module for Accountant
3. Implement Dashboard KPIs
