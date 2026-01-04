# Phase 2: New Components

**Status:** ✅ DONE (2026-01-04)
**Estimated Effort:** Medium
**Completed:** 2026-01-04

---

## Objectives

1. Create RequestListPanel component (left panel)
2. Create RequestListItem component (list item)
3. Create RequestDetailPanel component (right panel)

---

## Tasks

### Task 2.1: RequestListItem Component

**File:** `src/components/requests/request-list-item.tsx`

**Purpose:** Single request item in left panel list

**Props:**
```typescript
interface RequestListItemProps {
  request: Request;
  isSelected: boolean;
  onClick: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────┐
│ RQ-260104-0001           ● LEAD │  <- Primary ID + Status badge
│ John Doe                    🔔  │  <- Customer + Follow-up indicator
└─────────────────────────────────┘
```

**Code:**
```tsx
'use client';

import { cn } from '@/lib/utils';
import { RequestStatusBadge } from './request-status-badge';
import { Bell } from 'lucide-react';
import type { Request, RequestStatus } from '@/types';

interface RequestListItemProps {
  request: Request;
  isSelected: boolean;
  onClick: () => void;
}

export function RequestListItem({ request, isSelected, onClick }: RequestListItemProps) {
  // Show booking code if BOOKING status, otherwise RQID
  const displayId = request.bookingCode || request.rqid || request.code;

  // Follow-up indicator
  const hasOverdueFollowUp = request.nextFollowUp && new Date(request.nextFollowUp) < new Date();

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted border-l-2 border-l-primary'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm truncate">{displayId}</span>
        <RequestStatusBadge status={request.status as RequestStatus} size="sm" />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-muted-foreground truncate">
          {request.customerName}
        </span>
        {hasOverdueFollowUp && (
          <Bell className="h-4 w-4 text-orange-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
```

---

### Task 2.2: RequestListPanel Component

**File:** `src/components/requests/request-list-panel.tsx`

**Purpose:** Left panel containing search and scrollable request list

**Props:**
```typescript
interface RequestListPanelProps {
  requests: Request[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  filters: RequestFilters;
  onFiltersChange: (filters: RequestFilters) => void;
}
```

**Code:**
```tsx
'use client';

import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { RequestListItem } from './request-list-item';
import type { Request, RequestFilters } from '@/types';

interface RequestListPanelProps {
  requests: Request[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  filters: RequestFilters;
  onFiltersChange: (filters: RequestFilters) => void;
}

export function RequestListPanel({
  requests,
  selectedId,
  onSelect,
  isLoading,
  filters,
  onFiltersChange,
}: RequestListPanelProps) {
  return (
    <div className="w-[350px] border-r flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Đang tải...</div>
        ) : requests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Không có yêu cầu nào
          </div>
        ) : (
          requests.map((req) => (
            <RequestListItem
              key={req.id}
              request={req}
              isSelected={req.id === selectedId}
              onClick={() => onSelect(req.id)}
            />
          ))
        )}
      </ScrollArea>

      {/* Count */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        {requests.length} yêu cầu
      </div>
    </div>
  );
}
```

---

### Task 2.3: RequestDetailPanel Component

**File:** `src/components/requests/request-detail-panel.tsx`

**Purpose:** Right panel showing request details and services

**Props:**
```typescript
interface RequestDetailPanelProps {
  request: RequestWithDetails | null;
  isLoading: boolean;
  onUpdate: (data: Partial<Request>) => Promise<void>;
}
```

**Code:**
```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RequestStatusBadge } from './request-status-badge';
import { RequestServicesTable } from './request-services-table';
import { Edit, ExternalLink } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Request, RequestStatus, Operator } from '@/types';

interface RequestWithDetails extends Request {
  operators?: Operator[];
  _count?: { operators?: number; revenues?: number };
}

interface RequestDetailPanelProps {
  request: RequestWithDetails | null;
  isLoading: boolean;
  onUpdate: (data: Partial<Request>) => Promise<void>;
}

export function RequestDetailPanel({
  request,
  isLoading,
  onUpdate,
}: RequestDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Chọn yêu cầu từ danh sách</p>
          <p className="text-sm mt-1">để xem chi tiết</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-mono">
              {request.bookingCode || request.rqid}
            </h2>
            <RequestStatusBadge status={request.status as RequestStatus} showStage />
          </div>
          <p className="text-muted-foreground">{request.customerName}</p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          <Edit className="w-4 h-4 mr-2" />
          Chỉnh sửa
        </Button>
      </div>

      {/* Booking Code Banner */}
      {request.bookingCode && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Mã Booking</p>
              <p className="text-2xl font-mono font-bold text-green-700">
                {request.bookingCode}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <InfoRow label="Tên" value={request.customerName} />
          <InfoRow label="Liên hệ" value={request.contact} />
          <InfoRow label="WhatsApp" value={request.whatsapp || '-'} />
          <InfoRow label="Pax" value={String(request.pax)} />
          <InfoRow label="Quốc gia" value={request.country} />
          <InfoRow label="Nguồn" value={request.source} />
        </CardContent>
      </Card>

      {/* Tour Info */}
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
          <InfoRow label="Seller" value={request.seller?.name || '-'} />
        </CardContent>
      </Card>

      {/* Services Table (inline editable) */}
      {request.bookingCode && (
        <Card>
          <CardHeader>
            <CardTitle>Dịch vụ ({request._count?.operators || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestServicesTable
              requestId={request.id}
              operators={request.operators || []}
            />
          </CardContent>
        </Card>
      )}

      {/* Notes */}
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
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
```

---

### Task 2.4: Update Exports

**File:** `src/components/requests/index.ts`

```typescript
export { RequestTable } from './request-table';
export { RequestFilters } from './request-filters';
export { RequestForm } from './request-form';
export { RequestStatusBadge } from './request-status-badge';
export { RequestListPanel } from './request-list-panel';
export { RequestListItem } from './request-list-item';
export { RequestDetailPanel } from './request-detail-panel';
export { RequestServicesTable } from './request-services-table';
```

---

## Acceptance Criteria

- [x] RequestListItem shows ID, customer, status, follow-up indicator ✅
- [x] RequestListPanel has search and scrollable list ✅
- [x] RequestDetailPanel shows empty state when no selection ✅
- [x] RequestDetailPanel shows full details when request selected ✅
- [x] All components exported from index.ts ✅

---

## Implementation Notes

**Simplified from plan:**
- Removed `size` prop from RequestStatusBadge (not needed, badge is compact enough)
- Simplified RequestListPanel props: uses `searchValue` + `onSearchChange` instead of full filters object
- RequestDetailPanel: Services table placeholder for Phase 4, `onEditClick` callback instead of inline state
- Added dark mode support for booking code banner

**Files Created:**
- `src/components/requests/request-list-item.tsx` - List item with ID, customer, status, follow-up bell
- `src/components/requests/request-list-panel.tsx` - Left panel with search + scrollable list
- `src/components/requests/request-detail-panel.tsx` - Right panel with customer/tour info cards

**TypeScript:** All components compile without errors
