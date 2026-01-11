# Phase 01: Test Setup and Mocks

**Effort**: 30 minutes
**Output**: `src/components/reports/__tests__/test-utils.ts`

## Objective

Create shared test utilities with Recharts mocking strategy and mock fixtures for all report components.

## Tasks

### 1. Create test-utils.ts

Create `src/components/reports/__tests__/test-utils.ts` with:

#### Recharts Mock Module

```typescript
// Recharts mock factory - exports function to call in jest.mock()
export const createRechartsMock = () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="composed-chart" data-length={data?.length ?? 0}>{children}</div>
  ),
  BarChart: ({ children, data, layout }: { children: React.ReactNode; data?: unknown[]; layout?: string }) => (
    <div data-testid="bar-chart" data-length={data?.length ?? 0} data-layout={layout}>{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Bar: ({ dataKey, name }: { dataKey: string; name?: string }) => (
    <div data-testid="bar" data-key={dataKey} data-name={name} />
  ),
  Line: ({ dataKey, name }: { dataKey: string; name?: string }) => (
    <div data-testid="line" data-key={dataKey} data-name={name} />
  ),
  Pie: ({ data, dataKey }: { data?: unknown[]; dataKey?: string }) => (
    <div data-testid="pie" data-length={data?.length ?? 0} data-key={dataKey} />
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  LabelList: () => <div data-testid="label-list" />,
});
```

#### Mock Fixtures

```typescript
// Dashboard KPI response
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
  dateRange: {
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
    label: 'Thang 1/2026',
  },
};

// Revenue trend response
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
  dateRange: { ... },
};

// Cost breakdown response
export const mockCostResponse: CostBreakdownResponse = {
  byServiceType: [
    { type: 'HOTEL', amount: 50000000, percentage: 47.6 },
    { type: 'TRANSPORT', amount: 30000000, percentage: 28.6 },
    { type: 'TOUR', amount: 25000000, percentage: 23.8 },
  ],
  paymentStatus: { paid: 70000000, partial: 20000000, unpaid: 15000000 },
  dateRange: { ... },
};

// Funnel response
export const mockFunnelResponse: FunnelResponse = {
  stages: [
    { stage: 'LEAD', count: 100, percentage: 100 },
    { stage: 'QUOTE', count: 60, percentage: 60 },
    { stage: 'FOLLOWUP', count: 45, percentage: 45 },
    { stage: 'OUTCOME', count: 30, percentage: 30 },
  ],
  conversionRate: 30,
  dateRange: { ... },
};
```

#### Helper Functions

```typescript
// Create mock with overrides
export function createMockDashboardResponse(overrides?: Partial<DashboardResponse>);
export function createMockTrendResponse(overrides?: Partial<RevenueTrendResponse>);
export function createMockCostResponse(overrides?: Partial<CostBreakdownResponse>);
export function createMockFunnelResponse(overrides?: Partial<FunnelResponse>);

// Empty responses for edge cases
export const emptyDashboardResponse: DashboardResponse;
export const emptyTrendResponse: RevenueTrendResponse;
export const emptyCostResponse: CostBreakdownResponse;
export const emptyFunnelResponse: FunnelResponse;
```

### 2. Jest Setup for Recharts

In each test file, add before imports:

```typescript
// Must be before component import
jest.mock('recharts', () => require('./test-utils').createRechartsMock());
```

### 3. ResizeObserver Mock

Add to jest.setup.js or test-utils.ts:

```typescript
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

## File Structure

```
src/components/reports/__tests__/
└── test-utils.ts (~150 lines)
    ├── Recharts mock factory
    ├── Mock fixtures (4 response types)
    ├── Factory functions (4)
    ├── Empty state fixtures (4)
    └── ResizeObserver polyfill
```

## Verification

- [ ] `npm test -- --testPathPattern=test-utils` passes (if any tests added)
- [ ] No TypeScript errors in fixtures
- [ ] Mock types match actual API response types
