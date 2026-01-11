# Revenue Component Test Report
**Date:** 2026-01-11 | **Time:** 11:50
**Test Suite:** `src/components/revenues/__tests__`

## Test Results Overview

| Metric | Count |
|--------|-------|
| **Total Tests** | 73 |
| **Passed** | 24 |
| **Failed** | 49 |
| **Skipped** | 0 |
| **Success Rate** | 33% |
| **Execution Time** | 18.05s |

---

## Failed Test Suite Breakdown

### 1. **revenue-summary-card.test.tsx** - 11 Failed, 3 Passed
**Status:** FAIL
**Root Cause:** Tests cannot locate numerical values in DOM - query selectors find labels but not the formatted currency values

**Failed Tests:**
- `calculates total VND correctly with refunds subtracted` - Expected `23.000.000` not found
- `calculates deposit total correctly` - Expected `10.000.000` not found
- `calculates total locked amount correctly` - Expected `9.000.000` not found
- `handles empty revenues array` - Expected `0 d` not found
- `handles refund correctly (negative in total)` - Expected `8.000.000` not found
- `displays correct count for each tier` - Breakdown counts not accessible
- `includes legacy isLocked in total locked` - Expected `5.000.000` not found
- `formats amounts using Vietnamese number format` - Regex `/12\.345\.678/` not matching
- `shows currency suffix d for VND` - Expected `/1\.000\.000 d/` not matching
- `shows correct deposit transaction count` - Expected `3 giao dich` count not found
- `shows correct locked transaction count` - Expected `3 giao dich` count not found

**Issue Analysis:**
```
Expected: "23.000.000"
Received: "Tong thu nhap"
```
The tests use `.closest('div')?.parentElement` to navigate DOM, but the resulting element only contains the label text, not the formatted amount. The DOM structure differs from test expectations.

**Suggested Fix:**
- Inspect actual DOM output from component
- Use `data-testid` attributes on amount containers for reliable querying
- Alternative: Find amount by its parent Card component and query direct children
- Example: `screen.getByTestId('total-amount')` instead of DOM traversal

---

### 2. **revenue-lock-dialog.test.tsx** - 13 Failed, 0 Passed
**Status:** FAIL
**Root Cause:** Dialog component likely not rendering or mocked dependencies missing

**Failed Tests:**
- `renders dialog when open=true` (372ms)
- `displays tier select dropdown` (169ms)
- `renders action buttons` (226ms)
- Tier selection logic (4 tests)
- Lock API calls (3 tests)
- Error handling (2 tests)
- Dialog close interaction (1 test)
- Loading state (1 test)

**Potential Issues:**
- Radix Dialog or Select components not properly mocked
- Mock configuration in test-utils not initialized
- Async state updates not completing before assertions

**Suggested Fix:**
- Add explicit mock setup for Radix UI components
- Add debug output: `screen.debug()` in first test
- Ensure all async operations use `waitFor()` with proper timeouts

---

### 3. **revenue-history-panel.test.tsx** - 2 Failed (partial)
**Status:** FAIL
**Root Cause:** Async loading and empty state detection issues

**Failed Tests:**
- `renders skeleton loaders while fetching` (225ms)
- `displays empty state when no history` (1023ms)

**Suggested Fix:**
- Verify fetch mock returns appropriate empty state data
- Add `waitFor` with increased timeout for async operations
- Ensure skeleton component is properly rendered during loading

---

### 4. **revenue-form.test.tsx** - 14 Failed, 0 Passed
**Status:** FAIL
**Root Cause:** Form rendering and state management issues, likely async data fetching

**Failed Tests:**
- Rendering tests (5 failed)
- Form validation tests (4 failed)
- Form submission tests (4 failed)
- Interactions tests (1 failed)

**Specific Issues:**
- Form fields not rendering in expected state
- Request data not loading in edit mode (796ms timeout suggests async issue)
- Validation messages not appearing
- Submit handlers not firing

**Suggested Fix:**
- Mock fetch/API calls in test-utils
- Use `setupFetchMock()` before each test
- Add appropriate `waitFor()` calls for async state updates
- Verify form context/provider setup in tests

---

### 5. **revenue-table.test.tsx** - 9 Failed (partial)
**Status:** FAIL
**Root Cause:** DOM event handling and menu interaction issues

**Failed Tests:**
- `disables edit action when any lock tier active` (1098ms)
- `shows unlock option when canUnlock=true and locked` (1053ms)
- `opens dropdown menu on action button click` (1021ms)
- `calls onEdit when edit clicked` (1034ms)
- `shows delete confirmation dialog` (1029ms)
- `calls onDelete and shows toast on delete` (1037ms)
- `opens history sheet on history click` (1029ms)
- `shows error toast on delete failure` (1038ms)

**Specific Issue:**
```
Timed out in waitFor
```
- Dropdown menu not opening or state not updating
- Delete confirmation dialog not appearing
- Async operations not completing before assertions

**Suggested Fix:**
- Increase `waitFor` timeout: `waitFor(() => {...}, { timeout: 3000 })`
- Verify Radix Menu and AlertDialog mocks working
- Check if mock permission hook returns expected values
- Ensure delete API mock configured correctly

---

## Common Patterns in Failures

### Pattern 1: DOM Query Failures
**Symptom:** Cannot find expected text content
**Cause:** Tests assume specific DOM structure or traversal paths that don't match rendered output
**Solution:** Use `data-testid` attributes throughout components for stable test queries

### Pattern 2: Async Operation Timeouts
**Symptom:** `waitFor` timeout errors (most tests with 1000ms+ execution time)
**Cause:** Fetch mocks not returning data, async state not updating
**Solution:** Verify `setupFetchMock()` and ensure proper mock responses in test-utils

### Pattern 3: Missing Mocks
**Symptom:** Component renders but interactions fail
**Cause:** Child components or hooks not properly mocked
**Solution:** Verify all mocks initialized before each test in `beforeEach`

---

## Test Coverage Analysis

**Critical Areas Lacking Tests:**
- Error scenarios not fully validated
- Edge cases around lock tier combinations need additional coverage
- Permission-based rendering not thoroughly tested
- Async error states incomplete

**Coverage Recommendations:**
1. Add unit tests for calculation logic in isolation
2. Test all lock tier combinations (KT-only, Admin-only, Final-only, combinations)
3. Add tests for refund edge cases (negative totals, zero amounts)
4. Verify Vietnamese currency formatting in all scenarios

---

## Performance Observations

| Test Suite | Execution Time | Status | Notes |
|------------|-----------------|--------|-------|
| revenue-summary-card | ~0.3s | FAIL | Fast but all value assertions fail |
| revenue-lock-dialog | ~1.5s | FAIL | High timeout suggests async issues |
| revenue-history-panel | ~1.2s | FAIL | Slow async operations |
| revenue-form | ~6.98s | FAIL | Slowest - form state management issues |
| revenue-table | ~10.97s | FAIL | Very slow - multiple async waitFor calls |

**Performance Issues:** Total test suite slow due to `waitFor` timeouts. Once fixes applied, should reduce to <5s.

---

## Critical Issues (Blocking)

1. **All test suites failing** - Cannot verify component functionality
2. **DOM query strategy broken** - Need to refactor how tests locate elements
3. **Async mock setup incomplete** - setupFetchMock() not working properly
4. **Component mocks incomplete** - Dialog, Select, Menu components not behaving as expected

---

## Recommendations (Priority Order)

### High Priority
1. **Add data-testid attributes** to all components
   - `data-testid="total-amount"` on currency displays
   - `data-testid="transaction-count"` on counts
   - `data-testid="lock-tier-{tier}"` on lock tier indicators

2. **Fix test-utils fetch mock setup**
   - Verify `setupFetchMock()` returns correct response format
   - Ensure mock persists across tests
   - Add mock for lock API endpoint

3. **Review component DOM structure**
   - Debug RevenueSummaryCard render output
   - Verify Card, CardHeader, CardContent nesting matches test assumptions

### Medium Priority
4. **Increase waitFor timeouts** where async operations expected
   - Change from default 1000ms to 3000ms
   - Add explicit timeout: `waitFor(() => {...}, { timeout: 3000 })`

5. **Mock Radix UI components properly**
   - Verify Dialog mock opens/closes state
   - Test Select dropdown rendering and selection
   - Check Menu dropdown behavior

### Low Priority
6. **Add additional test coverage** for edge cases
7. **Performance optimization** after core tests pass

---

## Next Steps

1. **Start with revenue-summary-card** - Simplest component, easiest to debug
   - Add `data-testid` attributes to component
   - Update tests to use `getByTestId()` instead of DOM traversal
   - Run single test file: `npm test -- src/components/revenues/__tests__/revenue-summary-card.test.tsx`

2. **Fix test-utils setupFetchMock**
   - Verify mock response format matches API contract
   - Add console logging to confirm mock is being called

3. **Apply similar fixes to other test files**
   - revenue-lock-dialog: Fix dialog mock and state management
   - revenue-form: Fix fetch mock and form state
   - revenue-table: Fix dropdown and confirmation dialog mocks

4. **Run full suite and verify pass rate reaches >95%**

---

## Unresolved Questions

- What is exact DOM structure output by RevenueSummaryCard component?
- Does setupFetchMock() in test-utils properly configure all API endpoints?
- Are Radix UI component mocks (Dialog, Select, Menu) properly configured?
- What is expected behavior when fetch fails - should component show error state?
- Should tests use React 18's automatic batching or explicit `act()` calls?
