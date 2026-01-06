# Phase 02: Integrate Revenue Components into Request Detail

**Parent:** [plan.md](./plan.md)
**Date:** 2026-01-06
**Priority:** P1
**Status:** pending
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

- [ ] Import revenue components in `request-detail-panel.tsx`
- [ ] Add state for revenues list, editing revenue, dialog open
- [ ] Add `fetchRevenues` function to load revenues by requestId
- [ ] Call `fetchRevenues` when request changes
- [ ] Add Revenue Card section after Services Table
- [ ] Add Dialog with RevenueForm for add/edit
- [ ] Wire up refresh callback for CRUD operations
- [ ] Add permission check using `usePermission`

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
