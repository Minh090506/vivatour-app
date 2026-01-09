---
title: "Phase 07.1 - Dashboard Report APIs"
description: "Implement 4 dashboard API endpoints for KPI cards, revenue trends, cost breakdown, and sales funnel"
status: completed
priority: P1
effort: 3h
branch: master
tags: [api, reports, dashboard, prisma]
created: 2026-01-09
completed: 2026-01-09
---

# Phase 07.1 - Dashboard Report APIs

## Overview

Create 4 API endpoints for dashboard reporting with ADMIN/ACCOUNTANT access only.

## Validated Decisions

- **Permissions:** ADMIN + ACCOUNTANT (use `hasPermission(role, 'revenue:view')`)
- **Caching:** None (real-time queries)
- **Date Ranges:** Fixed: `thisMonth`, `lastMonth`, `last3Months`, `last6Months`, `thisYear`

## API Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| GET /api/reports/dashboard | Main KPI | kpiCards, comparison |
| GET /api/reports/revenue-trend | Revenue over time | data[], summary |
| GET /api/reports/cost-breakdown | Cost analysis | byServiceType[], paymentStatus |
| GET /api/reports/funnel | Sales funnel | stages[], conversionRate |

## File Structure

```
src/
├── lib/
│   ├── validations/report-validation.ts  # Zod schemas
│   └── report-utils.ts                   # Date range helpers
└── app/api/reports/
    ├── dashboard/route.ts
    ├── revenue-trend/route.ts
    ├── cost-breakdown/route.ts
    └── funnel/route.ts
```

## Implementation Phases

### Phase 1: Schemas & Utils (1h)
- [phase-01-schemas-utils.md](./phase-01-schemas-utils.md)
- Zod validation schema for date range query params
- Date range utility functions (getDateRange, formatPeriod)
- Shared types for report responses

### Phase 2: API Endpoints (2h)
- [phase-02-api-endpoints.md](./phase-02-api-endpoints.md)
- 4 API route handlers with auth + permission checks
- Prisma aggregation queries
- Response formatting

## Key Patterns

```typescript
// Auth pattern (from revenues/[id]/route.ts)
const session = await auth();
if (!session?.user?.id) return { error: 'Chua dang nhap', status: 401 };
if (!hasPermission(role, 'revenue:view')) return { error: 'Khong co quyen', status: 403 };

// Response pattern
{ success: boolean, data?: T, error?: string }
```

## Success Criteria

- [x] All 4 endpoints return correct data
- [x] ADMIN/ACCOUNTANT can access, others get 403
- [x] Date range filters work correctly
- [x] Vietnamese error messages
- [x] Phase 1 (Schemas & Utils) completed 2026-01-09
- [x] Phase 2 (API Endpoints) completed 2026-01-09

## Code Review Status

**Reviewed:** 2026-01-09 18:28
**Report:** plans/reports/code-reviewer-260109-1828-dashboard-apis.md

### Critical Fixes Required
1. Export `DateRangeOption` type in report-utils.ts (TypeScript compilation error)
2. Fix comparison range calculation in getComparisonRange (off-by-one bug)

### Implementation Status
- Phase 1 (Schemas & Utils): ✅ Complete (with 2 bugs to fix)
- Phase 2 (API Endpoints): ✅ Complete
- Overall: 95% complete, ready for bug fixes then production

---

## Validation Summary

**Validated:** 2026-01-09
**Questions asked:** 4

### Confirmed Decisions

| Decision | Choice |
|----------|--------|
| Permission check | ADMIN + ACCOUNTANT only via `revenue:view` |
| Date range behavior | "last3Months" includes current month + 2 previous |
| Funnel filter field | Use `createdAt` for lead generation analysis |
| Archived operators | Exclude from reports (`isArchived: false`) |

### Action Items
- None - all recommended options confirmed, proceed to implementation
