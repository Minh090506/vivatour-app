# Component Analysis Report

**Generated**: 2026-01-11
**Scope**: 5 report/dashboard components for RTL testing

---

## Component Summary

| Component | Lines | Recharts | Memoized | Data Source | Key Challenges |
|-----------|-------|----------|----------|-------------|----------------|
| KPICards | 98 | No | Yes | DashboardResponse | Locale formatting, trend badges |
| RevenueTrendChart | 162 | Yes | Yes | RevenueTrendResponse | ComposedChart, period transform |
| CostBreakdownChart | 169 | Yes | Yes | CostBreakdownResponse | Pie + progress bars, label mapping |
| FunnelChart | 137 | Yes | Yes | FunnelResponse | Horizontal bar, stage labels |
| FollowUpWidget | 189 | No | No | API fetch | 3 parallel fetches, router |

---

## Data Type Dependencies

All response types from `src/lib/report-utils.ts`:

```typescript
// KPICards
DashboardResponse {
  kpiCards: KpiCards           // 5 metrics
  comparison: { bookings, revenue }  // changePercent
  dateRange: DateRange
}

// RevenueTrendChart
RevenueTrendResponse {
  data: TrendDataPoint[]       // period, revenue, cost, profit
  summary: { ... }
  dateRange: DateRange
}

// CostBreakdownChart
CostBreakdownResponse {
  byServiceType: CostByType[]  // type, amount, percentage
  paymentStatus: { paid, partial, unpaid }
  dateRange: DateRange
}

// FunnelChart
FunnelResponse {
  stages: FunnelStage[]        // stage, count, percentage
  conversionRate: number
  dateRange: DateRange
}
```

---

## Recharts Components Used

| Component | Recharts Elements |
|-----------|-------------------|
| RevenueTrendChart | ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend |
| CostBreakdownChart | ResponsiveContainer, PieChart, Pie, Cell, Tooltip |
| FunnelChart | ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList |

**Mock Strategy**: Replace with simple divs that pass data via attributes.

---

## Vietnamese Text in Components

| Component | Vietnamese Labels |
|-----------|-------------------|
| KPICards | Tổng Booking, Tổng Doanh thu, Tổng Lợi nhuận, Yêu cầu đang xử lý, Tỷ lệ chuyển đổi |
| RevenueTrendChart | Xu hướng Doanh thu, Không có dữ liệu, Doanh thu, Chi phí, Lợi nhuận |
| CostBreakdownChart | Phân tích Chi phí, Theo loại dịch vụ, Theo trạng thái thanh toán, SERVICE_TYPE_LABELS, PAYMENT_LABELS |
| FunnelChart | Phễu Chuyển đổi, Không có dữ liệu, Tỷ lệ chuyển đổi, STAGE_LABELS |
| FollowUpWidget | Follow-up, Xem tất cả, Quá hạn, Hôm nay, Sắp tới, Đang tải, Không có follow-up nào |

---

## Existing Test Patterns (from codebase)

From `src/components/revenues/__tests__/`:

1. **test-utils.ts pattern**:
   - Mock fixtures with factory functions
   - Session/permission mocks
   - Fetch mock setup helpers
   - Reset utilities

2. **Component test pattern**:
   - Grouped by behavior (Rendering, Calculations, States)
   - RTL queries: screen.getByText, getAllByText, getByRole
   - Vietnamese text in assertions (UTF-8)
   - waitFor for async operations

3. **Router mock**:
   ```typescript
   const mockRouter = { push: jest.fn(), ... };
   jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
   ```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Recharts ResizeObserver error | Global mock in jest.setup.js |
| Async state updates | Use waitFor with proper timeout |
| Vietnamese text encoding | Ensure test files are UTF-8 |
| Memoization hiding issues | Test with different props to trigger re-render |
| Parallel fetch race conditions | Mock fetch deterministically |

---

## Estimated Test Count

| Component | Tests | Coverage Focus |
|-----------|-------|----------------|
| KPICards | 12 | Rendering, formatting, trends |
| RevenueTrendChart | 10 | Chart data, period transform, empty |
| CostBreakdownChart | 12 | Pie data, bars, labels |
| FunnelChart | 10 | Stages, conversion rate |
| FollowUpWidget | 14 | Fetch, sections, navigation |
| **Total** | **58** | |

---

## Unresolved Questions

1. **Skeleton testid**: Does Skeleton component have data-testid? May need to query by class.
2. **Badge role**: Does Badge render with role="status"? Verify in actual DOM.
3. **Currency formatting**: `formatCurrency` from `@/lib/utils` - confirm exact output format for assertions.
