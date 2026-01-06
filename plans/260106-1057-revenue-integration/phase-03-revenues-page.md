# Phase 03: Create Standalone /revenues Management Page

**Parent:** [plan.md](./plan.md)
**Date:** 2026-01-06
**Priority:** P1
**Status:** done
**Review:** pending

## Overview

Create a dedicated `/revenues` page for comprehensive revenue management with filters, search, and full CRUD operations.

## Key Insights

1. Follow `src/app/(dashboard)/requests/page.tsx` pattern
2. Use `RevenueTable` with `showRequest=true` to show booking references
3. Middleware already restricts `/revenue` path to ADMIN/ACCOUNTANT
4. API supports filtering: `?requestId=`, `?search=`, `?paymentType=`

## Requirements

- Full-page layout with header, filters, and revenue table
- Filters: date range, payment type, payment source, search by booking code
- RevenueSummaryCard at top showing totals for filtered results
- RevenueTable with showRequest=true for booking column
- Dialog for add/edit revenue
- Pagination for large datasets
- Permission check: require ADMIN or ACCOUNTANT role

## Architecture

```
/revenues page
├── Header
│   ├── Title: "Quản lý Doanh thu"
│   └── Add Revenue Button
├── Filters Panel
│   ├── Date Range (from/to)
│   ├── Payment Type Select
│   ├── Payment Source Select
│   └── Search Input (booking code)
├── RevenueSummaryCard - filtered totals
├── RevenueTable (showRequest=true)
└── Dialog with RevenueForm
```

## Related Files

| File | Action |
|------|--------|
| `src/app/(dashboard)/revenues/page.tsx` | Create new page |
| `src/middleware.ts` | Already has /revenue route config |

## Implementation Steps

- [ ] Create `src/app/(dashboard)/revenues/page.tsx`
- [ ] Add page header with title and add button
- [ ] Create filter state (dateFrom, dateTo, paymentType, paymentSource, search)
- [ ] Add filter UI with date inputs and selects
- [ ] Add fetch function with filter params
- [ ] Include RevenueSummaryCard with filtered revenues
- [ ] Add RevenueTable with showRequest=true
- [ ] Add Dialog with RevenueForm for add/edit
- [ ] Wire up all CRUD callbacks
- [ ] Test permission restrictions

## Success Criteria

- [ ] Page accessible at /revenues for ADMIN/ACCOUNTANT
- [ ] Filters work correctly (date, type, source, search)
- [ ] Summary shows filtered totals
- [ ] Table shows booking references
- [ ] Can add/edit/delete revenues
- [ ] Lock/unlock works correctly
- [ ] Non-authorized users redirected

## Risks

- **Low:** May need API updates for new filter params
