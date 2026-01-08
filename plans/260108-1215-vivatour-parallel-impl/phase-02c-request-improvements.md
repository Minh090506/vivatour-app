# Phase 2C: Request Tab Improvements

**Owner**: Window 2 or 3 (flexible)
**Duration**: ~2h
**Depends on**: Phase 1 Foundation (optional - can run standalone)
**Parallel with**: Phase 2A Operator API, Phase 2B Revenue API

---

## Context

- **Parent Plan**: `./plan.md`
- **Reference Docs**:
  - `docs/UI_DESIGN_STANDARDS_VIVATOUR.md` (2-Panel Layout, BookingCard pattern)
  - `docs/project-overview-pdr.md` (Request Module requirements)
- **Diagnostic Source**: `/ask` analysis of Request tab implementation

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-08 |
| Priority | P0 (Critical bugs) + P1/P2 improvements |
| Implementation Status | Pending |
| Review Status | Pending |

**Description**: Fix critical permission and pagination bugs in Request tab, enhance list item display, improve filter UX.

---

## Key Insights

1. **Permission Bug**: API returns ALL requests regardless of user role - SELLERs should only see their own
2. **Pagination Missing**: UI shows max 50 requests with no load-more capability
3. **List Item Incomplete**: Missing Seller, Country, Received Date per MVT workflow spec
4. **Filter UX**: No quick filters, state not persisted in URL

---

## Requirements

### P0 - Critical (Must Fix)
- SELLERs must only see requests where `sellerId = currentUser.id`
- Infinite scroll or load-more for >50 requests
- Total count displayed in list footer

### P1 - High Priority
- List items show: Seller name, Country, Received date
- Follow BookingCard pattern from UI Design Standards

### P2 - Medium Priority
- Quick filter chips for common stages
- Filter state persisted to URL params
- Verify seller relation included in API response

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Request Tab Data Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  page.tsx                                                       │
│    │                                                            │
│    ├── Filters (URL params) ──► request-filters.tsx             │
│    │                                                            │
│    ├── fetchRequests() ──────► /api/requests (GET)              │
│    │                            │                               │
│    │                            ├── auth() → session            │
│    │                            ├── if SELLER: where.sellerId   │
│    │                            └── return {data, total, hasMore}│
│    │                                                            │
│    ├── RequestListPanel ─────► request-list-panel.tsx           │
│    │    │                       │                               │
│    │    │                       ├── Intersection Observer       │
│    │    │                       ├── loadMore callback           │
│    │    │                       └── total count footer          │
│    │    │                                                       │
│    │    └── RequestListItem ──► request-list-item.tsx           │
│    │                            │                               │
│    │                            ├── ID + Status badge           │
│    │                            ├── Customer name               │
│    │                            └── Meta: Seller • Country • Date│
│    │                                                            │
│    └── RequestDetailPanel ───► (unchanged)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Code Files

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/requests/route.ts` | UPDATE | Add seller permission filter |
| `src/components/requests/request-list-panel.tsx` | UPDATE | Add infinite scroll |
| `src/components/requests/request-list-item.tsx` | UPDATE | Add meta row |
| `src/components/requests/request-filters.tsx` | UPDATE | Add quick filter chips |
| `src/app/(dashboard)/requests/page.tsx` | UPDATE | URL param sync, loadMore handler |
| `src/types/index.ts` | VERIFY | Request type has seller relation |

---

## Implementation Steps

### Task 2C.1: Fix Seller Permission (10 min) - P0

**File**: `src/app/api/requests/route.ts`

```typescript
// Add import at top
import { auth } from '@/auth';

// In GET handler, after building where clause (~line 26):
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // ... existing filter extraction ...

    // Build where clause
    const where: Record<string, any> = {};

    // ... existing where conditions ...

    // ADD: Role-based seller filter
    const session = await auth();
    if (session?.user?.role === 'SELLER') {
      where.sellerId = session.user.id;
    }
    // ACCOUNTANT and ADMIN see all requests (no sellerId filter)

    // ... rest of query ...
  }
}
```

**Verification**: Login as SELLER, confirm only own requests visible.

---

### Task 2C.2: Add Infinite Scroll (30 min) - P0

**File**: `src/components/requests/request-list-panel.tsx`

```typescript
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { RequestListItem } from './request-list-item';
import type { Request } from '@/types';

interface RequestListPanelProps {
  requests: Request[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  // NEW props for pagination
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

export function RequestListPanel({
  requests,
  selectedId,
  onSelect,
  isLoading,
  searchValue,
  onSearchChange,
  total,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: RequestListPanelProps) {
  // Intersection Observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className="w-[350px] lg:w-[350px] md:w-[280px] border-r flex flex-col h-full bg-background">
      {/* Search input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Request list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Đang tải...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Không có yêu cầu nào
          </div>
        ) : (
          <>
            {requests.map((req) => (
              <RequestListItem
                key={req.id}
                request={req}
                isSelected={req.id === selectedId}
                onClick={() => onSelect(req.id)}
              />
            ))}
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-4" />
            {isLoadingMore && (
              <div className="p-4 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang tải thêm...
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Count footer with total */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        {requests.length} / {total} yêu cầu
      </div>
    </div>
  );
}
```

**File**: `src/app/(dashboard)/requests/page.tsx`

Add state and handler for pagination:

```typescript
// Add state
const [total, setTotal] = useState(0);
const [hasMore, setHasMore] = useState(false);
const [offset, setOffset] = useState(0);
const [isLoadingMore, setIsLoadingMore] = useState(false);

// Update fetchRequests to track total
const fetchRequests = useCallback(async (append = false) => {
  if (!append) {
    setListLoading(true);
    setOffset(0);
  } else {
    setIsLoadingMore(true);
  }

  try {
    const params = new URLSearchParams();
    // ... existing params ...
    params.set('offset', append ? String(offset + 50) : '0');
    params.set('limit', '50');

    const res = await fetch(`/api/requests?${params}`);
    const data = await res.json();

    if (data.success) {
      if (append) {
        setRequests(prev => [...prev, ...data.data]);
        setOffset(prev => prev + 50);
      } else {
        setRequests(data.data);
        setOffset(50);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
  } catch (err) {
    console.error('Error fetching requests:', err);
  } finally {
    setListLoading(false);
    setIsLoadingMore(false);
  }
}, [filters, offset]);

// Load more handler
const handleLoadMore = useCallback(() => {
  if (hasMore && !isLoadingMore) {
    fetchRequests(true);
  }
}, [fetchRequests, hasMore, isLoadingMore]);

// Pass to component
<RequestListPanel
  requests={requests}
  selectedId={selectedId}
  onSelect={handleSelect}
  isLoading={listLoading}
  searchValue={searchInput}
  onSearchChange={handleSearchChange}
  total={total}
  hasMore={hasMore}
  onLoadMore={handleLoadMore}
  isLoadingMore={isLoadingMore}
/>
```

---

### Task 2C.3: Add Missing List Item Fields (15 min) - P1

**File**: `src/components/requests/request-list-item.tsx`

```typescript
'use client';

import { cn } from '@/lib/utils';
import { RequestStatusBadge } from './request-status-badge';
import { Bell, User, Globe, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Request, RequestStatus, User as UserType } from '@/types';

interface RequestListItemProps {
  request: Request & { seller?: UserType };
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Single request item in the left panel list.
 * Shows: ID, customer name, meta row (seller, country, date), status badge
 */
export function RequestListItem({ request, isSelected, onClick }: RequestListItemProps) {
  const displayId = request.bookingCode || request.rqid || request.code;
  const hasOverdueFollowUp = request.nextFollowUp && new Date(request.nextFollowUp) < new Date();

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted border-l-2 border-l-primary'
      )}
    >
      {/* Row 1: ID + Status */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm truncate">{displayId}</span>
        <div className="flex items-center gap-1">
          {hasOverdueFollowUp && (
            <Bell className="h-4 w-4 text-orange-500 flex-shrink-0" />
          )}
          <RequestStatusBadge status={request.status as RequestStatus} />
        </div>
      </div>

      {/* Row 2: Customer name */}
      <div className="mt-1">
        <span className="text-sm font-medium truncate block">
          {request.customerName}
        </span>
      </div>

      {/* Row 3: Meta (Seller • Country • Date) */}
      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
        {request.seller?.name && (
          <span className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 flex-shrink-0" />
            {request.seller.name.split(' ').pop()}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Globe className="h-3 w-3 flex-shrink-0" />
          {request.country?.slice(0, 2).toUpperCase() || '??'}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          {formatDate(request.receivedDate)}
        </span>
      </div>
    </div>
  );
}
```

---

### Task 2C.4: Quick Filter Chips (20 min) - P2

**File**: `src/components/requests/request-filters.tsx`

Add quick filter chips above existing filters:

```typescript
// Add QuickFilterChips component
const QUICK_FILTERS = [
  { label: 'Lead', value: 'LEAD', stage: true },
  { label: 'Quote', value: 'QUOTE', stage: true },
  { label: 'Follow-up', value: 'FOLLOWUP', stage: true },
  { label: 'Booking', value: 'BOOKING', status: true },
  { label: 'Quá hạn', value: 'overdue', followup: true },
];

function QuickFilterChips({
  filters,
  onChange
}: {
  filters: RequestFilters;
  onChange: (f: RequestFilters) => void;
}) {
  const handleChipClick = (chip: typeof QUICK_FILTERS[0]) => {
    if (chip.stage) {
      onChange({ ...filters, stage: filters.stage === chip.value ? '' : chip.value });
    } else if (chip.status) {
      onChange({ ...filters, status: filters.status === chip.value ? '' : chip.value });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3">
      {QUICK_FILTERS.map((chip) => {
        const isActive =
          (chip.stage && filters.stage === chip.value) ||
          (chip.status && filters.status === chip.value);

        return (
          <button
            key={chip.value}
            onClick={() => handleChipClick(chip)}
            className={cn(
              'px-3 py-1 text-xs rounded-full transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

// Add to RequestFilters component render
export function RequestFilters({ filters, onChange, sellers, showSellerFilter }: RequestFiltersProps) {
  return (
    <div>
      <QuickFilterChips filters={filters} onChange={onChange} />
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg items-end">
        {/* ... existing filters ... */}
      </div>
    </div>
  );
}
```

---

### Task 2C.5: URL Param Sync (15 min) - P2

**File**: `src/app/(dashboard)/requests/page.tsx`

Sync filters to URL search params:

```typescript
// Update filter change to sync to URL
const handleFilterChange = useCallback((newFilters: FiltersType) => {
  setFilters(newFilters);

  // Sync to URL
  const params = new URLSearchParams();
  if (newFilters.search) params.set('search', newFilters.search);
  if (newFilters.stage) params.set('stage', newFilters.stage);
  if (newFilters.status) params.set('status', newFilters.status);
  if (newFilters.seller) params.set('seller', newFilters.seller);
  if (newFilters.fromDate) params.set('fromDate', newFilters.fromDate);
  if (newFilters.toDate) params.set('toDate', newFilters.toDate);
  if (selectedId) params.set('id', selectedId);

  router.replace(`/requests?${params.toString()}`, { scroll: false });
}, [router, selectedId]);

// Initialize filters from URL on mount
useEffect(() => {
  setFilters({
    search: searchParams.get('search') || '',
    stage: searchParams.get('stage') || '',
    status: searchParams.get('status') || '',
    seller: searchParams.get('seller') || '',
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || '',
  });
}, [searchParams]);
```

---

## Todo List

- [ ] Task 2C.1: Fix seller permission filter in API
- [ ] Task 2C.2: Implement infinite scroll in list panel
- [ ] Task 2C.3: Add meta row to list item
- [ ] Task 2C.4: Add quick filter chips
- [ ] Task 2C.5: Sync filters to URL params
- [ ] Verify: TypeScript compilation passes
- [ ] Verify: SELLER role sees only own requests
- [ ] Verify: Load more works with >50 requests

---

## Success Criteria

- [ ] SELLERs only see requests where `sellerId = session.user.id`
- [ ] Infinite scroll loads additional requests when scrolling
- [ ] List footer shows `{loaded} / {total} yêu cầu`
- [ ] List items display: Seller name, Country (2-char), Received date
- [ ] Quick filter chips toggle stage/status filters
- [ ] Filter state persists in URL (can share/bookmark filtered views)
- [ ] No TypeScript/build errors

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth session not available in API | HIGH | Verify `auth()` import path, test with logged-in user |
| Infinite scroll performance | MEDIUM | Debounce IntersectionObserver, limit batch size |
| Type mismatch on Request.seller | LOW | Verify API includes seller relation |

---

## Security Considerations

- **Permission Filter**: Server-side enforcement (cannot bypass via client)
- **Session Validation**: Always check `session?.user` before accessing role
- **No PII Leak**: Seller name shown only for own requests or admin view

---

## Next Steps

After Phase 2C complete:
1. Test with SELLER account - confirm restriction
2. Test with >100 requests - confirm pagination
3. Proceed to Phase 3 UI components (independent)
