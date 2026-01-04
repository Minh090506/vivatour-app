---
phase: 4
title: "UI Pages"
status: pending
effort: 1.5d
---

# Phase 4: UI Pages

## Context

- **Parent Plan:** [plan.md](plan.md)
- **Dependencies:** Phase 3 (UI Components)
- **Patterns:** src/app/(dashboard)/operators/, src/app/(dashboard)/suppliers/

---

## Overview

Create Request pages: list, create, detail/edit. Wire up components to API endpoints.

---

## Requirements

### 4.1 Create /requests/page.tsx (List Page)

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  RequestTable,
  RequestFilters,
} from '@/components/requests';
import type { Request, RequestFilters as Filters } from '@/types';

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stage: '',
    status: '',
    sellerId: '',
    fromDate: '',
    toDate: '',
  });
  const [canViewAll, setCanViewAll] = useState(false);
  const [sellers, setSellers] = useState([]);

  // Fetch requests with filters
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.status) params.set('status', filters.status);
      if (filters.sellerId) params.set('sellerId', filters.sellerId);
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Check permissions and fetch sellers
  useEffect(() => {
    async function init() {
      // Check if user can view all
      const configRes = await fetch('/api/config/user/me');
      const configData = await configRes.json();
      if (configData.success && configData.data?.canViewAll) {
        setCanViewAll(true);
        // Fetch sellers list for filter
        const sellersRes = await fetch('/api/users?role=SELLER');
        const sellersData = await sellersRes.json();
        if (sellersData.success) setSellers(sellersData.data);
      }
    }
    init();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Yêu cầu</h1>
          <p className="text-muted-foreground">Quản lý yêu cầu khách hàng</p>
        </div>
        <Button onClick={() => router.push('/requests/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm yêu cầu
        </Button>
      </div>

      {/* Filters */}
      <RequestFilters
        filters={filters}
        onChange={setFilters}
        sellers={sellers}
        showSellerFilter={canViewAll}
      />

      {/* Table */}
      <RequestTable
        requests={requests}
        isLoading={loading}
        onRowClick={(req) => router.push(`/requests/${req.id}`)}
      />
    </div>
  );
}
```

### 4.2 Create /requests/create/page.tsx

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { RequestForm } from '@/components/requests';
import type { RequestFormData } from '@/types';

export default function CreateRequestPage() {
  const router = useRouter();

  const handleSubmit = async (data: RequestFormData) => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    router.push(`/requests/${result.data.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thêm yêu cầu mới</h1>
        <p className="text-muted-foreground">Nhập thông tin yêu cầu từ khách hàng</p>
      </div>

      <RequestForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </div>
  );
}
```

### 4.3 Create /requests/[id]/page.tsx (Detail/Edit)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, ExternalLink } from 'lucide-react';
import { RequestForm, RequestStatusBadge } from '@/components/requests';
import type { Request, RequestFormData } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchRequest() {
      setLoading(true);
      try {
        const res = await fetch(`/api/requests/${id}`);
        const data = await res.json();
        if (data.success) {
          setRequest(data.data);
        }
      } catch (err) {
        console.error('Error fetching request:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [id]);

  const handleUpdate = async (data: RequestFormData) => {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    setRequest(result.data);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!request) {
    return <div className="p-8 text-center">Không tìm thấy yêu cầu</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{request.rqid}</h1>
              <RequestStatusBadge status={request.status} showStage />
            </div>
            <p className="text-muted-foreground">{request.customerName}</p>
          </div>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Booking Code Banner (if BOOKING) */}
      {request.bookingCode && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Mã Booking</p>
                <p className="text-2xl font-mono font-bold text-green-700">
                  {request.bookingCode}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push(`/operators?requestId=${request.id}`)}
              >
                Xem Operators
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isEditing ? (
        <RequestForm
          initialData={request}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
          isEditing
        />
      ) : (
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="operators">Dịch vụ ({request._count?.operators || 0})</TabsTrigger>
            <TabsTrigger value="revenues">Doanh thu ({request._count?.revenues || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            {/* Customer Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="Tên" value={request.customerName} />
                <InfoRow label="Liên hệ" value={request.contact} />
                <InfoRow label="WhatsApp" value={request.whatsapp || '-'} />
                <InfoRow label="Pax" value={request.pax.toString()} />
                <InfoRow label="Quốc gia" value={request.country} />
                <InfoRow label="Nguồn" value={request.source} />
              </CardContent>
            </Card>

            {/* Tour Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin Tour</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="Số ngày" value={request.tourDays?.toString() || '-'} />
                <InfoRow label="Ngày bắt đầu" value={request.startDate ? formatDate(request.startDate) : '-'} />
                <InfoRow label="Ngày kết thúc" value={request.endDate ? formatDate(request.endDate) : '-'} />
                <InfoRow label="Doanh thu DK" value={request.expectedRevenue ? formatCurrency(request.expectedRevenue) : '-'} />
                <InfoRow label="Chi phí DK" value={request.expectedCost ? formatCurrency(request.expectedCost) : '-'} />
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle>Thời gian</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="Ngày nhận" value={formatDate(request.receivedDate)} />
                <InfoRow label="Liên hệ gần nhất" value={request.lastContactDate ? formatDate(request.lastContactDate) : '-'} />
                <InfoRow label="Follow-up tiếp" value={request.nextFollowUp ? formatDate(request.nextFollowUp) : '-'} />
                <InfoRow label="Seller" value={request.seller?.name || '-'} />
              </CardContent>
            </Card>

            {/* Notes Card */}
            {request.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Ghi chú</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{request.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="operators">
            {/* Linked operators list - Phase 5 */}
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {request.bookingCode
                  ? 'Xem danh sách dịch vụ trong tab Operators'
                  : 'Chuyển sang trạng thái Booking để tạo dịch vụ'}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenues">
            {/* Linked revenues list - future */}
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chức năng Revenue sẽ được phát triển sau
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Helper component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
```

### 4.4 Add Route to Header Navigation

Update `src/components/layout/Header.tsx`:

```typescript
// In navigation items array
{ name: 'Yêu cầu', href: '/requests' },
```

---

## Implementation Steps

- [ ] 4.1 Create src/app/(dashboard)/requests/page.tsx
- [ ] 4.2 Create src/app/(dashboard)/requests/create/page.tsx
- [ ] 4.3 Create src/app/(dashboard)/requests/[id]/page.tsx
- [ ] 4.4 Update Header.tsx with /requests link
- [ ] 4.5 Create /api/config/user/me endpoint for permission check
- [ ] 4.6 Test full CRUD flow

---

## Success Criteria

- [ ] List page loads with filters
- [ ] Create page generates RQID on submit
- [ ] Detail page shows all request info
- [ ] Edit mode updates request
- [ ] Navigation works correctly
- [ ] Permissions filter results (seller sees own only)

---

## Related Files

| File | Action |
|------|--------|
| src/app/(dashboard)/requests/page.tsx | Create |
| src/app/(dashboard)/requests/create/page.tsx | Create |
| src/app/(dashboard)/requests/[id]/page.tsx | Create |
| src/components/layout/Header.tsx | Modify |
| src/app/api/config/user/me/route.ts | Create |
