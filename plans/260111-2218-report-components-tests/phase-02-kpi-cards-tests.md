# Phase 02: KPI Cards Tests

**Effort**: 45 minutes
**Output**: `src/components/reports/__tests__/kpi-cards.test.tsx`
**Target**: ~12 tests

## Component Analysis

**File**: `src/components/reports/kpi-cards.tsx` (98 lines)

### Props Interface

```typescript
interface Props {
  data: DashboardResponse | null;
  loading?: boolean;
}
```

### Key Features

1. **5 KPI Cards** with icons (FileText, DollarSign, Wallet, Users, Target)
2. **Trend badges** for bookings and revenue (green/red with arrows)
3. **Locale formatting** - Vietnamese number format, currency with ₫
4. **Loading state** - 5 skeleton cards
5. **Memoized** with `React.memo()`

### Data Flow

```typescript
KPI_CONFIG.map() → data.kpiCards[key] + data.comparison[compKey]
```

## Test Cases

### 1. Rendering Tests (~4 tests)

```typescript
describe('KPICards Rendering', () => {
  it('renders 5 KPI cards with correct labels', () => {
    render(<KPICards data={mockDashboardResponse} />);

    expect(screen.getByText('Tổng Booking')).toBeInTheDocument();
    expect(screen.getByText('Tổng Doanh thu')).toBeInTheDocument();
    expect(screen.getByText('Tổng Lợi nhuận')).toBeInTheDocument();
    expect(screen.getByText('Yêu cầu đang xử lý')).toBeInTheDocument();
    expect(screen.getByText('Tỷ lệ chuyển đổi')).toBeInTheDocument();
  });

  it('renders icons for each card', () => {
    // Check lucide icons are rendered (via testId or parent class)
  });

  it('renders null when data is null and not loading', () => {
    const { container } = render(<KPICards data={null} loading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies grid layout classes', () => {
    const { container } = render(<KPICards data={mockDashboardResponse} />);
    expect(container.firstChild).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-5');
  });
});
```

### 2. Value Formatting Tests (~4 tests)

```typescript
describe('KPICards Value Formatting', () => {
  it('formats booking count with Vietnamese locale', () => {
    render(<KPICards data={createMockDashboardResponse({
      kpiCards: { ...mockDashboardResponse.kpiCards, totalBookings: 1234 }
    })} />);

    expect(screen.getByText('1.234')).toBeInTheDocument();
  });

  it('formats revenue with currency symbol', () => {
    render(<KPICards data={mockDashboardResponse} />);

    // 150000000 → "150.000.000 ₫"
    expect(screen.getByText(/150\.000\.000.*₫/)).toBeInTheDocument();
  });

  it('formats profit with currency symbol', () => {
    render(<KPICards data={mockDashboardResponse} />);

    // 45000000 → "45.000.000 ₫"
    expect(screen.getByText(/45\.000\.000.*₫/)).toBeInTheDocument();
  });

  it('formats conversion rate as percentage', () => {
    render(<KPICards data={mockDashboardResponse} />);

    // 28.5 → "28.5%"
    expect(screen.getByText('28.5%')).toBeInTheDocument();
  });
});
```

### 3. Trend Badge Tests (~3 tests)

```typescript
describe('KPICards Trend Badges', () => {
  it('shows positive trend badge for bookings increase', () => {
    render(<KPICards data={mockDashboardResponse} />);

    // +10.5% with TrendingUp icon
    expect(screen.getByText(/\+10\.5%/)).toBeInTheDocument();
  });

  it('shows negative trend badge for revenue decrease', () => {
    const negativeData = createMockDashboardResponse({
      comparison: {
        bookings: { current: 30, previous: 40, changePercent: -25 },
        revenue: { current: 100000000, previous: 150000000, changePercent: -33.3 },
      }
    });

    render(<KPICards data={negativeData} />);
    expect(screen.getByText(/-33\.3%/)).toBeInTheDocument();
  });

  it('does not show trend badge for cards without comparison', () => {
    render(<KPICards data={mockDashboardResponse} />);

    // Profit, activeRequests, conversionRate have no comparison
    // Count badges - should be exactly 2 (bookings + revenue)
    const badges = screen.getAllByRole('status');
    expect(badges).toHaveLength(2);
  });
});
```

### 4. Loading State Tests (~1 test)

```typescript
describe('KPICards Loading State', () => {
  it('renders 5 skeleton cards when loading', () => {
    render(<KPICards data={null} loading={true} />);

    const skeletons = screen.getAllByTestId('skeleton');
    // 3 skeletons per card × 5 cards = 15 total
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});
```

## Mock Requirements

- No Recharts mocking needed (no charts in this component)
- Standard RTL setup with mock data

## Test File Structure

```typescript
// src/components/reports/__tests__/kpi-cards.test.tsx
import { render, screen } from '@testing-library/react';
import { KPICards } from '../kpi-cards';
import {
  mockDashboardResponse,
  createMockDashboardResponse
} from './test-utils';

describe('KPICards', () => {
  describe('Rendering', () => { ... });
  describe('Value Formatting', () => { ... });
  describe('Trend Badges', () => { ... });
  describe('Loading State', () => { ... });
});
```

## Verification

- [ ] All 5 KPI labels render correctly
- [ ] Currency formatting works (Vietnamese locale with ₫)
- [ ] Percentage formatting works
- [ ] Trend badges show correct direction (up/down)
- [ ] Loading skeleton renders 5 cards
- [ ] Null data returns null component
