import type { DateRangeOption } from './validations/report-validation';

// Re-export DateRangeOption for consumers
export type { DateRangeOption } from './validations/report-validation';

// ============================================
// Date Range Types and Functions
// ============================================

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
 * Get comparison date range (previous period of same duration)
 */
export function getComparisonRange(range: DateRangeOption): DateRange {
  const current = getDateRange(range);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let startDate: Date;
  let endDate: Date;

  // Calculate comparison period based on range type
  switch (range) {
    case 'thisMonth':
      // Previous month
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      break;

    case 'lastMonth':
      // Month before last
      startDate = new Date(year, month - 2, 1);
      endDate = new Date(year, month - 1, 0, 23, 59, 59);
      break;

    case 'last3Months':
      // 3 months before the current 3-month period
      startDate = new Date(year, month - 5, 1);
      endDate = new Date(year, month - 2, 0, 23, 59, 59);
      break;

    case 'last6Months':
      // 6 months before the current 6-month period
      startDate = new Date(year, month - 11, 1);
      endDate = new Date(year, month - 5, 0, 23, 59, 59);
      break;

    case 'thisYear':
      // Previous year
      startDate = new Date(year - 1, 0, 1);
      endDate = new Date(year - 1, 11, 31, 23, 59, 59);
      break;

    default:
      // Fallback: previous period based on duration
      const duration = current.endDate.getTime() - current.startDate.getTime();
      startDate = new Date(current.startDate.getTime() - duration - 1);
      endDate = new Date(current.startDate.getTime() - 1);
  }

  return { startDate, endDate, label: 'Ky truoc' };
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
 * Calculate percentage change between current and previous values
 */
export function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

// ============================================
// Dashboard Response Types
// ============================================

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

// ============================================
// Revenue Trend Response Types
// ============================================

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

// ============================================
// Cost Breakdown Response Types
// ============================================

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

// ============================================
// Funnel Response Types
// ============================================

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
