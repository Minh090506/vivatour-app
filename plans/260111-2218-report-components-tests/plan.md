---
title: "RTL Tests for Report/Dashboard Components with Recharts Mocking"
description: "Implement React Testing Library tests for 5 report/dashboard components with Recharts mock strategy"
status: completed
priority: P2
effort: 4h
branch: master
tags: [testing, rtl, recharts, reports, dashboard]
created: 2026-01-11
completed: 2026-01-11
---

# RTL Tests for Report/Dashboard Components

## Objective

Implement RTL tests for 5 report/dashboard components with proper Recharts mocking strategy.

## Components to Test

| Component | Path | Lines | Key Features |
|-----------|------|-------|--------------|
| KPICards | `src/components/reports/kpi-cards.tsx` | 98 | 5 metric cards, trends, locale formatting, loading skeleton |
| RevenueTrendChart | `src/components/reports/revenue-trend-chart.tsx` | 162 | ComposedChart (Bar+Line), date range, tooltip, empty state |
| CostBreakdownChart | `src/components/reports/cost-breakdown-chart.tsx` | 169 | PieChart + horizontal bars, categories, percentages |
| FunnelChart | `src/components/reports/funnel-chart.tsx` | 137 | Horizontal BarChart, stage labels, conversion rate |
| FollowUpWidget | `src/components/dashboard/follow-up-widget.tsx` | 189 | Task list, priorities, due dates, click actions |

## Technical Approach

### Recharts Mocking Strategy

Mock Recharts at module level - render simplified DOM for testing:

```typescript
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
    <div data-testid="composed-chart" data-length={data?.length}>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="pie-chart">{children}</div>,
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
    <div data-testid="bar-chart" data-length={data?.length}>{children}</div>,
  // Mock individual components
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Pie: ({ data }: { data: unknown[] }) =>
    <div data-testid="pie" data-length={data?.length} />,
  // ... other components
}));
```

### Test Strategy Per Component

1. **Data transformation logic** - Test useMemo transformations separately
2. **Conditional rendering** - Loading, empty, data states
3. **Props validation** - Correct data passed to mock charts
4. **UI elements** - Labels, tooltips content, badges

## Output Structure

```
src/components/reports/__tests__/
├── test-utils.ts           # Shared mocks, fixtures, Recharts mock
├── kpi-cards.test.tsx
├── revenue-trend-chart.test.tsx
├── cost-breakdown-chart.test.tsx
└── funnel-chart.test.tsx

src/components/dashboard/__tests__/
└── follow-up-widget.test.tsx
```

## Phases

| Phase | File | Focus | Est. |
|-------|------|-------|------|
| [Phase 01](./phase-01-test-setup-and-mocks.md) | test-utils.ts | Recharts mocks, fixtures, helpers | 30m |
| [Phase 02](./phase-02-kpi-cards-tests.md) | kpi-cards.test.tsx | 5 KPI cards, trends, formatting | 45m |
| [Phase 03](./phase-03-chart-components-tests.md) | 3 chart tests | Recharts components, data transform | 90m |
| [Phase 04](./phase-04-follow-up-widget-tests.md) | follow-up-widget.test.tsx | Fetch, routing, priority sections | 45m |

## Test Count Target

- **KPICards**: ~12 tests (rendering, calculations, trends, loading)
- **RevenueTrendChart**: ~10 tests (chart data, empty state, tooltip)
- **CostBreakdownChart**: ~12 tests (pie data, payment bars, labels)
- **FunnelChart**: ~10 tests (stages, conversion rate, labels)
- **FollowUpWidget**: ~14 tests (fetch, sections, click handlers)

**Total: ~58 tests**

## Dependencies

- Jest 30.x + @testing-library/react
- Existing test patterns from `operators/__tests__`, `revenues/__tests__`
- Mock utilities from existing test-utils.ts files

## Acceptance Criteria

- [x] All 5 components have test files with >80% coverage
- [x] Recharts components properly mocked (no ResizeObserver errors)
- [x] Data transformation logic tested independently
- [x] Loading and empty states covered
- [x] Vietnamese text assertions work correctly
- [x] Tests run without console errors/warnings
