/**
 * Test utilities for report components
 * - Recharts mock factory
 * - Mock fixtures for all report types
 * - Factory functions with overrides
 */

import React from 'react';
import type { ReactNode } from 'react';
import type {
  DashboardResponse,
  RevenueTrendResponse,
  CostBreakdownResponse,
  FunnelResponse,
  DateRange,
} from '@/lib/report-utils';

// ============================================
// Recharts Mock Factory
// ============================================

interface ChartProps {
  children?: ReactNode;
  data?: unknown[];
  layout?: string;
}

interface BarProps {
  dataKey?: string;
  name?: string;
  fill?: string;
}

interface LineProps {
  dataKey?: string;
  name?: string;
  stroke?: string;
}

interface PieProps {
  data?: unknown[];
  dataKey?: string;
}

interface CellProps {
  fill?: string;
}

/**
 * Create Recharts mock - call in jest.mock('recharts', () => ...)
 * Replaces Recharts components with simple divs for testing
 */
export const createRechartsMock = () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children, data }: ChartProps) => (
    <div data-testid="composed-chart" data-length={data?.length ?? 0}>
      {children}
    </div>
  ),
  BarChart: ({ children, data, layout }: ChartProps) => (
    <div data-testid="bar-chart" data-length={data?.length ?? 0} data-layout={layout}>
      {children}
    </div>
  ),
  PieChart: ({ children }: ChartProps) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Bar: ({ dataKey, name, fill, children }: BarProps & { children?: ReactNode }) => (
    <div data-testid="bar" data-key={dataKey} data-name={name} data-fill={fill}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name, stroke, children }: LineProps & { children?: ReactNode }) => (
    <div data-testid="line" data-key={dataKey} data-name={name} data-stroke={stroke}>
      {children}
    </div>
  ),
  Pie: ({ data, dataKey, children }: PieProps & { children?: ReactNode }) => (
    <div data-testid="pie" data-length={data?.length ?? 0} data-key={dataKey}>
      {children}
    </div>
  ),
  Cell: ({ fill }: CellProps) => <div data-testid="cell" data-fill={fill} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  LabelList: () => <div data-testid="label-list" />,
});

// ============================================
// Mock Date Range
// ============================================

const mockDateRange: DateRange = {
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
  label: 'Thang 1/2026',
};

// ============================================
// Dashboard Response Fixtures
// ============================================

export const mockDashboardResponse: DashboardResponse = {
  kpiCards: {
    totalBookings: 42,
    totalRevenue: 150000000,
    totalProfit: 45000000,
    activeRequests: 15,
    conversionRate: 28.5,
  },
  comparison: {
    bookings: { current: 42, previous: 38, changePercent: 10.5 },
    revenue: { current: 150000000, previous: 120000000, changePercent: 25 },
  },
  dateRange: mockDateRange,
};

export function createMockDashboardResponse(
  overrides?: Partial<DashboardResponse>
): DashboardResponse {
  return {
    ...mockDashboardResponse,
    ...overrides,
    kpiCards: {
      ...mockDashboardResponse.kpiCards,
      ...overrides?.kpiCards,
    },
    comparison: {
      ...mockDashboardResponse.comparison,
      ...overrides?.comparison,
    },
  };
}

export const emptyDashboardResponse: DashboardResponse = {
  kpiCards: {
    totalBookings: 0,
    totalRevenue: 0,
    totalProfit: 0,
    activeRequests: 0,
    conversionRate: 0,
  },
  comparison: {
    bookings: { current: 0, previous: 0, changePercent: 0 },
    revenue: { current: 0, previous: 0, changePercent: 0 },
  },
  dateRange: mockDateRange,
};

// ============================================
// Revenue Trend Response Fixtures
// ============================================

export const mockTrendResponse: RevenueTrendResponse = {
  data: [
    { period: '2025-11', revenue: 100000000, cost: 60000000, profit: 40000000 },
    { period: '2025-12', revenue: 120000000, cost: 70000000, profit: 50000000 },
    { period: '2026-01', revenue: 150000000, cost: 105000000, profit: 45000000 },
  ],
  summary: {
    totalRevenue: 370000000,
    totalCost: 235000000,
    totalProfit: 135000000,
    avgMonthly: 123333333,
  },
  dateRange: mockDateRange,
};

export function createMockTrendResponse(
  overrides?: Partial<RevenueTrendResponse>
): RevenueTrendResponse {
  return {
    ...mockTrendResponse,
    ...overrides,
    summary: {
      ...mockTrendResponse.summary,
      ...overrides?.summary,
    },
  };
}

export const emptyTrendResponse: RevenueTrendResponse = {
  data: [],
  summary: {
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgMonthly: 0,
  },
  dateRange: mockDateRange,
};

// ============================================
// Cost Breakdown Response Fixtures
// ============================================

export const mockCostResponse: CostBreakdownResponse = {
  byServiceType: [
    { type: 'HOTEL', amount: 50000000, percentage: 47.6 },
    { type: 'TRANSPORT', amount: 30000000, percentage: 28.6 },
    { type: 'TOUR', amount: 25000000, percentage: 23.8 },
  ],
  paymentStatus: {
    paid: 70000000,
    partial: 20000000,
    unpaid: 15000000,
  },
  dateRange: mockDateRange,
};

export function createMockCostResponse(
  overrides?: Partial<CostBreakdownResponse>
): CostBreakdownResponse {
  return {
    ...mockCostResponse,
    ...overrides,
    paymentStatus: {
      ...mockCostResponse.paymentStatus,
      ...overrides?.paymentStatus,
    },
  };
}

export const emptyCostResponse: CostBreakdownResponse = {
  byServiceType: [],
  paymentStatus: {
    paid: 0,
    partial: 0,
    unpaid: 0,
  },
  dateRange: mockDateRange,
};

// ============================================
// Funnel Response Fixtures
// ============================================

export const mockFunnelResponse: FunnelResponse = {
  stages: [
    { stage: 'LEAD', count: 100, percentage: 100 },
    { stage: 'QUOTE', count: 60, percentage: 60 },
    { stage: 'FOLLOWUP', count: 45, percentage: 45 },
    { stage: 'OUTCOME', count: 30, percentage: 30 },
  ],
  conversionRate: 30,
  dateRange: mockDateRange,
};

export function createMockFunnelResponse(
  overrides?: Partial<FunnelResponse>
): FunnelResponse {
  return {
    ...mockFunnelResponse,
    ...overrides,
  };
}

export const emptyFunnelResponse: FunnelResponse = {
  stages: [],
  conversionRate: 0,
  dateRange: mockDateRange,
};

// ============================================
// ResizeObserver Mock
// ============================================

export function setupResizeObserverMock(): void {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}
