---
title: "Phase 07.2 - Dashboard Report UI"
description: "Build dashboard UI with KPI cards, charts (Line, Pie, Bar) consuming 4 report APIs"
status: in-progress
priority: P1
effort: 6h
branch: master
tags: [reports, dashboard, recharts, ui]
created: 2026-01-09
---

# Phase 07.2 - Dashboard Report UI

## Overview

Build `/reports` dashboard page consuming 4 APIs from Phase 07.1:
- Dashboard KPIs + comparison
- Revenue trend (monthly line chart)
- Cost breakdown (pie + bar)
- Sales funnel (horizontal bar)

## File Structure

```
src/
├── app/(dashboard)/reports/page.tsx       # Main page
├── components/reports/
│   ├── kpi-cards.tsx                      # 5 KPI cards with comparison %
│   ├── revenue-trend-chart.tsx            # LineChart revenue/cost/profit
│   ├── cost-breakdown-chart.tsx           # PieChart + PaymentStatus bars
│   ├── funnel-chart.tsx                   # Horizontal BarChart stages
│   └── date-range-selector.tsx            # Select component
└── hooks/
    └── use-reports.ts                     # Data fetching hook
```

## API Endpoints

| Endpoint | Data | Chart Type |
|----------|------|------------|
| `/api/reports/dashboard` | KPI metrics + comparison | Cards |
| `/api/reports/revenue-trend` | Monthly revenue/cost/profit | LineChart |
| `/api/reports/cost-breakdown` | byServiceType + paymentStatus | PieChart + Bars |
| `/api/reports/funnel` | stages + conversionRate | Horizontal BarChart |

## Implementation Phases

### Phase 1: Hook + Page Shell (1.5h)
1. Create `use-reports.ts` hook with AbortController pattern
2. Create page.tsx with permission check (`isAdmin || isAccountant`)
3. Add loading skeletons + error handling

### Phase 2: KPI Cards (1h)
1. 5 cards: bookings, revenue, profit, activeRequests, conversionRate
2. Comparison % badge (green up / red down)
3. Icon per metric

### Phase 3: Revenue Trend Chart (1.5h)
1. ComposedChart: revenue + cost lines, profit bars
2. Custom tooltip with formatCurrency
3. Vietnamese month labels

### Phase 4: Cost & Funnel Charts (2h)
1. PieChart for service type breakdown
2. Horizontal bars for payment status
3. Funnel BarChart with stage colors

## Key Patterns

- **Fetch:** AbortController + safeFetch from existing pattern
- **Charts:** ResponsiveContainer + h-[400px] parent
- **Colors:** Green `#22c55e`, Red `#ef4444`, Blue `#3b82f6`
- **Tooltips:** Custom HTML with formatCurrency
- **Labels:** Vietnamese (Doanh thu, Chi phi, Loi nhuan)

## Deliverables

- [x] `use-reports.ts` hook
- [x] `/reports` page with permission gate
- [x] 5 chart/card components
- [x] Loading skeletons
- [x] Error handling with ErrorFallback

## Dependencies

- Recharts (already installed)
- shadcn/ui Card, Select, Badge, Skeleton
- formatCurrency from @/lib/utils

## Completion Status - Phase 1: Hook + Page Shell

**Status:** DONE
**Timestamp:** 2026-01-09

### Files Implemented
- `src/hooks/use-reports.ts` - Data fetching hook with AbortController pattern
- `src/components/reports/date-range-selector.tsx` - Date range selector component
- `src/components/reports/kpi-cards.tsx` - 5 KPI cards with comparison % badges
- `src/components/reports/revenue-trend-chart.tsx` - ComposedChart with revenue/cost/profit
- `src/components/reports/cost-breakdown-chart.tsx` - PieChart + PaymentStatus bars
- `src/components/reports/funnel-chart.tsx` - Horizontal BarChart with conversion stages
- `src/app/(dashboard)/reports/page.tsx` - Main reports page with permission gate

### Quality Metrics
- **Tests:** 497 tests passed
- **Code Review:** Completed with memoization optimizations applied
- **Performance:** Components memoized for re-render prevention
- **Error Handling:** Integrated ErrorFallback with AbortController support
- **Loading States:** Skeleton loaders implemented for all chart components
