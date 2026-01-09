# Phase 1: API Endpoints

**Parent Plan:** [plan.md](./plan.md)
**Dependencies:** None (builds on existing report APIs)

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-09 |
| Priority | P2 |
| Effort | 2h |
| Status | pending |

Create 3 API endpoints for dashboard analytics: dashboard-stats (KPIs with MoM), revenue-trends (monthly aggregation), and conversion-funnel (stage progression).

---

## Key Insights

1. **Existing patterns** in `/api/reports/operator-costs/route.ts`:
   - Date validation with `DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/`
   - Standard response: `{ success: true, data: {...} }`
   - Prisma aggregations with `groupBy` and manual `reduce`

2. **Data sources**:
   - Revenue: `amountVND` field, `paymentDate` for trends
   - Operator: `totalCost`, `serviceType` for cost breakdown
   - Request: `stage` field (LEAD/QUOTE/FOLLOWUP/OUTCOME) for funnel

3. **MoM calculation**: Compare current month vs previous month totals

---

## Requirements

### R1: Dashboard Stats API
- Endpoint: `GET /api/reports/dashboard-stats`
- Returns: 5 KPIs with MoM percentage change
- KPIs: Revenue, Cost, Profit, Bookings Count, Conversion Rate

### R2: Revenue Trends API
- Endpoint: `GET /api/reports/revenue-trends`
- Query params: `months` (default 12)
- Returns: Monthly revenue aggregation array

### R3: Conversion Funnel API
- Endpoint: `GET /api/reports/conversion-funnel`
- Query params: `fromDate`, `toDate` (optional)
- Returns: Count per stage with conversion rates

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Separate endpoints vs combined | Separate allows caching per data type, parallel fetching |
| Server-side MoM calculation | Reduces client complexity, consistent calculation |
| Use existing date validation pattern | DRY principle, proven validation |

---

## Related Code Files

```
src/app/api/reports/operator-costs/route.ts  # Pattern reference
src/app/api/reports/profit/route.ts          # Pattern reference
src/app/api/revenues/sales/route.ts          # Revenue aggregation pattern
src/config/request-config.ts                 # REQUEST_STAGES definition
prisma/schema.prisma                         # Data models
```

---

## Implementation Steps

### Step 1.1: Create Dashboard Stats API

**File:** `src/app/api/reports/dashboard-stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';

// GET /api/reports/dashboard-stats
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chua dang nhap' },
        { status: 401 }
      );
    }

    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Khong co quyen xem bao cao' },
        { status: 403 }
      );
    }

    // Calculate date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Parallel queries for current and previous month
    const [
      currentRevenues,
      prevRevenues,
      currentOperators,
      prevOperators,
      currentBookings,
      prevBookings,
      currentLeads,
      prevLeads,
    ] = await Promise.all([
      // Current month revenue
      prisma.revenue.aggregate({
        where: { paymentDate: { gte: currentMonthStart, lte: currentMonthEnd } },
        _sum: { amountVND: true },
      }),
      // Previous month revenue
      prisma.revenue.aggregate({
        where: { paymentDate: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { amountVND: true },
      }),
      // Current month costs
      prisma.operator.aggregate({
        where: { serviceDate: { gte: currentMonthStart, lte: currentMonthEnd } },
        _sum: { totalCost: true },
      }),
      // Previous month costs
      prisma.operator.aggregate({
        where: { serviceDate: { gte: prevMonthStart, lte: prevMonthEnd } },
        _sum: { totalCost: true },
      }),
      // Current month bookings (OUTCOME stage with BOOKING status)
      prisma.request.count({
        where: {
          stage: 'OUTCOME',
          status: 'BOOKING',
          statusChangedAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      // Previous month bookings
      prisma.request.count({
        where: {
          stage: 'OUTCOME',
          status: 'BOOKING',
          statusChangedAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      // Current month leads (all new requests)
      prisma.request.count({
        where: {
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      // Previous month leads
      prisma.request.count({
        where: {
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
    ]);

    // Calculate values
    const revenue = Number(currentRevenues._sum.amountVND || 0);
    const prevRevenue = Number(prevRevenues._sum.amountVND || 0);
    const cost = Number(currentOperators._sum.totalCost || 0);
    const prevCost = Number(prevOperators._sum.totalCost || 0);
    const profit = revenue - cost;
    const prevProfit = prevRevenue - prevCost;
    const bookings = currentBookings;
    const prevBookingsCount = prevBookings;
    const conversionRate = currentLeads > 0 ? (bookings / currentLeads) * 100 : 0;
    const prevConversionRate = prevLeads > 0 ? (prevBookingsCount / prevLeads) * 100 : 0;

    // Calculate MoM changes
    const calcChange = (current: number, prev: number): number => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 1000) / 10; // 1 decimal
    };

    return NextResponse.json({
      success: true,
      data: {
        revenue: { value: revenue, change: calcChange(revenue, prevRevenue) },
        cost: { value: cost, change: calcChange(cost, prevCost) },
        profit: { value: profit, change: calcChange(profit, prevProfit) },
        bookings: { value: bookings, change: calcChange(bookings, prevBookingsCount) },
        conversionRate: {
          value: Math.round(conversionRate * 10) / 10,
          change: Math.round((conversionRate - prevConversionRate) * 10) / 10,
        },
      },
      period: {
        current: { start: currentMonthStart, end: currentMonthEnd },
        previous: { start: prevMonthStart, end: prevMonthEnd },
      },
    });
  } catch (error) {
    console.error('Error generating dashboard stats:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao dashboard stats: ${message}` },
      { status: 500 }
    );
  }
}
```

### Step 1.2: Create Revenue Trends API

**File:** `src/app/api/reports/revenue-trends/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';

// GET /api/reports/revenue-trends?months=12
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chua dang nhap' },
        { status: 401 }
      );
    }

    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Khong co quyen' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? Math.min(Math.max(parseInt(monthsParam), 3), 24) : 12;

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Get revenues grouped by month
    const revenues = await prisma.revenue.findMany({
      where: { paymentDate: { gte: startDate } },
      select: { paymentDate: true, amountVND: true },
    });

    // Aggregate by month
    const monthlyData = new Map<string, number>();

    // Initialize all months with 0
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, 0);
    }

    // Sum revenues by month
    revenues.forEach((rev) => {
      const date = new Date(rev.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData.has(key)) {
        monthlyData.set(key, monthlyData.get(key)! + Number(rev.amountVND));
      }
    });

    // Convert to array
    const trends = Array.from(monthlyData.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      success: true,
      data: { trends },
    });
  } catch (error) {
    console.error('Error generating revenue trends:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao revenue trends: ${message}` },
      { status: 500 }
    );
  }
}
```

### Step 1.3: Create Conversion Funnel API

**File:** `src/app/api/reports/conversion-funnel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { REQUEST_STAGES } from '@/config/request-config';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// GET /api/reports/conversion-funnel?fromDate=&toDate=
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chua dang nhap' },
        { status: 401 }
      );
    }

    const role = session.user.role as Role;
    if (!hasPermission(role, 'request:view')) {
      return NextResponse.json(
        { success: false, error: 'Khong co quyen' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Validate dates
    if (fromDate && !isValidDate(fromDate)) {
      return NextResponse.json(
        { success: false, error: 'fromDate khong hop le (YYYY-MM-DD)' },
        { status: 400 }
      );
    }
    if (toDate && !isValidDate(toDate)) {
      return NextResponse.json(
        { success: false, error: 'toDate khong hop le (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as Record<string, Date>).gte = new Date(fromDate);
      if (toDate) (where.createdAt as Record<string, Date>).lte = new Date(toDate + 'T23:59:59.999Z');
    }

    // Count by stage
    const stageCounts = await prisma.request.groupBy({
      by: ['stage'],
      where,
      _count: { id: true },
    });

    // Build funnel data with stage order
    const stageOrder = ['LEAD', 'QUOTE', 'FOLLOWUP', 'OUTCOME'];
    const totalRequests = stageCounts.reduce((sum, s) => sum + s._count.id, 0);

    const funnel = stageOrder.map((stage, index) => {
      const found = stageCounts.find((s) => s.stage === stage);
      const count = found?._count.id || 0;
      const stageInfo = REQUEST_STAGES[stage as keyof typeof REQUEST_STAGES];

      // Calculate conversion from previous stage
      const prevCount = index === 0
        ? totalRequests
        : funnel[index - 1]?.count || 0;
      const conversionRate = prevCount > 0
        ? Math.round((count / prevCount) * 1000) / 10
        : 0;

      return {
        stage,
        label: stageInfo?.label || stage,
        count,
        percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 1000) / 10 : 0,
        conversionRate,
      };
    });

    // Count bookings specifically (OUTCOME stage with BOOKING status)
    const bookingCount = await prisma.request.count({
      where: {
        ...where,
        stage: 'OUTCOME',
        status: 'BOOKING',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        funnel,
        totalRequests,
        bookingCount,
        overallConversion: totalRequests > 0
          ? Math.round((bookingCount / totalRequests) * 1000) / 10
          : 0,
      },
    });
  } catch (error) {
    console.error('Error generating conversion funnel:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao conversion funnel: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Type Definitions

**File:** `src/types/reports.ts` (add to existing types)

```typescript
// Dashboard Stats
export interface DashboardStat {
  value: number;
  change: number; // MoM percentage
}

export interface DashboardStatsResponse {
  revenue: DashboardStat;
  cost: DashboardStat;
  profit: DashboardStat;
  bookings: DashboardStat;
  conversionRate: DashboardStat;
}

// Revenue Trends
export interface MonthlyRevenue {
  month: string; // YYYY-MM
  revenue: number;
}

export interface RevenueTrendsResponse {
  trends: MonthlyRevenue[];
}

// Conversion Funnel
export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
  conversionRate: number;
}

export interface ConversionFunnelResponse {
  funnel: FunnelStage[];
  totalRequests: number;
  bookingCount: number;
  overallConversion: number;
}
```

---

## Todo List

- [ ] Create `src/app/api/reports/dashboard-stats/route.ts`
- [ ] Create `src/app/api/reports/revenue-trends/route.ts`
- [ ] Create `src/app/api/reports/conversion-funnel/route.ts`
- [ ] Add type definitions to `src/types/reports.ts`
- [ ] Test each endpoint with curl/Postman
- [ ] Verify MoM calculations with sample data

---

## Success Criteria

- [ ] All 3 endpoints return valid JSON with `{ success: true, data: {...} }`
- [ ] Auth/permission checks work correctly (401/403)
- [ ] Date validation rejects invalid formats
- [ ] MoM change calculations are accurate
- [ ] Empty data returns 0 values (not errors)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large dataset query performance | Medium | Use indexed fields (paymentDate, serviceDate, stage) |
| MoM calculation edge cases | Low | Handle division by zero, negative changes |
| Missing stage data | Low | Initialize all stages with 0 count |

---

## Security Considerations

- Auth required via `auth()` session check
- Permission check via `hasPermission(role, 'revenue:view')`
- Date input validated against regex pattern
- No SQL injection risk (Prisma parameterized queries)

---

## Next Steps

After completing Phase 1:
1. Proceed to [Phase 2: Dashboard & Charts](./phase-02-dashboard-charts.md)
2. Connect chart components to new API endpoints
