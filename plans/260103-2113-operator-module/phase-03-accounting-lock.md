# Phase 3: Accounting Lock Implementation

**Priority:** P1 (Important)
**Depends On:** Phase 1, Phase 2 complete
**Estimated Tasks:** 8

---

## Overview

Implement accounting period lock mechanism. Accountants lock records after month-end closing to prevent modifications.

---

## Task Breakdown

### 1. API Routes

#### Task 3.1: Lock period endpoint
**File:** `src/app/api/operators/lock-period/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/operators/lock-period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate month format YYYY-MM
    if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng tháng không hợp lệ (YYYY-MM)' },
        { status: 400 }
      );
    }

    const userId = body.userId || 'system';

    // Parse month range
    const [year, month] = body.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    // Find all unlocked operators in the period
    const operators = await prisma.operator.findMany({
      where: {
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
        isLocked: false,
      },
      select: { id: true },
    });

    if (operators.length === 0) {
      return NextResponse.json({
        success: true,
        data: { count: 0, message: 'Không có dịch vụ cần khóa trong kỳ này' },
      });
    }

    // Lock all in transaction
    const lockedAt = new Date();

    await prisma.$transaction(async (tx) => {
      // Update operators
      await tx.operator.updateMany({
        where: {
          id: { in: operators.map((o) => o.id) },
        },
        data: {
          isLocked: true,
          lockedAt,
          lockedBy: userId,
        },
      });

      // Create history entries
      await Promise.all(
        operators.map((op) =>
          tx.operatorHistory.create({
            data: {
              operatorId: op.id,
              action: 'LOCK',
              changes: {
                isLocked: { before: false, after: true },
                lockedAt: { before: null, after: lockedAt },
                lockedBy: { before: null, after: userId },
              },
              userId,
            },
          })
        )
      );
    });

    return NextResponse.json({
      success: true,
      data: {
        count: operators.length,
        period: body.month,
        lockedAt,
      },
    });
  } catch (error) {
    console.error('Error locking period:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa kỳ: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/operators/lock-period - Get lock status by month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng tháng không hợp lệ' },
        { status: 400 }
      );
    }

    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const [total, locked, unlocked] = await Promise.all([
      prisma.operator.count({
        where: {
          serviceDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.operator.count({
        where: {
          serviceDate: { gte: startDate, lte: endDate },
          isLocked: true,
        },
      }),
      prisma.operator.count({
        where: {
          serviceDate: { gte: startDate, lte: endDate },
          isLocked: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        month,
        total,
        locked,
        unlocked,
        isFullyLocked: unlocked === 0 && total > 0,
      },
    });
  } catch (error) {
    console.error('Error getting lock status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
```

#### Task 3.2: Single lock endpoint
**File:** `src/app/api/operators/[id]/lock/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';

// POST /api/operators/[id]/lock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = body.userId || 'system';

    const operator = await prisma.operator.findUnique({ where: { id } });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    if (operator.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã được khóa' },
        { status: 400 }
      );
    }

    const lockedAt = new Date();

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        isLocked: true,
        lockedAt,
        lockedBy: userId,
      },
    });

    await createOperatorHistory({
      operatorId: id,
      action: 'LOCK',
      changes: {
        isLocked: { before: false, after: true },
        lockedAt: { before: null, after: lockedAt },
        lockedBy: { before: null, after: userId },
      },
      userId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error locking operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa: ${message}` },
      { status: 500 }
    );
  }
}
```

#### Task 3.3: Unlock endpoint (Admin only)
**File:** `src/app/api/operators/[id]/unlock/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';

// POST /api/operators/[id]/unlock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = body.userId || 'system';

    // TODO: Verify user is ADMIN
    // const user = await getUser(userId);
    // if (user.role !== 'ADMIN') {
    //   return NextResponse.json({ success: false, error: 'Chỉ Admin được mở khóa' }, { status: 403 });
    // }

    const operator = await prisma.operator.findUnique({ where: { id } });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    if (!operator.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ chưa được khóa' },
        { status: 400 }
      );
    }

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
    });

    await createOperatorHistory({
      operatorId: id,
      action: 'UNLOCK',
      changes: {
        isLocked: { before: true, after: false },
        lockedAt: { before: operator.lockedAt, after: null },
        lockedBy: { before: operator.lockedBy, after: null },
      },
      userId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error unlocking operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi mở khóa: ${message}` },
      { status: 500 }
    );
  }
}
```

---

### 2. UI Components

#### Task 3.4: Lock period dialog
**File:** `src/components/operators/operator-lock-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Lock, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OperatorLockDialog({ open, onOpenChange, onSuccess }: Props) {
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  // Get default month (previous month)
  const getDefaultMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const handlePreview = async () => {
    if (!month) return;

    try {
      const res = await fetch(`/api/operators/lock-period?month=${month}`);
      const data = await res.json();
      if (data.success) {
        setPreviewCount(data.data.unlocked);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLock = async () => {
    if (!month) return;

    setLoading(true);
    try {
      const res = await fetch('/api/operators/lock-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          userId: 'current-user', // TODO: Get from auth
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã khóa ${data.data.count} dịch vụ kỳ ${month}`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi khóa kỳ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Khóa Kỳ Kế Toán
          </DialogTitle>
          <DialogDescription>
            Khóa tất cả dịch vụ trong kỳ để ngăn chỉnh sửa sau khi đã đối soát.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="month">Kỳ cần khóa</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPreviewCount(null);
              }}
              placeholder={getDefaultMonth()}
            />
          </div>

          {month && previewCount === null && (
            <Button variant="outline" onClick={handlePreview}>
              Xem trước
            </Button>
          )}

          {previewCount !== null && (
            <div className="p-4 bg-yellow-50 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  {previewCount} dịch vụ sẽ bị khóa
                </p>
                <p className="text-sm text-yellow-700">
                  Sau khi khóa, chỉ Admin mới có thể mở khóa từng dịch vụ.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleLock}
            disabled={!month || loading}
            variant="destructive"
          >
            {loading ? 'Đang khóa...' : 'Khóa kỳ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Task 3.5: Lock indicator badge
**File:** `src/components/operators/lock-indicator.tsx`

```typescript
import { Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate } from '@/lib/utils';

interface Props {
  isLocked: boolean;
  lockedAt?: Date | null;
  lockedBy?: string | null;
}

export function LockIndicator({ isLocked, lockedAt, lockedBy }: Props) {
  if (!isLocked) {
    return (
      <Badge variant="outline" className="text-gray-500">
        <Unlock className="h-3 w-3 mr-1" />
        Chưa khóa
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="secondary" className="text-amber-700 bg-amber-50">
          <Lock className="h-3 w-3 mr-1" />
          Đã khóa
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Khóa lúc: {lockedAt ? formatDate(lockedAt) : 'N/A'}</p>
        <p>Bởi: {lockedBy || 'N/A'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

### 3. Page Updates

#### Task 3.6: Add lock period button to operators page
**File:** `src/app/(dashboard)/operators/page.tsx` (update)

Add "Khóa Kỳ" button in header that opens `OperatorLockDialog`.

#### Task 3.7: Add lock indicator to detail page
**File:** `src/app/(dashboard)/operators/[id]/page.tsx` (update)

- Show LockIndicator in header
- Disable edit form if locked
- Show unlock button for Admin role

---

### 4. Tests

#### Task 3.8: Lock API tests
**File:** `src/__tests__/api/operator-lock.test.ts`

Test:
- Lock period success
- Get lock status
- Single lock/unlock
- Cannot edit locked operator
- Cannot delete locked operator

---

## Acceptance Criteria

- [ ] Can lock all operators in a month
- [ ] Preview shows count before locking
- [ ] Single lock/unlock works
- [ ] Locked operators show indicator
- [ ] Cannot edit locked operators
- [ ] Cannot delete locked operators
- [ ] Cannot approve locked operators
- [ ] History records lock/unlock actions
- [ ] Only Admin can unlock (when auth implemented)
