# Phase 1: Schemas & Utilities

## Context
- **Plan:** [plan.md](./plan.md)
- **Research:** [researcher-01-report-patterns.md](./research/researcher-01-report-patterns.md)

## Overview
- **Date:** 2026-01-09
- **Status:** completed
- **Completed:** 2026-01-09
- **Effort:** 1h

## Requirements

1. Zod schema for date range validation (query params)
2. Date range utility functions (fixed ranges)
3. Shared response types

---

## Implementation Steps

### Step 1: Create Report Validation Schema

**File:** `src/lib/validations/report-validation.ts`

```typescript
import { z } from 'zod';

// Fixed date range options
export const DATE_RANGE_OPTIONS = [
  'thisMonth',
  'lastMonth',
  'last3Months',
  'last6Months',
  'thisYear'
] as const;

export type DateRangeOption = typeof DATE_RANGE_OPTIONS[number];

// Query params schema
export const reportQuerySchema = z.object({
  range: z.enum(DATE_RANGE_OPTIONS, {
    message: 'Khoang thoi gian khong hop le'
  }).default('thisMonth'),
});

export type ReportQueryParams = z.infer<typeof reportQuerySchema>;

// Extract errors helper
export function extractReportZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
```

### Step 2: Create Date Range Utilities

**File:** `src/lib/report-utils.ts`

```typescript
import type { DateRangeOption } from './validations/report-validation';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

/**
 * Get start/end dates for fixed range option
 */
export function getDateRange(range: DateRangeOption): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let startDate: Date;
  let endDate: Date;
  let label: string;

  switch (range) {
    case 'thisMonth':
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
      label = `Thang ${month + 1}/${year}`;
      break;

    case 'lastMonth':
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      label = `Thang ${month}/${year}`;
      break;

    case 'last3Months':
      startDate = new Date(year, month - 2, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
      label = '3 thang gan day';
      break;

    case 'last6Months':
      startDate = new Date(year, month - 5, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
      label = '6 thang gan day';
      break;

    case 'thisYear':
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
      label = `Nam ${year}`;
      break;

    default:
      // Default to this month
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
      label = `Thang ${month + 1}/${year}`;
  }

  return { startDate, endDate, label };
}

/**
 * Get comparison date range (previous period)
 */
export function getComparisonRange(range: DateRangeOption): DateRange {
  const { startDate, endDate } = getDateRange(range);
  const duration = endDate.getTime() - startDate.getTime();

  return {
    startDate: new Date(startDate.getTime() - duration - 1),
    endDate: new Date(startDate.getTime() - 1),
    label: 'Ky truoc'
  };
}

/**
 * Format period key for grouping (YYYY-MM)
 */
export function formatPeriodKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calculate percentage change
 */
export function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}
```

### Step 3: Create Response Types

Add to `src/lib/report-utils.ts`:

```typescript
// Dashboard response types
export interface KpiCards {
  totalBookings: number;
  totalRevenue: number;
  totalProfit: number;
  activeRequests: number;
  conversionRate: number;
}

export interface ComparisonMetric {
  current: number;
  previous: number;
  changePercent: number;
}

export interface DashboardResponse {
  kpiCards: KpiCards;
  comparison: {
    bookings: ComparisonMetric;
    revenue: ComparisonMetric;
  };
  dateRange: DateRange;
}

export interface TrendDataPoint {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface RevenueTrendResponse {
  data: TrendDataPoint[];
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgMonthly: number;
  };
  dateRange: DateRange;
}

export interface CostByType {
  type: string;
  amount: number;
  percentage: number;
}

export interface CostBreakdownResponse {
  byServiceType: CostByType[];
  paymentStatus: {
    paid: number;
    partial: number;
    unpaid: number;
  };
  dateRange: DateRange;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface FunnelResponse {
  stages: FunnelStage[];
  conversionRate: number;
  dateRange: DateRange;
}
```

---

## Success Criteria

- [x] `reportQuerySchema` validates range param
- [x] `getDateRange()` returns correct dates for all 5 options
- [x] `getComparisonRange()` returns previous period
- [x] All response types exported

## Next Steps

Proceed to [phase-02-api-endpoints.md](./phase-02-api-endpoints.md)
