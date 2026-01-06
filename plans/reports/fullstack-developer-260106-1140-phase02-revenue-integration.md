# Phase 02: Revenue Integration Report

**Date:** 2026-01-06 11:40
**Status:** Done
**Plan:** plans/260106-1057-revenue-integration/phase-02-request-detail-integration.md

## Summary

Integrated revenue components (RevenueTable, RevenueForm, RevenueSummaryCard) into `RequestDetailPanel` to allow viewing and managing revenues within the request detail view.

## Changes Made

### File: `src/components/requests/request-detail-panel.tsx`

**Added:**
- Imports: `useEffect`, `useState`, `useCallback`, `usePermission`, Dialog components, revenue components, Plus icon
- `RevenueFromApi` interface for type safety
- State: `revenues`, `editingRevenue`, `dialogOpen`, `loadingRevenues`
- `fetchRevenues` callback - fetches `/api/revenues?requestId=X`
- `useEffect` to fetch revenues when request changes
- Revenue Card section with:
  - Permission-gated visibility (`can('revenue:view')`)
  - RevenueSummaryCard showing totals
  - "Thêm thu nhập" button gated by `can('revenue:manage')`
  - RevenueTable with edit/refresh callbacks
  - Lock/unlock support for ADMIN users
- Dialog with RevenueForm for add/edit operations
- Handler functions: `handleAddRevenue`, `handleEditRevenue`, `handleDialogClose`, `handleRevenueSuccess`

## Technical Notes

- Type compatibility: Used `RevenueFromApi` interface to bridge between RevenueTable's `Revenue` type and RevenueForm's `RevenueData` type
- Cast in `onEdit` callback: `(rev) => handleEditRevenue(rev as RevenueFromApi)` to handle type mismatch
- Revenue section only shows for requests with `bookingCode` (consistent with Services section pattern)
- Loading state shows "Đang tải dữ liệu..." while fetching

## Build Verification

- ✅ `npm run build` passed
- ✅ TypeScript compilation successful
- ✅ No ESLint errors

## Integration Points

- API: `GET /api/revenues?requestId={id}` - fetches revenues for specific request
- Permission: Uses `usePermission` hook for `revenue:view` and `revenue:manage` checks
- Refresh: Calls `fetchRevenues()` after CRUD operations

## UI Layout

```
RequestDetailPanel
├── ...existing sections...
├── Services Table (bookingCode only)
└── Revenue Section (bookingCode + revenue:view permission)
    ├── Header: "Doanh thu (count)" + Add button
    ├── RevenueSummaryCard (if revenues exist)
    └── RevenueTable

Dialog (for add/edit)
└── RevenueForm
```
