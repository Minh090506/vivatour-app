# Phase 2: Payment Workflow Implementation

**Priority:** P0 (Must-Have)
**Depends On:** Phase 1 complete
**Estimated Tasks:** 10

---

## Overview

Implement payment approval workflow for Accountant role. Operations staff creates entries, Accountant reviews and approves payments.

---

## Task Breakdown

### 1. API Routes

#### Task 2.1: Pending payments endpoint
**File:** `src/app/api/operators/pending-payments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/operators/pending-payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, today, week, overdue
    const serviceType = searchParams.get('serviceType') || '';
    const supplierId = searchParams.get('supplierId') || '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Build where clause
    const where: Record<string, unknown> = {
      paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      isLocked: false,
    };

    if (filter === 'today') {
      where.paymentDeadline = {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (filter === 'week') {
      where.paymentDeadline = {
        gte: today,
        lt: weekEnd,
      };
    } else if (filter === 'overdue') {
      where.paymentDeadline = { lt: today };
    }

    if (serviceType) where.serviceType = serviceType;
    if (supplierId) where.supplierId = supplierId;

    const operators = await prisma.operator.findMany({
      where,
      include: {
        request: { select: { code: true, customerName: true } },
        supplierRef: { select: { code: true, name: true } },
      },
      orderBy: [
        { paymentDeadline: 'asc' }, // Urgent first
        { serviceDate: 'asc' },
      ],
    });

    // Calculate overdue days for each
    const data = operators.map((op) => {
      let daysOverdue = 0;
      if (op.paymentDeadline) {
        const deadline = new Date(op.paymentDeadline);
        deadline.setHours(0, 0, 0, 0);
        daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (24 * 60 * 60 * 1000));
      }
      return {
        ...op,
        daysOverdue,
        requestCode: op.request?.code,
        customerName: op.request?.customerName,
        supplierName: op.supplierRef?.name || op.supplier,
      };
    });

    // Summary
    const summary = {
      total: data.length,
      totalAmount: data.reduce((sum, op) => sum + Number(op.totalCost), 0),
      overdue: data.filter((op) => op.daysOverdue > 0).length,
      overdueAmount: data
        .filter((op) => op.daysOverdue > 0)
        .reduce((sum, op) => sum + Number(op.totalCost), 0),
      dueToday: data.filter((op) => op.daysOverdue === 0).length,
      dueThisWeek: data.filter((op) => op.daysOverdue <= 0 && op.daysOverdue > -7).length,
    };

    return NextResponse.json({ success: true, data, summary });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách: ${message}` },
      { status: 500 }
    );
  }
}
```

#### Task 2.2: Batch approve endpoint
**File:** `src/app/api/operators/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';

// POST /api/operators/approve - Batch approve
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    if (!body.operatorIds || !Array.isArray(body.operatorIds) || body.operatorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn ít nhất 1 dịch vụ' },
        { status: 400 }
      );
    }

    if (!body.paymentDate) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn ngày thanh toán' },
        { status: 400 }
      );
    }

    const paymentDate = new Date(body.paymentDate);
    const userId = body.userId || 'system';

    // Verify all operators exist and are not locked
    const operators = await prisma.operator.findMany({
      where: {
        id: { in: body.operatorIds },
      },
    });

    if (operators.length !== body.operatorIds.length) {
      return NextResponse.json(
        { success: false, error: 'Một số dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    const lockedOps = operators.filter((op) => op.isLocked);
    if (lockedOps.length > 0) {
      return NextResponse.json(
        { success: false, error: `Có ${lockedOps.length} dịch vụ đã khóa` },
        { status: 403 }
      );
    }

    // Update all in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updates = await Promise.all(
        body.operatorIds.map(async (id: string) => {
          const updated = await tx.operator.update({
            where: { id },
            data: {
              paymentStatus: 'PAID',
              paymentDate,
            },
          });

          // Create history
          await tx.operatorHistory.create({
            data: {
              operatorId: id,
              action: 'APPROVE',
              changes: {
                paymentStatus: { before: 'PENDING', after: 'PAID' },
                paymentDate: { before: null, after: paymentDate },
              },
              userId,
            },
          });

          return updated;
        })
      );

      return updates;
    });

    return NextResponse.json({
      success: true,
      data: {
        count: result.length,
        totalApproved: result.reduce((sum, op) => sum + Number(op.totalCost), 0),
      },
    });
  } catch (error) {
    console.error('Error batch approving:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi duyệt thanh toán: ${message}` },
      { status: 500 }
    );
  }
}
```

#### Task 2.3: Single approve endpoint
**File:** `src/app/api/operators/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';

// POST /api/operators/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const operator = await prisma.operator.findUnique({ where: { id } });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    if (operator.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã khóa' },
        { status: 403 }
      );
    }

    if (operator.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã được thanh toán' },
        { status: 400 }
      );
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const userId = body.userId || 'system';

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        paymentDate,
      },
    });

    await createOperatorHistory({
      operatorId: id,
      action: 'APPROVE',
      changes: {
        paymentStatus: { before: operator.paymentStatus, after: 'PAID' },
        paymentDate: { before: operator.paymentDate, after: paymentDate },
      },
      userId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error approving operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi duyệt: ${message}` },
      { status: 500 }
    );
  }
}
```

---

### 2. UI Components

#### Task 2.4: Approval queue table
**File:** `src/components/operators/operator-approval-table.tsx`

Features:
- Checkbox for batch selection
- Overdue highlighting (red background for overdue)
- Days overdue column
- Quick approve button per row
- Batch approve button in header
- Summary stats (total pending, overdue amount)

```typescript
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ApprovalQueueItem } from '@/types';

interface Props {
  items: ApprovalQueueItem[];
  onApprove: (ids: string[], paymentDate: Date) => Promise<void>;
  loading?: boolean;
}

export function OperatorApprovalTable({ items, onApprove, loading }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const handleBatchApprove = async () => {
    if (selected.size === 0) return;
    setApproving(true);
    try {
      await onApprove(Array.from(selected), new Date());
      setSelected(new Set());
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <span>Đã chọn {selected.size} dịch vụ</span>
          <Button onClick={handleBatchApprove} disabled={approving}>
            {approving ? 'Đang xử lý...' : 'Duyệt tất cả'}
          </Button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selected.size === items.length && items.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>Ngày DV</TableHead>
            <TableHead>Dịch vụ</TableHead>
            <TableHead>NCC</TableHead>
            <TableHead className="text-right">Chi phí</TableHead>
            <TableHead>Hạn TT</TableHead>
            <TableHead className="text-center">Trạng thái</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={item.daysOverdue > 0 ? 'bg-red-50' : ''}
            >
              <TableCell>
                <Checkbox
                  checked={selected.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  disabled={item.isLocked}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{item.requestCode}</div>
                <div className="text-sm text-gray-500">{item.customerName}</div>
              </TableCell>
              <TableCell>{formatDate(item.serviceDate)}</TableCell>
              <TableCell>
                <div>{item.serviceName}</div>
                <div className="text-sm text-gray-500">{item.serviceType}</div>
              </TableCell>
              <TableCell>{item.supplierName || '-'}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.totalCost)}
              </TableCell>
              <TableCell>
                {item.paymentDeadline ? formatDate(item.paymentDeadline) : '-'}
              </TableCell>
              <TableCell className="text-center">
                {item.daysOverdue > 0 ? (
                  <Badge variant="destructive">Quá hạn {item.daysOverdue} ngày</Badge>
                ) : item.daysOverdue === 0 ? (
                  <Badge variant="warning">Hôm nay</Badge>
                ) : (
                  <Badge variant="secondary">Còn {Math.abs(item.daysOverdue)} ngày</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={() => onApprove([item.id], new Date())}
                  disabled={item.isLocked}
                >
                  Duyệt
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### Task 2.5: Approval summary cards
**File:** `src/components/operators/approval-summary-cards.tsx`

Display:
- Total pending (count + amount)
- Overdue (count + amount, red)
- Due today (count)
- Due this week (count)

---

### 3. Pages

#### Task 2.6: Approvals page
**File:** `src/app/(dashboard)/operators/approvals/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperatorApprovalTable } from '@/components/operators/operator-approval-table';
import { ApprovalSummaryCards } from '@/components/operators/approval-summary-cards';
import type { ApprovalQueueItem } from '@/types';

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operators/pending-payments?filter=${filter}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (ids: string[], paymentDate: Date) => {
    try {
      const res = await fetch('/api/operators/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorIds: ids,
          paymentDate: paymentDate.toISOString(),
          userId: 'current-user', // TODO: Get from auth
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã duyệt ${data.data.count} dịch vụ`);
        fetchData(); // Refresh
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi duyệt thanh toán');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Duyệt Thanh Toán</h1>

      <ApprovalSummaryCards summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách chờ duyệt</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="overdue">Quá hạn</TabsTrigger>
              <TabsTrigger value="today">Hôm nay</TabsTrigger>
              <TabsTrigger value="week">Tuần này</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              <OperatorApprovalTable
                items={items}
                onApprove={handleApprove}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 4. Dashboard Badge

#### Task 2.7: Add overdue badge to navigation
**File:** `src/components/layout/header.tsx` (update)

Add badge showing overdue count next to "Duyệt TT" menu item.

```typescript
// Fetch overdue count
const [overdueCount, setOverdueCount] = useState(0);

useEffect(() => {
  fetch('/api/operators/pending-payments?filter=overdue')
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        setOverdueCount(data.data.length);
      }
    });
}, []);

// In navigation
<Link href="/operators/approvals" className="flex items-center gap-2">
  Duyệt TT
  {overdueCount > 0 && (
    <Badge variant="destructive" className="h-5 px-1.5">
      {overdueCount}
    </Badge>
  )}
</Link>
```

---

### 5. Tests

#### Task 2.8: Approval API tests
**File:** `src/__tests__/api/operator-approvals.test.ts`

Test:
- Pending payments list with filters
- Batch approve success
- Cannot approve locked operators
- Single approve success

---

## Acceptance Criteria

- [ ] Pending payments list shows correct items
- [ ] Filter by overdue/today/week works
- [ ] Batch approve updates multiple operators
- [ ] Single approve updates one operator
- [ ] Cannot approve locked operators
- [ ] History created for each approval
- [ ] Dashboard badge shows overdue count
- [ ] Overdue items highlighted red
- [ ] Summary cards show correct totals
