# Phase 2: API Endpoints

## Context
- **Plan:** [plan.md](./plan.md)
- **Phase 1:** [phase-01-schemas-utils.md](./phase-01-schemas-utils.md)
- **Research:** [researcher-02-data-models.md](./research/researcher-02-data-models.md)

## Overview
- **Date:** 2026-01-09
- **Status:** completed
- **Completed:** 2026-01-09
- **Effort:** 2h

## Requirements

4 API endpoints with:
- Auth check (session required)
- Permission check (ADMIN/ACCOUNTANT via `revenue:view`)
- Zod validation for query params
- Prisma aggregation queries
- Vietnamese error messages

---

## Shared Auth Pattern

Use in all routes:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema, extractReportZodErrors } from '@/lib/validations/report-validation';
import { getDateRange } from '@/lib/report-utils';

// Auth helper - extract to avoid duplication
async function checkReportAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Chua dang nhap', status: 401 };
  }
  const role = session.user.role as Role;
  if (!hasPermission(role, 'revenue:view')) {
    return { error: 'Khong co quyen xem bao cao', status: 403 };
  }
  return { session, role };
}
```

---

## Step 1: Dashboard KPI Endpoint

**File:** `src/app/api/reports/dashboard/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import {
  getDateRange,
  getComparisonRange,
  calcChangePercent,
  type DashboardResponse
} from '@/lib/report-utils';

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') || 'thisMonth';
    const validation = reportQuerySchema.safeParse({ range: rangeParam });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Khoang thoi gian khong hop le' },
        { status: 400 }
      );
    }

    const { range } = validation.data;
    const dateRange = getDateRange(range);
    const compRange = getComparisonRange(range);

    // Parallel queries for current period
    const [bookingCount, revenueSum, costSum, activeRequests, leadCount] = await Promise.all([
      // Total bookings (requests with bookingCode)
      prisma.request.count({
        where: {
          bookingCode: { not: null },
          startDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        }
      }),
      // Total revenue
      prisma.revenue.aggregate({
        where: {
          paymentDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        _sum: { amountVND: true }
      }),
      // Total cost
      prisma.operator.aggregate({
        where: {
          isArchived: false,
          serviceDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        _sum: { totalCost: true }
      }),
      // Active requests (LEAD or QUOTE stage)
      prisma.request.count({
        where: {
          stage: { in: ['LEAD', 'QUOTE'] }
        }
      }),
      // Total leads for conversion rate
      prisma.request.count({
        where: {
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate }
        }
      })
    ]);

    // Comparison period queries
    const [prevBookings, prevRevenue] = await Promise.all([
      prisma.request.count({
        where: {
          bookingCode: { not: null },
          startDate: { gte: compRange.startDate, lte: compRange.endDate }
        }
      }),
      prisma.revenue.aggregate({
        where: {
          paymentDate: { gte: compRange.startDate, lte: compRange.endDate }
        },
        _sum: { amountVND: true }
      })
    ]);

    const totalRevenue = Number(revenueSum._sum.amountVND || 0);
    const totalCost = Number(costSum._sum.totalCost || 0);
    const prevRevenueVal = Number(prevRevenue._sum.amountVND || 0);
    const conversionRate = leadCount > 0
      ? Math.round((bookingCount / leadCount) * 10000) / 100
      : 0;

    const data: DashboardResponse = {
      kpiCards: {
        totalBookings: bookingCount,
        totalRevenue,
        totalProfit: totalRevenue - totalCost,
        activeRequests,
        conversionRate
      },
      comparison: {
        bookings: {
          current: bookingCount,
          previous: prevBookings,
          changePercent: calcChangePercent(bookingCount, prevBookings)
        },
        revenue: {
          current: totalRevenue,
          previous: prevRevenueVal,
          changePercent: calcChangePercent(totalRevenue, prevRevenueVal)
        }
      },
      dateRange
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error generating dashboard:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Step 2: Revenue Trend Endpoint

**File:** `src/app/api/reports/revenue-trend/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import {
  getDateRange,
  formatPeriodKey,
  type RevenueTrendResponse,
  type TrendDataPoint
} from '@/lib/report-utils';

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') || 'thisMonth';
    const validation = reportQuerySchema.safeParse({ range: rangeParam });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Khoang thoi gian khong hop le' },
        { status: 400 }
      );
    }

    const { range } = validation.data;
    const dateRange = getDateRange(range);

    // Fetch revenues and costs
    const [revenues, costs] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          paymentDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        select: { paymentDate: true, amountVND: true }
      }),
      prisma.operator.findMany({
        where: {
          isArchived: false,
          serviceDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        select: { serviceDate: true, totalCost: true }
      })
    ]);

    // Group by month
    const revenueByMonth = new Map<string, number>();
    const costByMonth = new Map<string, number>();

    for (const rev of revenues) {
      const key = formatPeriodKey(rev.paymentDate);
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(rev.amountVND));
    }

    for (const op of costs) {
      const key = formatPeriodKey(op.serviceDate);
      costByMonth.set(key, (costByMonth.get(key) || 0) + Number(op.totalCost));
    }

    // Merge periods and sort
    const periods = new Set([...revenueByMonth.keys(), ...costByMonth.keys()]);
    const data: TrendDataPoint[] = Array.from(periods)
      .sort()
      .map(period => {
        const revenue = revenueByMonth.get(period) || 0;
        const cost = costByMonth.get(period) || 0;
        return {
          period,
          revenue,
          cost,
          profit: revenue - cost
        };
      });

    // Calculate summary
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalCost = data.reduce((sum, d) => sum + d.cost, 0);

    const response: RevenueTrendResponse = {
      data,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        avgMonthly: data.length > 0 ? Math.round(totalRevenue / data.length) : 0
      },
      dateRange
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error generating revenue trend:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao xu huong: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Step 3: Cost Breakdown Endpoint

**File:** `src/app/api/reports/cost-breakdown/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import { getDateRange, type CostBreakdownResponse } from '@/lib/report-utils';

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') || 'thisMonth';
    const validation = reportQuerySchema.safeParse({ range: rangeParam });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Khoang thoi gian khong hop le' },
        { status: 400 }
      );
    }

    const { range } = validation.data;
    const dateRange = getDateRange(range);

    // Query operators grouped by service type
    const operators = await prisma.operator.findMany({
      where: {
        isArchived: false,
        serviceDate: { gte: dateRange.startDate, lte: dateRange.endDate }
      },
      select: {
        serviceType: true,
        totalCost: true,
        paymentStatus: true
      }
    });

    // Group by service type
    const typeMap = new Map<string, number>();
    let totalCost = 0;
    let paid = 0;
    let partial = 0;
    let unpaid = 0;

    for (const op of operators) {
      const cost = Number(op.totalCost);
      totalCost += cost;
      typeMap.set(op.serviceType, (typeMap.get(op.serviceType) || 0) + cost);

      // Payment status aggregation
      switch (op.paymentStatus) {
        case 'PAID':
          paid += cost;
          break;
        case 'PARTIAL':
          partial += cost;
          break;
        default:
          unpaid += cost;
      }
    }

    // Format by service type with percentage
    const byServiceType = Array.from(typeMap.entries())
      .map(([type, amount]) => ({
        type,
        amount,
        percentage: totalCost > 0 ? Math.round((amount / totalCost) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const response: CostBreakdownResponse = {
      byServiceType,
      paymentStatus: { paid, partial, unpaid },
      dateRange
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error generating cost breakdown:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao chi phi: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Step 4: Sales Funnel Endpoint

**File:** `src/app/api/reports/funnel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import { getDateRange, type FunnelResponse } from '@/lib/report-utils';

// Stage order for funnel display
const STAGE_ORDER = ['LEAD', 'QUOTE', 'FOLLOWUP', 'OUTCOME'];

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') || 'thisMonth';
    const validation = reportQuerySchema.safeParse({ range: rangeParam });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Khoang thoi gian khong hop le' },
        { status: 400 }
      );
    }

    const { range } = validation.data;
    const dateRange = getDateRange(range);

    // Count by stage using groupBy
    const stageCounts = await prisma.request.groupBy({
      by: ['stage'],
      where: {
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate }
      },
      _count: { id: true }
    });

    // Also count converted bookings (requests with bookingCode)
    const convertedCount = await prisma.request.count({
      where: {
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        bookingCode: { not: null }
      }
    });

    // Build stage map
    const stageMap = new Map<string, number>();
    let totalRequests = 0;

    for (const item of stageCounts) {
      stageMap.set(item.stage, item._count.id);
      totalRequests += item._count.id;
    }

    // Format stages in order
    const stages = STAGE_ORDER.map(stage => ({
      stage,
      count: stageMap.get(stage) || 0,
      percentage: totalRequests > 0
        ? Math.round(((stageMap.get(stage) || 0) / totalRequests) * 10000) / 100
        : 0
    }));

    // Conversion rate: bookings / total leads
    const leadCount = stageMap.get('LEAD') || 0;
    const conversionRate = totalRequests > 0
      ? Math.round((convertedCount / totalRequests) * 10000) / 100
      : 0;

    const response: FunnelResponse = {
      stages,
      conversionRate,
      dateRange
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error generating funnel report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao pheu ban hang: ${message}` },
      { status: 500 }
    );
  }
}
```

---

## Success Criteria

- [x] All 4 endpoints return `{ success: true, data: {...} }`
- [x] Unauthenticated requests get 401
- [x] Non-ADMIN/ACCOUNTANT users get 403
- [x] Invalid range param returns 400
- [x] Data matches expected response structure
- [x] Comparison metrics calculated correctly

## Testing

```bash
# Dashboard
curl -X GET "http://localhost:3000/api/reports/dashboard?range=thisMonth" -H "Cookie: ..."

# Revenue trend
curl -X GET "http://localhost:3000/api/reports/revenue-trend?range=last3Months" -H "Cookie: ..."

# Cost breakdown
curl -X GET "http://localhost:3000/api/reports/cost-breakdown?range=thisYear" -H "Cookie: ..."

# Funnel
curl -X GET "http://localhost:3000/api/reports/funnel?range=thisMonth" -H "Cookie: ..."
```

## Next Steps

After completing this phase:
1. Test all endpoints manually
2. Add unit tests if required
3. Connect to dashboard UI (Phase 07.2)
