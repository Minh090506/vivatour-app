# Phase 3: 2-Panel Page Layout

**Status:** Pending
**Estimated Effort:** Medium

---

## Objectives

1. Replace existing /requests page with 2-panel layout
2. Implement URL-based state (?id=xxx)
3. Handle request selection and data fetching

---

## Tasks

### Task 3.1: Rewrite Requests Page

**File:** `src/app/(dashboard)/requests/page.tsx`

**Code:**
```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  RequestListPanel,
  RequestDetailPanel,
  RequestFilters as RequestFiltersComponent,
} from '@/components/requests';
import type { Request, RequestFilters, Operator } from '@/types';

interface RequestWithDetails extends Request {
  operators?: Operator[];
  _count?: { operators?: number; revenues?: number };
}

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  // List state
  const [requests, setRequests] = useState<Request[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [filters, setFilters] = useState<RequestFilters>({
    search: '',
    stage: '',
    status: '',
    seller: '',
    fromDate: '',
    toDate: '',
  });

  // Detail state
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Permission state
  const [canViewAll, setCanViewAll] = useState(false);
  const [sellers, setSellers] = useState([]);

  // Fetch list
  const fetchRequests = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.status) params.set('status', filters.status);
      if (filters.seller) params.set('sellerId', filters.seller);
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
      setListLoading(false);
    }
  }, [filters]);

  // Fetch selected request details
  const fetchRequestDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/requests/${id}?include=operators`);
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(data.data);
      } else {
        // Request not found - clear selection
        setSelectedRequest(null);
        router.replace('/requests');
      }
    } catch (err) {
      console.error('Error fetching request detail:', err);
      setSelectedRequest(null);
    } finally {
      setDetailLoading(false);
    }
  }, [router]);

  // Init: check permissions
  useEffect(() => {
    async function init() {
      const configRes = await fetch('/api/config/user/me');
      const configData = await configRes.json();
      if (configData.success && configData.data?.canViewAll) {
        setCanViewAll(true);
        const sellersRes = await fetch('/api/users?role=SELLER');
        const sellersData = await sellersRes.json();
        if (sellersData.success) setSellers(sellersData.data);
      }
    }
    init();
  }, []);

  // Fetch list on filter change
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Fetch detail when selection changes
  useEffect(() => {
    if (selectedId) {
      fetchRequestDetail(selectedId);
    } else {
      setSelectedRequest(null);
    }
  }, [selectedId, fetchRequestDetail]);

  // Handle selection
  const handleSelect = (id: string) => {
    router.push(`/requests?id=${id}`, { scroll: false });
  };

  // Handle update
  const handleUpdate = async (data: Partial<Request>) => {
    if (!selectedId) return;
    const res = await fetch(`/api/requests/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      setSelectedRequest(result.data);
      fetchRequests(); // Refresh list
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
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
      <div className="border-b">
        <RequestFiltersComponent
          filters={filters}
          onChange={setFilters}
          sellers={sellers}
          showSellerFilter={canViewAll}
        />
      </div>

      {/* 2-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        <RequestListPanel
          requests={requests}
          selectedId={selectedId}
          onSelect={handleSelect}
          isLoading={listLoading}
          filters={filters}
          onFiltersChange={setFilters}
        />
        <RequestDetailPanel
          request={selectedRequest}
          isLoading={detailLoading}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
```

---

### Task 3.2: Update Detail Page Redirect

**File:** `src/app/(dashboard)/requests/[id]/page.tsx`

**Purpose:** Redirect old detail URLs to new panel layout

**Code:**
```tsx
import { redirect } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default function RequestDetailRedirect({ params }: PageProps) {
  redirect(`/requests?id=${params.id}`);
}
```

---

### Task 3.3: Update API to Support Include Parameter

**File:** `src/app/api/requests/[id]/route.ts`

**Add to GET handler:**
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const url = new URL(req.url);
  const include = url.searchParams.get('include');

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true, email: true } },
      operators: include === 'operators' ? {
        orderBy: { serviceDate: 'asc' },
        include: { supplierRef: { select: { id: true, name: true, code: true } } },
      } : false,
      _count: { select: { operators: true, revenues: true } },
    },
  });

  if (!request) {
    return NextResponse.json(
      { success: false, error: 'Request not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: request });
}
```

---

## Layout Notes

### Height Calculation
- Total viewport height: 100vh
- Header: 4rem (64px)
- Available: calc(100vh - 4rem)

### Panel Widths
- Left panel: 350px fixed
- Right panel: flex-1 (remaining space)

### Responsive (Future)
- md breakpoint: Left panel 280px
- sm breakpoint: Left panel as drawer

---

## Acceptance Criteria

- [ ] /requests shows 2-panel layout
- [ ] Clicking list item updates URL (?id=xxx)
- [ ] Right panel shows selected request details
- [ ] Right panel empty when no selection
- [ ] /requests/[id] redirects to /requests?id=[id]
- [ ] API supports ?include=operators parameter
- [ ] Filters still work correctly
- [ ] List refreshes when filters change
