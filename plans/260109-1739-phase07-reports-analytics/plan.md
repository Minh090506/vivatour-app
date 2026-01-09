---
title: "Phase 07 Reports & Analytics"
description: "Dashboard KPIs, charts, and Excel export for business analytics"
status: pending
priority: P2
effort: 6h
branch: master
tags: [reports, analytics, charts, export, recharts, xlsx]
created: 2026-01-09
---

# Phase 07: Reports & Analytics

## Overview

Implement business analytics dashboard with 5 KPI cards showing MoM changes, interactive charts (revenue trends, cost breakdown, conversion funnel), and Excel export functionality.

## Phases

| Phase | Description | Effort | Status |
|-------|-------------|--------|--------|
| [Phase 1](./phase-01-api-endpoints.md) | API endpoints for dashboard stats, trends, funnel | 2h | pending |
| [Phase 2](./phase-02-dashboard-charts.md) | Dashboard UI with KPI cards and chart components | 3h | pending |
| [Phase 3](./phase-03-excel-export.md) | Excel export with SheetJS (xlsx) | 1h | pending |

## Key Deliverables

1. **Dashboard Stats API** - `/api/reports/dashboard-stats`
   - Revenue, Cost, Profit, Bookings, Conversion Rate
   - Month-over-Month percentage change

2. **Chart Components**
   - Revenue trends line chart (monthly)
   - Cost breakdown pie chart (by service type)
   - Conversion funnel (LEAD -> QUOTE -> FOLLOWUP -> OUTCOME)

3. **Excel Export**
   - Export dashboard data to .xlsx
   - Server-side generation via API route

## Tech Stack

- recharts 3.6.0 (already installed)
- xlsx (SheetJS) - to be installed
- Prisma aggregations
- shadcn/ui Card components

## Dependencies

- Existing: `/api/reports/operator-costs`, `/api/reports/profit`, `/api/revenues/sales`
- Data models: Request (stage field), Operator (serviceType, totalCost), Revenue (amountVND)

## Success Criteria

- [ ] Dashboard shows real-time KPIs (not mock data)
- [ ] All 3 chart types render correctly with responsive layout
- [ ] MoM percentage changes calculated accurately
- [ ] Excel export downloads valid .xlsx file
- [ ] Mobile-responsive dashboard grid

## Research References

- [Recharts Patterns](./research/researcher-01-recharts-patterns.md)
- [Excel Export Patterns](./research/researcher-02-xlsx-export.md)

## Related Files

```
src/app/(dashboard)/page.tsx          # Update dashboard
src/app/api/reports/                  # API endpoints
src/components/reports/               # New chart components
src/lib/export.ts                     # Export utility
```

---

## Validation Summary

**Validated:** 2026-01-09
**Questions asked:** 7

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Conversion rate formula | Bookings/Leads (simple, current month) |
| Date filtering | Fixed ranges for MVP (no date picker) |
| Report permissions | ADMIN + ACCOUNTANT only |
| Funnel visualization | Horizontal bar chart (stable, clear) |
| KPI cards layout | 5 cards with responsive grid |
| Export detail level | Summaries only (matches dashboard) |
| API caching | No caching for MVP (real-time data) |

### Action Items

- [x] No plan changes required - all decisions align with current implementation
- [ ] Ensure permission check uses `revenue:view` for ADMIN/ACCOUNTANT roles
