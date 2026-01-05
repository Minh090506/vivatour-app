# Phase 3: Accounting & Admin Features

## Context

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 2](./phase-02-core-ui-redesign.md) (Core UI)
- Brainstorm: [Requirements](../reports/brainstorm-260105-0950-ui-workflow-redesign.md)

## Overview

| Field | Value |
|-------|-------|
| Description | Expense module CRUD, Supabase Storage for attachments, Dashboard KPIs, Seller performance |
| Priority | P2 |
| Status | Pending |
| Review | Not started |

## Key Insights

1. **Expense separate from Operator**: Clear separation of concerns, no overlap
2. **Approval workflow**: Pending → Approved/Rejected by Accountant
3. **Attachments**: Receipts/invoices stored in Supabase Storage
4. **Dashboard**: Real-time KPIs for Admin, filtered view for others

## Requirements

### R1: Expense Module
- Categories: SALARY, OFFICE, MARKETING, TRAVEL, OTHER
- Fields: category, description, amount, date, attachments
- Workflow: Accountant self-manages (no approval needed)
- Access: Accountant CRUD, Admin view all

### R2: File Attachments
- Supabase Storage bucket: `vivatour-attachments`
- Max file size: 5MB
- Allowed types: PDF, JPG, PNG
- Public URLs for receipts display

### R3: Dashboard KPIs
- Total requests by stage (funnel)
- Revenue this month vs last month
- Pending payments count
- Overdue follow-ups count
- Conversion rate (LEAD → BOOKING)

### R4: Seller Performance Stats
- Requests created this month
- Conversion rate per seller
- Average response time
- Revenue attributed

## Architecture Decisions

### AD1: Expense Schema
```prisma
model Expense {
  id          String   @id @default(cuid())
  category    String   // SALARY, OFFICE, MARKETING, TRAVEL, OTHER
  description String
  amount      Decimal  @db.Decimal(15, 0)
  expenseDate DateTime

  attachments  String[] // Supabase Storage URLs

  createdById  String
  createdBy    User     @relation("CreatedExpenses", fields: [createdById], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([category])
  @@index([expenseDate])
  @@map("expenses")
}
```

### AD2: Supabase Storage Integration
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadAttachment(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from('vivatour-attachments')
    .upload(path, file);
  return { data, error };
}
```

### AD3: KPI API Response Structure
```typescript
interface DashboardKPIs {
  requestFunnel: { stage: string; count: number }[];
  revenueComparison: {
    thisMonth: number;
    lastMonth: number;
    change: number; // percentage
  };
  pendingPayments: number;
  overdueFollowUps: number;
  conversionRate: number; // percentage LEAD→BOOKING
}
```

## Related Code Files

**New files:**
- `prisma/schema.prisma` - Add Expense model
- `src/lib/supabase.ts` - Supabase client
- `src/app/(dashboard)/expenses/page.tsx` - Expense module
- `src/components/expenses/expense-list-panel.tsx`
- `src/components/expenses/expense-detail-panel.tsx`
- `src/components/expenses/expense-form.tsx`
- `src/components/expenses/attachment-upload.tsx`
- `src/app/api/expenses/route.ts` - CRUD
- `src/app/api/expenses/[id]/route.ts`
- `src/app/api/dashboard/kpis/route.ts`
- `src/app/api/dashboard/seller-performance/route.ts`
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard redesign
- `src/components/dashboard/kpi-cards.tsx`
- `src/components/dashboard/request-funnel.tsx`
- `src/components/dashboard/seller-performance-table.tsx`

## Implementation Steps

### Step 1: Expense Schema Migration
Add Expense model to `prisma/schema.prisma`:
```prisma
model User {
  // ... existing
  createdExpenses  Expense[] @relation("CreatedExpenses")
}

model Expense {
  // ... as defined above (no approval fields)
}
```
```bash
npx prisma migrate dev --name add_expense_model
```

### Step 2: Supabase Setup
1. Create Supabase project (if not exists)
2. Create bucket `vivatour-attachments`
3. Set bucket policy: authenticated upload, public read
4. Add env vars:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Step 3: Supabase Client
Create `src/lib/supabase.ts`:
- Initialize client
- Export upload/delete functions
- Generate public URLs

### Step 4: Expense API Endpoints
Create `src/app/api/expenses/route.ts`:
```typescript
// GET - List expenses (with filters)
// POST - Create expense (Accountant only)
```

Create `src/app/api/expenses/[id]/route.ts`:
```typescript
// GET - Single expense
// PUT - Update expense (Accountant only)
// DELETE - Delete expense (Accountant only)
```

### Step 5: Attachment Upload Component
Create `src/components/expenses/attachment-upload.tsx`:
- Drag & drop zone
- File type validation (PDF, JPG, PNG)
- Size limit check (5MB)
- Upload to Supabase on selection
- Display uploaded files with delete option

### Step 6: Expense Module UI
Create expense page and components:
- `expense-list-panel.tsx` - List with filters
- `expense-detail-panel.tsx` - Detail view with tabs
- `expense-form.tsx` - Create/Edit form with attachment upload

### Step 7: Dashboard KPIs API
Create `src/app/api/dashboard/kpis/route.ts`:
```typescript
export async function GET() {
  const [funnel, revenue, pending, overdue, conversion] = await Promise.all([
    getRequestFunnel(),
    getRevenueComparison(),
    getPendingPaymentsCount(),
    getOverdueFollowUpsCount(),
    getConversionRate()
  ]);

  return Response.json({
    success: true,
    data: { requestFunnel: funnel, revenueComparison: revenue, ... }
  });
}
```

### Step 8: Seller Performance API
Create `src/app/api/dashboard/seller-performance/route.ts`:
```typescript
export async function GET() {
  const sellers = await prisma.user.findMany({
    where: { role: 'SELLER' },
    include: {
      requests: {
        where: { createdAt: { gte: startOfMonth } }
      }
    }
  });

  const performance = sellers.map(seller => ({
    id: seller.id,
    name: seller.name,
    requestsThisMonth: seller.requests.length,
    conversionRate: calculateConversion(seller.requests),
    revenue: calculateRevenue(seller.requests)
  }));

  return Response.json({ success: true, data: performance });
}
```

### Step 9: Dashboard UI Components
Create dashboard components:
- `kpi-cards.tsx` - 4 KPI cards with icons and trends
- `request-funnel.tsx` - Visual funnel chart (LEAD → QUOTE → FOLLOWUP → BOOKING)
- `seller-performance-table.tsx` - Table with sorting

### Step 10: Dashboard Page Redesign
Update `src/app/(dashboard)/dashboard/page.tsx`:
- KPI cards row
- Request funnel visualization
- Seller performance table (Admin only)
- Recent activity feed

### Step 11: Navigation Update
Update Header for Expense link:
- Visible to Admin, Accountant only
- Badge showing pending expenses count

## Todo List

- [ ] Add Expense model to schema
- [ ] Run prisma migrate
- [ ] Setup Supabase project and bucket
- [ ] Add Supabase env vars
- [ ] Create supabase.ts client
- [ ] Create expense CRUD API endpoints
- [ ] Create attachment upload component
- [ ] Create expense module page
- [ ] Create expense list/detail panels
- [ ] Create expense form
- [ ] Create dashboard KPIs API (Admin only)
- [ ] Create seller performance API
- [ ] Create KPI cards component
- [ ] Create request funnel component
- [ ] Create seller performance table
- [ ] Redesign dashboard page
- [ ] Update navigation for expense link
- [ ] Test file upload/download

## Success Criteria

- [ ] Accountant can CRUD expenses
- [ ] Attachments upload to Supabase
- [ ] Dashboard shows real-time KPIs (Admin only)
- [ ] Seller performance table sortable
- [ ] Request funnel visualizes conversion
- [ ] Expense link visible to authorized roles

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase storage costs | Low | Set file size limits, cleanup old files |
| Dashboard query performance | Medium | Cache KPIs, incremental refresh |
| Complex approval workflow | Medium | Keep simple: single approver |

## Security Considerations

- Expense CRUD restricted by role
- File upload authenticated via Supabase RLS
- Dashboard data filtered by role (Admin sees all, others see own)
- Prevent file type spoofing via server validation

## Next Steps

After Phase 3:
1. Proceed to [Phase 4](./phase-04-ai-basic-features.md)
2. Add follow-up reminder service
3. Implement notification system
4. Deploy knowledge base chat
