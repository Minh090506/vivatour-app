# Phase 2: Integration

**Duration**: ~30 minutes
**Parallelization**: MUST run after Phase 1-A and 1-B complete
**Dependencies**: Phase 1-A (API), Phase 1-B (UI components)

---

## File Ownership (Exclusive to This Phase)

| File | Operation |
|------|-----------|
| `src/app/(dashboard)/revenue/page.tsx` | CREATE |
| `src/components/requests/request-detail-panel.tsx` | MODIFY |

---

## Step 1: Create Revenue Page

**File**: `src/app/(dashboard)/revenue/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RevenueForm, RevenueTable, RevenueSummaryCard } from '@/components/revenues';
import { Plus, Search, RefreshCw } from 'lucide-react';

// Payment types for filter
const PAYMENT_TYPES = [
  { value: '', label: 'Tất cả loại' },
  { value: 'DEPOSIT', label: 'Đặt cọc' },
  { value: 'FULL_PAYMENT', label: 'Thanh toán đủ' },
  { value: 'PARTIAL', label: 'Một phần' },
  { value: 'REFUND', label: 'Hoàn tiền' },
];

interface Revenue {
  id: string;
  paymentDate: Date | string;
  paymentType: string;
  foreignAmount?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  amountVND: number;
  paymentSource: string;
  notes?: string | null;
  isLocked: boolean;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
  request?: {
    code: string;
    customerName: string;
    bookingCode?: string | null;
  };
}

export default function RevenuePage() {
  // Data state
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter state
  const [paymentType, setPaymentType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLocked, setIsLocked] = useState('');

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);

  // Fetch revenues
  const fetchRevenues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (paymentType) params.set('paymentType', paymentType);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (isLocked) params.set('isLocked', isLocked);
      params.set('limit', '100');

      const res = await fetch(`/api/revenues?${params}`);
      const data = await res.json();

      if (data.success) {
        setRevenues(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching revenues:', error);
    } finally {
      setLoading(false);
    }
  }, [paymentType, fromDate, toDate, isLocked]);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  const handleEdit = (revenue: Revenue) => {
    setEditingRevenue(revenue);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingRevenue(null);
    fetchRevenues();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRevenue(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Thu nhập</h1>
          <p className="text-muted-foreground">
            Quản lý các khoản thu từ booking
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm thu nhập
        </Button>
      </div>

      {/* Summary Cards */}
      <RevenueSummaryCard revenues={revenues} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Loại thanh toán" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value || 'all'} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Từ ngày"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            <Input
              type="date"
              placeholder="Đến ngày"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

            <Select value={isLocked} onValueChange={setIsLocked}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái khóa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả</SelectItem>
                <SelectItem value="true">Đã khóa</SelectItem>
                <SelectItem value="false">Chưa khóa</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchRevenues}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Danh sách ({total} kết quả)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : (
            <RevenueTable
              revenues={revenues}
              showRequest={true}
              onEdit={handleEdit}
              onRefresh={fetchRevenues}
              canManage={true} // TODO: Check permission
              canUnlock={true} // TODO: Check if ADMIN
            />
          )}
        </CardContent>
      </Card>

      {/* Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingRevenue ? 'Chỉnh sửa thu nhập' : 'Thêm thu nhập mới'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <RevenueForm
              revenue={editingRevenue || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

---

## Step 2: Update Request Detail Panel

**File**: `src/components/requests/request-detail-panel.tsx`

Add revenue section below services table. Find the existing component and add:

### Changes to Make:

1. **Add import** at top of file:
```typescript
import { RevenueTable, RevenueSummaryCard } from '@/components/revenues';
```

2. **Extend interface** to include revenues:
```typescript
interface RequestWithDetails extends Request {
  operators?: Operator[];
  revenues?: Revenue[]; // ADD THIS
  seller?: User;
  _count?: { operators?: number; revenues?: number };
}
```

3. **Add Revenue type** (inline or import):
```typescript
interface Revenue {
  id: string;
  paymentDate: Date | string;
  paymentType: string;
  foreignAmount?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  amountVND: number;
  paymentSource: string;
  notes?: string | null;
  isLocked: boolean;
}
```

4. **Add revenue section** after the Services Table section (around line 160):
```typescript
{/* Revenue Table - for bookings with revenues */}
{request.bookingCode && (
  <Card>
    <CardHeader>
      <CardTitle>Thu nhập ({request.revenues?.length || request._count?.revenues || 0})</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {request.revenues && request.revenues.length > 0 && (
        <>
          <RevenueSummaryCard revenues={request.revenues} className="mb-4" />
          <RevenueTable
            revenues={request.revenues}
            showRequest={false}
            onRefresh={onRefresh}
            canManage={true} // TODO: Check permission
            canUnlock={false} // Only on revenue page
          />
        </>
      )}
      {(!request.revenues || request.revenues.length === 0) && (
        <div className="text-center py-4 text-muted-foreground">
          Chưa có thu nhập nào
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### Full Modified File Section (Lines ~145-180):

```typescript
      {/* Services Table - inline editable for bookings */}
      {request.bookingCode && (
        <Card>
          <CardHeader>
            <CardTitle>Dịch vụ ({request.operators?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestServicesTable
              requestId={request.id}
              operators={request.operators || []}
              onUpdate={onRefresh}
            />
          </CardContent>
        </Card>
      )}

      {/* Revenue Table - for bookings with revenues */}
      {request.bookingCode && (
        <Card>
          <CardHeader>
            <CardTitle>Thu nhập ({request.revenues?.length || request._count?.revenues || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.revenues && request.revenues.length > 0 && (
              <>
                <RevenueSummaryCard revenues={request.revenues} className="mb-4" />
                <RevenueTable
                  revenues={request.revenues}
                  showRequest={false}
                  onRefresh={onRefresh}
                  canManage={true}
                  canUnlock={false}
                />
              </>
            )}
            {(!request.revenues || request.revenues.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                Chưa có thu nhập nào
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      {request.notes && (
        // ... existing notes section
      )}
```

---

## Step 3: Update Request API to Include Revenues

**Note**: The existing `/api/requests/[id]` route should already include revenues if the Prisma query has `include: { revenues: true }`. Verify this works.

If not included, add to the API route:
```typescript
const request = await prisma.request.findUnique({
  where: { id },
  include: {
    seller: { select: { id: true, name: true, email: true } },
    operators: true,
    revenues: true, // ADD THIS
  },
});
```

---

## Success Criteria

- [ ] `/revenue` page loads and displays revenues
- [ ] Revenue filters work (paymentType, date range, locked)
- [ ] Can create new revenue from page
- [ ] Can edit revenue from page
- [ ] Request detail panel shows revenue section for bookings
- [ ] Revenue summary shows in request detail
- [ ] Revenue table shows in request detail

---

## Conflict Prevention

This phase modifies ONE existing file:
- `src/components/requests/request-detail-panel.tsx` - ADD revenue section (no conflict with Phase 1)

This phase creates ONE new file:
- `src/app/(dashboard)/revenue/page.tsx` - NEW

Safe to execute after Phase 1-A and 1-B complete.
