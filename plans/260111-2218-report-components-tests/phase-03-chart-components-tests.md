# Phase 03: Chart Components Tests

**Status**: DONE (2026-01-11)
**Effort**: 90 minutes
**Output**: 3 test files
**Target**: ~32 tests total

## Strategy: Recharts Mocking

All 3 chart components use Recharts. Mock at module level:

```typescript
jest.mock('recharts', () => require('./test-utils').createRechartsMock());
```

This replaces Recharts components with simple divs that:
- Have data-testid for querying
- Receive data via data-* attributes for assertions
- Render children for nested structure

---

## Component 1: RevenueTrendChart

**File**: `src/components/reports/revenue-trend-chart.tsx` (162 lines)
**Tests**: ~10

### Key Features

- ComposedChart: Bar (profit) + 2 Lines (revenue, cost)
- Period formatting: "YYYY-MM" → "Th.M/YY"
- Custom tooltip with currency formatting
- Empty state message
- Loading skeleton

### Test Cases

```typescript
describe('RevenueTrendChart', () => {
  describe('Rendering', () => {
    it('renders card with title "Xu hướng Doanh thu"');
    it('renders TrendingUp icon in header');
    it('renders null when data is null and not loading');
  });

  describe('Chart Structure', () => {
    it('passes correct data length to ComposedChart');
    it('renders Bar for profit with green color');
    it('renders Line for revenue with blue color');
    it('renders Line for cost with red color');
  });

  describe('Period Formatting', () => {
    it('transforms period "2026-01" to "Th.1/26"');
    it('transforms period "2025-12" to "Th.12/25"');
  });

  describe('Empty State', () => {
    it('shows "Không có dữ liệu" when data array is empty');
  });

  describe('Loading State', () => {
    it('renders skeleton when loading');
    it('shows card header during loading');
  });
});
```

### Data Transformation Test

Extract `formatPeriod` function for direct testing:

```typescript
// Test formatPeriod logic
expect(formatPeriod('2026-01')).toBe('Th.1/26');
expect(formatPeriod('2025-12')).toBe('Th.12/25');
```

---

## Component 2: CostBreakdownChart

**File**: `src/components/reports/cost-breakdown-chart.tsx` (169 lines)
**Tests**: ~12

### Key Features

- PieChart for service type breakdown
- Horizontal progress bars for payment status
- Vietnamese service type labels
- Payment status colors (green/amber/red)

### Test Cases

```typescript
describe('CostBreakdownChart', () => {
  describe('Rendering', () => {
    it('renders card with title "Phân tích Chi phí"');
    it('renders PieChartIcon in header');
    it('renders 2-column grid layout');
  });

  describe('Pie Chart Section', () => {
    it('renders "Theo loại dịch vụ" label');
    it('passes correct data length to Pie');
    it('transforms service types to Vietnamese labels');
  });

  describe('Payment Status Bars', () => {
    it('renders "Theo trạng thái thanh toán" label');
    it('renders 3 payment status bars');
    it('shows "Đã thanh toán" with green color');
    it('shows "Thanh toán một phần" with amber color');
    it('shows "Chưa thanh toán" with red color');
    it('calculates percentage widths correctly');
  });

  describe('Empty States', () => {
    it('shows "Không có dữ liệu" when byServiceType is empty');
  });

  describe('Loading State', () => {
    it('renders skeleton when loading');
  });
});
```

### Service Type Label Mapping

Test the transformation:

```typescript
// Mock data has type: 'HOTEL' → expect "Khách sạn"
// type: 'TRANSPORT' → expect "Vận chuyển"
// type: 'TOUR' → expect "Tour"
```

### Payment Bar Percentage

```typescript
// Total: 70M + 20M + 15M = 105M
// Paid: 70M / 105M = 66.7%
// Check style width attribute
```

---

## Component 3: FunnelChart

**File**: `src/components/reports/funnel-chart.tsx` (137 lines)
**Tests**: ~10

### Key Features

- Horizontal BarChart (layout="vertical")
- Stage labels in Vietnamese
- Conversion rate badge in header
- LabelList for count values
- Gradient colors per stage

### Test Cases

```typescript
describe('FunnelChart', () => {
  describe('Rendering', () => {
    it('renders card with title "Phễu Chuyển đổi"');
    it('renders Filter icon in header');
    it('displays conversion rate in header');
  });

  describe('Conversion Rate Display', () => {
    it('shows "Tỷ lệ chuyển đổi: 30.0%" for 30% rate');
    it('formats rate with 1 decimal place');
  });

  describe('Chart Structure', () => {
    it('renders horizontal BarChart (layout=vertical)');
    it('passes correct data length to chart');
  });

  describe('Stage Labels', () => {
    it('transforms LEAD to "Tiềm năng"');
    it('transforms QUOTE to "Báo giá"');
    it('transforms FOLLOWUP to "Theo dõi"');
    it('transforms OUTCOME to "Kết quả"');
  });

  describe('Empty State', () => {
    it('shows "Không có dữ liệu" when stages array is empty');
  });

  describe('Loading State', () => {
    it('renders skeleton when loading');
  });
});
```

---

## File Structure

```
src/components/reports/__tests__/
├── test-utils.ts                    (Phase 01)
├── kpi-cards.test.tsx               (Phase 02)
├── revenue-trend-chart.test.tsx     (~10 tests)
├── cost-breakdown-chart.test.tsx    (~12 tests)
└── funnel-chart.test.tsx            (~10 tests)
```

## Common Test Pattern

```typescript
// Import order
jest.mock('recharts', () => require('./test-utils').createRechartsMock());

import { render, screen } from '@testing-library/react';
import { ComponentName } from '../component-name';
import { mockResponse, createMockResponse } from './test-utils';

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Tests...
});
```

## Verification Checklist

- [x] All Recharts components mocked (no ResizeObserver errors)
- [x] Chart data length assertions via data-length attribute
- [x] Vietnamese labels render correctly (UTF-8)
- [x] Empty state messages visible
- [x] Loading skeletons render
- [x] Percentage calculations correct
