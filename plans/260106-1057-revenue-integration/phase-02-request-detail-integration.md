# Phase 02: Integrate Revenue Components into Request Detail

**Parent:** [plan.md](./plan.md)
**Date:** 2026-01-06
**Priority:** P1
**Status:** done
**Review:** pending

## Overview

Add revenue section to the request detail panel, showing revenue table, summary card, and ability to add/edit revenues inline.

## Key Insights

1. `RequestDetailPanel` already shows services for bookings (line 149 pattern)
2. Revenue components ready: `RevenueTable`, `RevenueForm`, `RevenueSummaryCard`
3. Need to fetch revenues for specific request via `/api/revenues?requestId=X`

## Requirements

- Add "Doanh thu" (Revenue) Card section after Services Table
- Only show for requests with `bookingCode` (follow existing pattern)
- Show summary card with totals at top
- Show revenue table with add/edit/delete
- Dialog for RevenueForm on add/edit
- Permission check: only show for users with `revenue:view`

## Architecture

```
RequestDetailPanel
├── Existing sections...
├── Services Table (bookingCode only)
└── NEW: Revenue Section (bookingCode only)
    ├── RevenueSummaryCard - totals at top
    ├── Add Revenue Button - opens dialog
    ├── RevenueTable - list with actions
    └── Dialog with RevenueForm
```

## Related Files

| File | Action |
|------|--------|
| `src/components/requests/request-detail-panel.tsx` | Add revenue section |
| `src/components/revenues/index.ts` | Already exports all components |

## Implementation Steps

- [ ] Import revenue components and Dialog in `request-detail-panel.tsx`
- [ ] Add usePermission hook for permission checks
- [ ] Add state: revenues[], editingRevenue, dialogOpen, loadingRevenues
- [ ] Add `fetchRevenues` function calling `GET /api/revenues?requestId=X`
- [ ] Add useEffect to fetch when request.id changes (with bookingCode check)
- [ ] Add Revenue Card section after Services Table (conditional on bookingCode)
- [ ] Add RevenueSummaryCard at top of section
- [ ] Add "Thêm thu nhập" button gated by `can("revenue:manage")`
- [ ] Add RevenueTable with onEdit/onRefresh callbacks
- [ ] Add Dialog with RevenueForm for add/edit
- [ ] Wire up handleAdd, handleEdit, handleDialogClose, handleRefresh callbacks

## Code Snippets

**Imports to add:**
```tsx
import { useEffect, useState, useCallback } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RevenueTable, RevenueForm, RevenueSummaryCard } from '@/components/revenues';
import { Plus } from 'lucide-react';
```

**State to add:**
```tsx
const { can, isAdmin } = usePermission();
const [revenues, setRevenues] = useState<Revenue[]>([]);
const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
const [dialogOpen, setDialogOpen] = useState(false);
const [loadingRevenues, setLoadingRevenues] = useState(false);
```

**Fetch function:**
```tsx
const fetchRevenues = useCallback(async () => {
  if (!request?.id || !request?.bookingCode) return;
  setLoadingRevenues(true);
  try {
    const res = await fetch(`/api/revenues?requestId=${request.id}`);
    const data = await res.json();
    if (data.success) setRevenues(data.data || []);
  } catch (err) { console.error(err); }
  finally { setLoadingRevenues(false); }
}, [request?.id, request?.bookingCode]);
```

**Revenue interface:**
```tsx
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
  requestId: string;
}
```

## Success Criteria

- [ ] Revenue section appears for requests with bookingCode
- [ ] Summary card shows correct totals
- [ ] Can add new revenue via dialog
- [ ] Can edit existing revenue
- [ ] Can delete unlocked revenue
- [ ] Lock/unlock works correctly
- [ ] Only visible to users with revenue:view permission

## Risks

- **Low:** Component props may need adjustment for context
