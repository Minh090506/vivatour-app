# Code Review Report: Report Components Tests

**Review Date**: 2026-01-11
**Reviewer**: Code Reviewer Agent
**Scope**: Test files for report components (KPI cards, charts, follow-up widget)

---

## Scope

**Files Reviewed**:
1. `src/components/reports/__tests__/test-utils.tsx`
2. `src/components/reports/__tests__/kpi-cards.test.tsx`
3. `src/components/reports/__tests__/revenue-trend-chart.test.tsx`
4. `src/components/reports/__tests__/cost-breakdown-chart.test.tsx`
5. `src/components/reports/__tests__/funnel-chart.test.tsx`
6. `src/components/dashboard/__tests__/follow-up-widget.test.tsx`

**Lines Analyzed**: ~1,300
**Focus**: Test coverage completeness, mock strategy, code organization, best practices, security, performance

---

## Overall Assessment

**Quality Score**: 7.5/10

Test suite demonstrates solid coverage (157 tests passed) with well-organized structure and comprehensive mock utilities. However, several critical issues require attention:

- **3 ESLint errors** (require() imports violating TypeScript standards)
- **Branch coverage below threshold** (64.51% vs 70% required)
- **Missing tooltip interaction tests** (uncovered CustomTooltip logic)
- **Incomplete error boundary testing** (formatYAxis edge cases)

Code quality is generally high with good separation of concerns, but minor improvements needed for production readiness.

---

## Critical Issues

### CRITICAL-1: ESLint Violations - TypeScript Import Standards

**Severity**: High
**Files**: `revenue-trend-chart.test.tsx`, `cost-breakdown-chart.test.tsx`, `funnel-chart.test.tsx`

**Issue**:
```typescript
// Line 9 in multiple files
jest.mock('recharts', () => require('./test-utils').createRechartsMock());
```

**Impact**: Violates project TypeScript standards (code-standards.md lines 124-141). ESLint explicitly forbids `require()` style imports with `@typescript-eslint/no-require-imports` rule.

**Fix**:
```typescript
// Change from:
jest.mock('recharts', () => require('./test-utils').createRechartsMock());

// To:
import { createRechartsMock } from './test-utils';
jest.mock('recharts', () => createRechartsMock());
```

**Action**: Update 3 test files to use ES6 imports.

---

### CRITICAL-2: Branch Coverage Below Threshold

**Severity**: High
**Metric**: 64.51% vs 70% required

**Uncovered Branches**:

1. **revenue-trend-chart.tsx** (33.33% branches)
   - Lines 34-61: `formatYAxis` function conditionals
   - Lines 46-70: `CustomTooltip` component logic

2. **funnel-chart.tsx** (47.05% branches)
   - Lines 43-44: `CustomTooltip` null check
   - Line 122: LabelList formatter edge case

3. **cost-breakdown-chart.tsx** (58.82% branches)
   - Lines 46-47: `CustomTooltip` null check
   - Line 127: Pie label percent edge case

**Impact**: Risk of untested edge cases reaching production, potential runtime errors.

**Action**: Add tests for tooltip interactions and formatter edge cases.

---

## High Priority Findings

### HIGH-1: Unused Variable in KPI Cards Test

**Severity**: Medium
**File**: `kpi-cards.test.tsx:123`

**Issue**:
```typescript
const badges = screen.getAllByText(/%$/);
// Variable declared but never used
```

**Impact**: Dead code, confusing for maintainers. ESLint warning indicates incomplete test logic.

**Fix**: Remove unused variable or complete intended assertion:
```typescript
// Option 1: Remove if not needed
// const badges = screen.getAllByText(/%$/);

// Option 2: Use the variable
const badges = screen.getAllByText(/%$/);
expect(badges.length).toBeGreaterThan(0);
```

---

### HIGH-2: Missing Test Coverage for Tooltip Interactions

**Severity**: Medium
**Files**: All chart test files

**Issue**: CustomTooltip components have extensive logic (formatCurrency, conditional rendering, payload mapping) but no interaction tests.

**Example Uncovered Code** (revenue-trend-chart.tsx:46-70):
```typescript
function CustomTooltip({ active, payload, label }: ...) {
  if (!active || !payload) return null; // Line 55 - uncovered branch

  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry) => ( // Uncovered iteration
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === 'revenue' && 'Doanh thu: '}
          // ... uncovered conditionals
        </p>
      ))}
    </div>
  );
}
```

**Impact**: Tooltip display bugs undetected, potential runtime errors with malformed data.

**Action**: Add interaction tests with fireEvent or userEvent to trigger tooltip rendering.

---

### HIGH-3: Edge Case Testing Incomplete

**Severity**: Medium
**Files**: All chart components

**Missing Edge Cases**:

1. **Extreme Numbers**:
   - Very large (> 1 trillion VND)
   - Very small (< 1,000 VND)
   - Negative values
   - Infinity/NaN

2. **Malformed Data**:
   - Null/undefined in arrays
   - Missing required properties
   - Type mismatches

3. **Boundary Conditions**:
   - Empty arrays vs null vs undefined
   - Single item arrays
   - Max array length

**Example Test to Add**:
```typescript
it('handles NaN values gracefully', () => {
  const badData = createMockTrendResponse({
    data: [{ period: '2026-01', revenue: NaN, cost: 100, profit: NaN }],
  });

  render(<RevenueTrendChart data={badData} />);
  expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
});
```

---

## Medium Priority Improvements

### MED-1: Mock Strategy - ResizeObserver Duplication

**Severity**: Low
**Files**: All chart tests

**Issue**: ResizeObserver mock setup repeated in each test file using `beforeAll()`. Violates DRY principle.

**Current**:
```typescript
// In EVERY chart test file
beforeAll(() => {
  setupResizeObserverMock();
});
```

**Recommendation**: Move to global setup file:
```typescript
// jest.setup.ts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

**Benefit**: Reduces code duplication, ensures consistency across all tests.

---

### MED-2: Test Organization - Missing Interaction Tests

**Severity**: Low
**File**: `follow-up-widget.test.tsx`

**Issue**: Tests verify navigation calls but don't test keyboard accessibility (Enter key, Tab navigation).

**Missing Tests**:
```typescript
describe('Accessibility', () => {
  it('navigates on Enter key press', async () => {
    const user = userEvent.setup();
    render(<FollowUpWidget />);
    await waitFor(() => screen.getByText('Nguyen A'));

    const item = screen.getByText('Nguyen A');
    item.focus();
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/requests/r1');
  });
});
```

**Benefit**: Ensures WCAG compliance, better UX for keyboard users.

---

### MED-3: Test Data Factory - Magic Numbers

**Severity**: Low
**File**: `test-utils.tsx`

**Issue**: Hard-coded values without semantic naming makes tests harder to understand.

**Example**:
```typescript
export const mockDashboardResponse: DashboardResponse = {
  kpiCards: {
    totalBookings: 42, // Why 42?
    totalRevenue: 150000000, // What does this represent?
    totalProfit: 45000000,
    activeRequests: 15,
    conversionRate: 28.5,
  },
  // ...
};
```

**Recommendation**: Add constants with semantic names:
```typescript
const MOCK_VALUES = {
  TYPICAL_MONTHLY_BOOKINGS: 42,
  HIGH_REVENUE_AMOUNT: 150_000_000, // 150M VND
  GOOD_PROFIT_MARGIN: 45_000_000,   // 30% margin
  AVERAGE_ACTIVE_REQUESTS: 15,
  HEALTHY_CONVERSION_RATE: 28.5,
} as const;
```

---

### MED-4: Follow-Up Widget - Fetch Timing Race Condition

**Severity**: Medium
**File**: `follow-up-widget.test.tsx`

**Issue**: Tests don't verify Promise.all concurrent execution behavior. Potential race conditions undetected.

**Current Test**:
```typescript
it('fetches 3 endpoints with correct limit param', async () => {
  render(<FollowUpWidget limit={10} />);

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith('/api/requests?followup=overdue&limit=10');
    expect(fetch).toHaveBeenCalledWith('/api/requests?followup=today&limit=10');
    expect(fetch).toHaveBeenCalledWith('/api/requests?followup=upcoming&limit=10');
  });
});
```

**Problem**: Doesn't verify calls happen in parallel (Promise.all), just that they were called.

**Better Test**:
```typescript
it('fetches all 3 endpoints concurrently', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');

  render(<FollowUpWidget limit={10} />);

  await waitFor(() => {
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  // Verify timing - all calls should start before any complete
  const callTimes = fetchSpy.mock.invocationCallOrder;
  expect(callTimes[0]).toBeLessThan(callTimes[2]); // First started before last
});
```

---

## Low Priority Suggestions

### LOW-1: Test Readability - Regex Over-Usage

**File**: Multiple test files

**Issue**: Complex regex patterns reduce readability:
```typescript
expect(screen.getByText(/150.*₫/)).toBeInTheDocument();
expect(screen.getByText(/RQ001.*VN/)).toBeInTheDocument();
```

**Alternative**:
```typescript
expect(screen.getByText('150.000.000 ₫')).toBeInTheDocument();
expect(screen.getByText(/RQ001/)).toBeInTheDocument();
expect(screen.getByText(/VN/)).toBeInTheDocument();
```

**Benefit**: More explicit expectations, easier to debug failures.

---

### LOW-2: Mock Realism - Date Hardcoding

**File**: `test-utils.tsx:98`

**Issue**:
```typescript
const mockDateRange: DateRange = {
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
  label: 'Thang 1/2026',
};
```

**Problem**: Hard-coded dates will become outdated, tests may fail in future.

**Recommendation**:
```typescript
function createMockDateRange(monthsAgo = 0): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);

  return {
    startDate: start,
    endDate: end,
    label: `Thang ${start.getMonth() + 1}/${start.getFullYear()}`,
  };
}
```

---

### LOW-3: Performance - Unnecessary waitFor Usage

**File**: `follow-up-widget.test.tsx`

**Issue**: Some tests use `waitFor` when content is immediately available:
```typescript
it('renders Clock icon in header', async () => {
  render(<FollowUpWidget />);

  await waitFor(() => {
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
  });
});
```

**Optimization**: Header is synchronous, no need for async:
```typescript
it('renders Clock icon in header', () => {
  render(<FollowUpWidget />);
  expect(screen.getByText('Follow-up')).toBeInTheDocument();
});
```

**Benefit**: Faster test execution, clearer intent.

---

## Positive Observations

### Excellent Mock Architecture

**test-utils.tsx** demonstrates best-in-class mock design:

1. **Centralized Recharts Mock**: Single factory function (`createRechartsMock`) eliminates duplication across 4 test files
2. **Type-Safe Fixtures**: All mock data uses proper TypeScript types from `@/lib/report-utils`
3. **Factory Functions**: `createMock*Response()` with override support enables flexible test data
4. **Separation of Concerns**: Mock utilities isolated from test logic

**Example**:
```typescript
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
```

This pattern enables:
- Easy test data customization
- Deep partial overrides
- Type safety
- DRY principle adherence

---

### Comprehensive Test Coverage

Tests cover all major user scenarios:

1. **Rendering States**: Loading, empty, error, success
2. **Data Formatting**: Vietnamese locale, currency, percentages
3. **User Interactions**: Click navigation, button actions
4. **Edge Cases**: Zero values, large numbers, empty arrays
5. **Error Handling**: Network failures, malformed responses

**Metrics**:
- 157 tests passed
- 85.54% statement coverage
- 73.33% function coverage
- 87.31% line coverage

Only branch coverage (64.51%) needs improvement.

---

### Clean Test Organization

Consistent structure across all test files:

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => { /* ... */ });
  describe('Data Formatting', () => { /* ... */ });
  describe('User Interactions', () => { /* ... */ });
  describe('Loading State', () => { /* ... */ });
  describe('Empty State', () => { /* ... */ });
  describe('Error Handling', () => { /* ... */ });
  describe('Edge Cases', () => { /* ... */ });
});
```

Benefits:
- Predictable test location
- Easy to identify coverage gaps
- Clear test intent
- Maintainability

---

### Type-Safe Mock Data

All mock fixtures use proper types:

```typescript
export const mockDashboardResponse: DashboardResponse = { /* ... */ };
export const mockTrendResponse: RevenueTrendResponse = { /* ... */ };
export const mockCostResponse: CostBreakdownResponse = { /* ... */ };
export const mockFunnelResponse: FunnelResponse = { /* ... */ };
```

This prevents:
- Type mismatches in tests
- Runtime errors from invalid data shapes
- Drift between test and production types

---

## Security Analysis

### No Critical Security Issues Found

Reviewed for common vulnerabilities:

✅ **No XSS Vectors**: All user inputs properly escaped via React
✅ **No Injection Risks**: No dynamic query construction
✅ **No Credential Exposure**: Mock data uses fictional values
✅ **No Path Traversal**: Navigation uses typed routes

### Minor Security Consideration

**File**: `follow-up-widget.test.tsx`

**Observation**: Navigation mock doesn't validate redirect URLs.

**Current**:
```typescript
await user.click(screen.getByText('Nguyen A'));
expect(mockPush).toHaveBeenCalledWith('/requests/r1');
```

**Recommendation**: In actual component, ensure URL validation (see code-standards.md lines 620-627 for getSafeCallbackUrl pattern).

---

## Performance Analysis

### Efficient Test Execution

- **Parallel Execution**: All tests run in parallel (default Jest behavior)
- **Minimal DOM Manipulation**: Tests use lightweight queries
- **Mock Cleanup**: `beforeEach(() => jest.clearAllMocks())` prevents memory leaks

### Performance Metrics

```
Test Suites: 8 passed, 8 total
Tests:       157 passed, 157 total
Time:        15.062s
```

**15 seconds for 157 tests** = 95ms average per test (acceptable).

### Optimization Opportunities

1. **Reduce waitFor timeout** (default 1000ms):
```typescript
await waitFor(() => { /* ... */ }, { timeout: 500 });
```

2. **Reuse render results**:
```typescript
// Instead of:
it('test 1', () => {
  render(<Component />);
  // assertions
});
it('test 2', () => {
  render(<Component />); // Duplicate render
  // assertions
});

// Consider:
describe('with standard data', () => {
  let rendered: RenderResult;
  beforeEach(() => {
    rendered = render(<Component />);
  });

  it('test 1', () => { /* use rendered */ });
  it('test 2', () => { /* use rendered */ });
});
```

---

## Architecture Assessment

### YAGNI (You Aren't Gonna Need It) ✅

No over-engineering detected:
- Mock utilities provide exactly what's needed
- No unnecessary abstraction layers
- Test helpers solve real problems (Recharts mocking)

### KISS (Keep It Simple, Stupid) ✅

Tests are straightforward:
- Clear arrange-act-assert pattern
- Minimal setup required
- Descriptive test names

### DRY (Don't Repeat Yourself) ⚠️

**Mostly DRY**, but opportunities:

1. **ResizeObserver Setup**: Duplicated in 4 files (see MED-1)
2. **Common Test Patterns**: Consider shared test helpers:

```typescript
// src/__tests__/helpers/chart-tests.ts
export function testChartLoading(Component: React.FC<Props>) {
  it('renders skeleton when loading', () => {
    render(<Component data={null} loading={true} />);
    expect(document.querySelector('.h-\\[400px\\]')).toBeInTheDocument();
  });
}

export function testChartEmpty(Component: React.FC<Props>, emptyData: any) {
  it('shows empty message', () => {
    render(<Component data={emptyData} />);
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
  });
}

// Usage in tests:
testChartLoading(RevenueTrendChart);
testChartEmpty(RevenueTrendChart, emptyTrendResponse);
```

---

## Recommended Actions

### Immediate (Critical)

1. **Fix ESLint errors** (3 files):
   - Replace `require()` with ES6 imports
   - Remove unused variable in kpi-cards.test.tsx
   - Run `npm run lint -- --fix`

2. **Improve branch coverage** to 70%:
   - Add tooltip interaction tests
   - Test formatYAxis edge cases (negative, NaN, Infinity)
   - Test CustomTooltip with various payload shapes

### Short-term (High Priority)

3. **Add accessibility tests**:
   - Keyboard navigation (Enter, Tab)
   - ARIA attributes verification
   - Screen reader compatibility

4. **Expand edge case coverage**:
   - Extreme numbers (very large/small)
   - Malformed data structures
   - Network timeout scenarios

### Long-term (Medium Priority)

5. **Refactor ResizeObserver setup** to global config
6. **Create shared chart test helpers** to reduce duplication
7. **Add performance benchmarks** for rendering large datasets
8. **Document testing patterns** in code-standards.md

---

## Metrics

### Coverage Summary

| Metric          | Current | Threshold | Status |
|----------------|---------|-----------|--------|
| Statements     | 85.54%  | 70%       | ✅ Pass |
| Branches       | 64.51%  | 70%       | ❌ Fail |
| Functions      | 73.33%  | 70%       | ✅ Pass |
| Lines          | 87.31%  | 70%       | ✅ Pass |

### Code Quality

| Aspect              | Score | Notes                                    |
|--------------------|-------|------------------------------------------|
| Type Safety        | 9/10  | Excellent typing, minor `any` in mocks   |
| Readability        | 8/10  | Clear structure, some regex complexity   |
| Maintainability    | 8/10  | Well organized, minor duplication        |
| Test Coverage      | 7/10  | Good overall, branch coverage needs work |
| Error Handling     | 8/10  | Comprehensive, missing extreme edges     |
| Performance        | 8/10  | Efficient, minor optimization potential  |
| Security           | 10/10 | No vulnerabilities detected              |
| **Overall**        | **7.5/10** | **Production-ready with fixes**    |

---

## Conclusion

Test suite is **production-ready after addressing critical issues**. Quality is high with excellent mock architecture and comprehensive coverage. Main gaps:

1. Fix 3 ESLint errors (5 min)
2. Improve branch coverage to 70% (1 hour)
3. Add tooltip interaction tests (30 min)

**Estimated fix time**: 2 hours

Strong foundation for continued development. Team demonstrates solid testing practices.

---

## Unresolved Questions

1. Should we standardize on exact text matching vs regex for currency formatting?
2. Do we need visual regression testing for charts (Percy, Chromatic)?
3. Should follow-up widget tests mock entire fetch API or use MSW (Mock Service Worker)?
4. What's the acceptable test execution time threshold (currently 15s for 157 tests)?
5. Should we add Storybook for visual component documentation?
