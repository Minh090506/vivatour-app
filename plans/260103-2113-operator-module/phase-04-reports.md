# Phase 4: Reports Implementation

**Priority:** P1 (Important)
**Depends On:** Phase 1 complete
**Estimated Tasks:** 8

---

## Overview

Implement comprehensive reporting for Operator module: cost analysis, payment status, and supplier performance integration.

---

## Task Breakdown

### 1. API Routes

#### Task 4.1: Cost analysis report
**File:** `src/app/api/reports/operator-costs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SERVICE_TYPES } from '@/config/operator-config';

// GET /api/reports/operator-costs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const serviceType = searchParams.get('serviceType');
    const supplierId = searchParams.get('supplierId');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (fromDate || toDate) {
      where.serviceDate = {};
      if (fromDate) where.serviceDate.gte = new Date(fromDate);
      if (toDate) where.serviceDate.lte = new Date(toDate);
    }

    if (serviceType) where.serviceType = serviceType;
    if (supplierId) where.supplierId = supplierId;

    // Get all matching operators
    const operators = await prisma.operator.findMany({
      where,
      select: {
        id: true,
        serviceType: true,
        supplierId: true,
        supplier: true,
        serviceDate: true,
        totalCost: true,
        supplierRef: { select: { name: true } },
        request: { select: { code: true } },
      },
    });

    // By service type
    const byServiceType = Object.keys(SERVICE_TYPES).map((type) => {
      const items = operators.filter((op) => op.serviceType === type);
      return {
        type,
        label: SERVICE_TYPES[type as keyof typeof SERVICE_TYPES].label,
        total: items.reduce((sum, op) => sum + Number(op.totalCost), 0),
        count: items.length,
      };
    }).filter((t) => t.count > 0);

    // By supplier
    const supplierMap = new Map<string, { name: string; total: number; count: number }>();
    operators.forEach((op) => {
      const key = op.supplierId || 'no-supplier';
      const name = op.supplierRef?.name || op.supplier || 'Không có NCC';

      if (!supplierMap.has(key)) {
        supplierMap.set(key, { name, total: 0, count: 0 });
      }
      const entry = supplierMap.get(key)!;
      entry.total += Number(op.totalCost);
      entry.count += 1;
    });

    const bySupplier = Array.from(supplierMap.entries())
      .map(([supplierId, data]) => ({
        supplierId: supplierId === 'no-supplier' ? null : supplierId,
        supplierName: data.name,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);

    // By month
    const monthMap = new Map<string, { total: number; count: number }>();
    operators.forEach((op) => {
      const date = new Date(op.serviceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { total: 0, count: 0 });
      }
      const entry = monthMap.get(key)!;
      entry.total += Number(op.totalCost);
      entry.count += 1;
    });

    const byMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Summary
    const totalCost = operators.reduce((sum, op) => sum + Number(op.totalCost), 0);
    const summary = {
      totalCost,
      totalCount: operators.length,
      avgCost: operators.length > 0 ? Math.round(totalCost / operators.length) : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        byServiceType,
        bySupplier,
        byMonth,
        summary,
      },
    });
  } catch (error) {
    console.error('Error generating cost report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo báo cáo: ${message}` },
      { status: 500 }
    );
  }
}
```

#### Task 4.2: Payment status report
**File:** `src/app/api/reports/operator-payments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/reports/operator-payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM for filtering

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Month filter
    let monthStart: Date | undefined;
    let monthEnd: Date | undefined;
    if (month) {
      const [year, m] = month.split('-').map(Number);
      monthStart = new Date(year, m - 1, 1);
      monthEnd = new Date(year, m, 0, 23, 59, 59, 999);
    }

    // Current month for "paid this month"
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Pending payments
    const pendingWhere: Record<string, unknown> = {
      paymentStatus: { in: ['PENDING', 'PARTIAL'] },
    };
    if (monthStart && monthEnd) {
      pendingWhere.serviceDate = { gte: monthStart, lte: monthEnd };
    }

    const pending = await prisma.operator.aggregate({
      where: pendingWhere,
      _count: { id: true },
      _sum: { totalCost: true },
    });

    // Due this week
    const dueThisWeek = await prisma.operator.aggregate({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        paymentDeadline: { gte: today, lt: weekEnd },
      },
      _count: { id: true },
      _sum: { totalCost: true },
    });

    // Overdue
    const overdue = await prisma.operator.aggregate({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        paymentDeadline: { lt: today },
      },
      _count: { id: true },
      _sum: { totalCost: true },
    });

    // Paid this month
    const paidThisMonth = await prisma.operator.aggregate({
      where: {
        paymentStatus: 'PAID',
        paymentDate: { gte: currentMonthStart, lte: currentMonthEnd },
      },
      _count: { id: true },
      _sum: { totalCost: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        pending: {
          count: pending._count.id,
          total: Number(pending._sum.totalCost || 0),
        },
        dueThisWeek: {
          count: dueThisWeek._count.id,
          total: Number(dueThisWeek._sum.totalCost || 0),
        },
        overdue: {
          count: overdue._count.id,
          total: Number(overdue._sum.totalCost || 0),
        },
        paidThisMonth: {
          count: paidThisMonth._count.id,
          total: Number(paidThisMonth._sum.totalCost || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error generating payment report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo báo cáo: ${message}` },
      { status: 500 }
    );
  }
}
```

---

### 2. UI Components

#### Task 4.3: Cost by service type chart
**File:** `src/components/operators/reports/cost-by-service-chart.tsx`

Use simple bar chart or list with progress bars (no chart library needed).

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { CostByServiceType } from '@/types';

interface Props {
  data: CostByServiceType[];
  totalCost: number;
}

export function CostByServiceChart({ data, totalCost }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi phí theo loại dịch vụ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item) => {
          const percentage = totalCost > 0 ? (item.total / totalCost) * 100 : 0;
          return (
            <div key={item.type} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-medium">
                  {formatCurrency(item.total)} ({item.count})
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

#### Task 4.4: Cost by supplier table
**File:** `src/components/operators/reports/cost-by-supplier-table.tsx`

```typescript
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { CostBySupplier } from '@/types';

interface Props {
  data: CostBySupplier[];
}

export function CostBySupplierTable({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi phí theo NCC</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NCC</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead className="text-right">Tổng chi phí</TableHead>
              <TableHead className="text-right">TB/dịch vụ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, i) => (
              <TableRow key={item.supplierId || i}>
                <TableCell>{item.supplierName}</TableCell>
                <TableCell className="text-right">{item.count}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.total)}
                </TableCell>
                <TableCell className="text-right text-gray-500">
                  {formatCurrency(Math.round(item.total / item.count))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

#### Task 4.5: Monthly trend display
**File:** `src/components/operators/reports/monthly-trend.tsx`

Simple month-by-month list with totals.

#### Task 4.6: Payment status cards
**File:** `src/components/operators/reports/payment-status-cards.tsx`

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Clock, AlertTriangle, CalendarCheck, CheckCircle } from 'lucide-react';
import type { PaymentStatusReport } from '@/types';

interface Props {
  data: PaymentStatusReport;
}

export function PaymentStatusCards({ data }: Props) {
  const cards = [
    {
      title: 'Chờ thanh toán',
      count: data.pending.count,
      amount: data.pending.total,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Quá hạn',
      count: data.overdue.count,
      amount: data.overdue.total,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Đến hạn tuần này',
      count: data.dueThisWeek.count,
      amount: data.dueThisWeek.total,
      icon: CalendarCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Đã TT tháng này',
      count: data.paidThisMonth.count,
      amount: data.paidThisMonth.total,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.bg}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold">{card.count}</p>
                <p className={`text-sm font-medium ${card.color}`}>
                  {formatCurrency(card.amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### 3. Pages

#### Task 4.7: Reports dashboard page
**File:** `src/app/(dashboard)/operators/reports/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CostByServiceChart } from '@/components/operators/reports/cost-by-service-chart';
import { CostBySupplierTable } from '@/components/operators/reports/cost-by-supplier-table';
import { MonthlyTrend } from '@/components/operators/reports/monthly-trend';
import { PaymentStatusCards } from '@/components/operators/reports/payment-status-cards';
import { formatCurrency } from '@/lib/utils';
import type { OperatorCostReport, PaymentStatusReport } from '@/types';

export default function OperatorReportsPage() {
  const [costReport, setCostReport] = useState<OperatorCostReport | null>(null);
  const [paymentReport, setPaymentReport] = useState<PaymentStatusReport | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const [costRes, paymentRes] = await Promise.all([
        fetch(`/api/reports/operator-costs?${params}`),
        fetch('/api/reports/operator-payments'),
      ]);

      const [costData, paymentData] = await Promise.all([
        costRes.json(),
        paymentRes.json(),
      ]);

      if (costData.success) setCostReport(costData.data);
      if (paymentData.success) setPaymentReport(paymentData.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Báo Cáo Chi Phí</h1>

      {/* Date filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment status */}
      {paymentReport && <PaymentStatusCards data={paymentReport} />}

      {/* Cost report tabs */}
      {costReport && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Tổng chi phí</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(costReport.summary.totalCost)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Số dịch vụ</p>
                <p className="text-2xl font-bold">{costReport.summary.totalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Chi phí TB/dịch vụ</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(costReport.summary.avgCost)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="service">
            <TabsList>
              <TabsTrigger value="service">Theo loại DV</TabsTrigger>
              <TabsTrigger value="supplier">Theo NCC</TabsTrigger>
              <TabsTrigger value="month">Theo tháng</TabsTrigger>
            </TabsList>

            <TabsContent value="service">
              <CostByServiceChart
                data={costReport.byServiceType}
                totalCost={costReport.summary.totalCost}
              />
            </TabsContent>

            <TabsContent value="supplier">
              <CostBySupplierTable data={costReport.bySupplier} />
            </TabsContent>

            <TabsContent value="month">
              <MonthlyTrend data={costReport.byMonth} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
```

---

### 4. Tests

#### Task 4.8: Report API tests
**File:** `src/__tests__/api/operator-reports.test.ts`

Test:
- Cost report with date filters
- Cost report grouping accuracy
- Payment status calculations
- Empty data handling

---

## Acceptance Criteria

- [x] Cost report shows by service type
- [x] Cost report shows by supplier
- [x] Cost report shows by month
- [x] Date filters work correctly
- [x] Payment status shows pending/overdue/etc
- [x] Summary totals are accurate
- [⚠️] Reports load quickly (< 3s) - **NEEDS FIX: Database aggregation required**
- [x] Empty state handled gracefully

---

## Code Review Status

**Reviewed:** 2026-01-04 09:02
**Status:** ⚠️ **Implementation Complete - Security Issues Found**
**Report:** `plans/reports/code-reviewer-260104-0902-phase4-reports.md`

### Critical Issues Found:
1. ⚠️ **Missing Authentication** - API routes unprotected (OWASP A01:2021)
2. ⚠️ **SQL Injection Risk** - Unvalidated date inputs (OWASP A03:2021)
3. ⚠️ **Unvalidated Query Params** - serviceType/supplierId not validated (OWASP A03:2021)

### High Priority Issues:
4. **Performance** - In-memory aggregation inefficient for large datasets (needs database-level groupBy)
5. **React Re-renders** - Unnecessary API calls from useCallback/useEffect pattern

### Required Actions Before Production:
- [ ] Add authentication/authorization to API routes
- [ ] Validate all query parameters (dates, serviceType, supplierId)
- [ ] Refactor to database-level aggregation using Prisma groupBy
- [ ] Fix React re-render issue in reports page
- [ ] Add error handling UI for failed API calls
- [ ] Implement consistent timezone handling

**Next Steps:** Address critical security issues, then optimize performance
