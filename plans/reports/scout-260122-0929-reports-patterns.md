# Scout Report: Reports, API, and Chart Implementation Patterns

**Date**: 2026-01-22  
**Codebase**: vivatour-app (Next.js 16 + React 19 + TypeScript)

## 1. EXISTING REPORT API PATTERNS

### Location: `src/app/api/reports/` (9 endpoints)

| Endpoint | Purpose |
|----------|---------|
| `/api/reports/revenue-breakdown` | Revenue by type, source, currency |
| `/api/reports/operator-costs` | Costs by service type/supplier/month |
| `/api/reports/operator-payments` | Operator payment tracking |
| `/api/reports/revenue-trend` | Monthly revenue/cost/profit trends |
| `/api/reports/cost-breakdown` | Service type & payment status |
| `/api/reports/profit` | Profit per booking analysis |
| `/api/reports/funnel` | Request funnel F1-F5 |
| `/api/reports/dashboard` | KPI cards & comparisons |
| `/api/reports/supplier-balance` | Supplier balances |

### API Response Structure
```
{ success: boolean, data?: {...}, error?: string, dateRange?: {...} }
```

### Auth Pattern
- Check session with `auth()`
- Verify `hasPermission(role, 'revenue:view')`
- Query params: range, startDate, endDate (YYYY-MM-DD)
- Date validation via Zod schema `reportQuerySchema`

## 2. REPORT UTILITIES

### `src/lib/report-utils.ts`
- `getDateRange(range, customDates?)` → { startDate, endDate, label }
- `getComparisonRange(range)` → Previous period
- `formatPeriodKey(date)` → "YYYY-MM"
- `calcChangePercent(current, previous)` → % change

### Response Types
- RevenueTrendResponse
- CostBreakdownResponse
- FunnelResponse
- DashboardResponse
- KpiCards

## 3. CHART IMPLEMENTATIONS

### Chart Files Location: `src/components/reports/` and feature dirs

| Chart | Component | Library |
|-------|-----------|---------|
| Revenue Trend | revenue-trend-chart.tsx | Recharts (ComposedChart) |
| Cost Breakdown | cost-breakdown-chart.tsx | Recharts (PieChart) |
| Funnel | funnel-chart.tsx | Recharts |
| Cost by Service | operators/reports/cost-by-service-chart.tsx | Custom bars |

### Chart Pattern
```typescript
export const ChartName = memo(function(...) {
  const chartData = useMemo(() => {...}, [data]);
  if (loading) return <Skeleton />;
  if (!data) return null;
  return <Card><ResponsiveContainer>{Chart}</ResponsiveContainer></Card>;
});
```

### Styling
- Colors: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
- Bar radius: [4, 4, 0, 0]
- Custom formatters for currency/dates/large numbers
- Vietnamese labels

## 4. FILTER COMPONENTS

### OperatorListFilters Pattern
Location: `src/components/operators/operator-list-filters.tsx`

State:
```typescript
interface OperatorFilters {
  search?: string;
  serviceType?: string;
  paymentStatus?: string;
  fromDate?: string;
  toDate?: string;
  isLocked?: boolean;
  includeArchived?: boolean;
}
```

Layout (2 rows):
- Row 1: Search + Service Type dropdown + Payment Status dropdown
- Row 2: From Date + To Date + Lock Status + Archive checkbox + Clear button

## 5. DATA FETCHING HOOKS

### `src/hooks/use-revenue-reports.ts`
```typescript
useRevenueReports(dateRange: DateRangeOption, customDates?: CustomDateRange)
→ { data, loading, error, refetch }
```

Uses:
- AbortController for cancellation
- safeFetch<T>() from @/lib/api/fetch-utils
- useState for loading/error/data
- useCallback for refetch

## 6. CONFIGURATIONS

### `src/config/operator-config.ts`
- SERVICE_TYPES: HOTEL, RESTAURANT, TRANSPORT, GUIDE, VISA, VMB, CRUISE, ACTIVITY, OTHER
- PAYMENT_STATUSES: PENDING, PARTIAL, PAID
- HISTORY_ACTIONS: CREATE, UPDATE, DELETE, LOCK_*, APPROVE
- Each exports key arrays for mapping

### `src/config/revenue-config.ts`
- PAYMENT_TYPES
- PAYMENT_SOURCES
- CURRENCIES

## 7. TYPES

Main file: `src/types/index.ts`

Key types:
- DateRangeOption (string literal union)
- CustomDateRange { startDate?, endDate? }
- OperatorFilters
- CostByServiceType

## 8. TESTS

Location: `src/components/[feature]/__tests__/[component].test.tsx`

Files exist for:
- revenue-trend-chart, cost-breakdown-chart, funnel-chart
- operator-list-filters
- kpi-cards
- revenue-summary-card, revenue-table

## 9. SUPPORTING COMPONENTS

- `reports/kpi-cards.tsx`
- `reports/date-range-selector.tsx`
- `reports/custom-date-range-picker.tsx`
- `reports/export-dropdown.tsx`

## KEY PATTERNS

1. **API**: Consistent response structure, auth checks, Vietnamese errors
2. **Charts**: Memoized + useMemo transforms, Recharts, ResponsiveContainer
3. **Dates**: Centralized utilities, YYYY-MM-DD input, custom formatters
4. **Filters**: Form state pattern, update callbacks
5. **Config**: Service types, payment statuses, constants
6. **Hooks**: Custom data fetching with AbortController
7. **Types**: Full TypeScript, Zod validation

## CORE FILES FOUND

Report APIs:
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\reports\revenue-breakdown\route.ts
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\reports\operator-costs\route.ts
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\reports\profit\route.ts
- And 6 more in same directory

Utilities:
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\lib\report-utils.ts
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\lib\validations\report-validation.ts

Charts:
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\reports\revenue-trend-chart.tsx
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\reports\cost-breakdown-chart.tsx
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\reports\funnel-chart.tsx
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\operators\reports\cost-by-service-chart.tsx

Filters:
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\operators\operator-list-filters.tsx
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\requests\request-filters.tsx

Hooks:
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\hooks\use-revenue-reports.ts

Config:
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\config\operator-config.ts
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\config\revenue-config.ts
