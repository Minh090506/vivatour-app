# Plan: Add Comprehensive Tests for Request Module

**Created**: 2026-01-19 14:09
**Branch**: master
**Status**: DONE
**Completed**: 2026-01-19 14:25

---

## Overview

Add comprehensive tests for Request module components covering form validation edge cases, error boundary testing, loading states, and mobile responsive behavior.

## Scope Analysis

### Files to Test (Untested or Need Enhancement)
| File | Current Tests | Enhancement Needed |
|------|--------------|-------------------|
| `request-form.tsx` | Basic (26 tests) | Validation edge cases, special chars |
| `request-list-panel.tsx` | None | Loading states, error boundary, pagination |
| `request-list-item.tsx` | None | Rendering, click handlers, overdue indicator |
| `request-status-badge.tsx` | None | All statuses, fallback behavior |
| Test utilities | Partial | Add error mock helpers, responsive utilities |

### Test Categories
1. **Form Validation Edge Cases** - Empty fields, special chars, date boundaries, numeric limits
2. **Error Boundary Testing** - API failures (500, 404, network), retry functionality
3. **Loading States** - Initial load, data fetching, skeleton placeholders
4. **Mobile Responsive** - Viewport tests (not full responsive suite)

---

## Implementation Plan

### Phase 1: Enhance Test Utilities (test-utils.ts)

**Changes:**
- Add `setupFetchErrorMock()` for API error scenarios
- Add `setupNetworkErrorMock()` for network failures
- Add `mockResizeObserver()` for responsive tests
- Add `createMockRequestWithOverdueFollowUp()`

**Lines:** ~40 new lines

### Phase 2: Request Form Validation Tests (request-form.test.tsx)

**New Test Cases:**

```typescript
describe('Form Validation Edge Cases', () => {
  // Empty fields
  it('shows error when customerName is only whitespace')
  it('shows error when contact is empty')
  it('validates minimum length for customerName (2 chars)')

  // Special characters
  it('accepts Vietnamese diacritics in customerName')
  it('accepts special characters in notes field')
  it('accepts international phone formats in contact')

  // Date boundaries
  it('rejects past dates for startDate')
  it('accepts today as startDate')
  it('accepts future dates for startDate')

  // Numeric validation
  it('rejects pax less than 1')
  it('rejects pax greater than 100')
  it('rejects negative expectedRevenue')
  it('rejects tourDays greater than 365')

  // Contact validation
  it('accepts valid email format')
  it('accepts valid phone format with country code')
  it('rejects invalid email format')
  it('accepts phone with formatting (spaces, dashes)')

  // WhatsApp validation
  it('accepts empty WhatsApp')
  it('accepts valid +84 format')
  it('rejects invalid WhatsApp number')

  // Notes field
  it('accepts notes up to 1000 characters')
  it('rejects notes over 1000 characters')
})
```

**Tests:** ~20 new tests
**Lines:** ~350 lines

### Phase 3: Request List Panel Tests (NEW FILE)

**File:** `request-list-panel.test.tsx`

**Test Cases:**

```typescript
describe('RequestListPanel', () => {
  describe('Loading States', () => {
    it('displays loading spinner when isLoading is true')
    it('hides loading spinner when data loads')
    it('shows "Đang tải..." text during loading')
    it('shows "Đang tải thêm..." during pagination')
  })

  describe('Error Handling', () => {
    it('displays error message when error prop is set')
    it('shows retry button when onRetry provided')
    it('hides retry button when onRetry not provided')
    it('calls onRetry when retry button clicked')
    it('displays loadMoreError for pagination failures')
  })

  describe('Empty State', () => {
    it('shows "Không có yêu cầu nào" when requests empty')
    it('displays total count in footer')
  })

  describe('Search Functionality', () => {
    it('renders search input')
    it('calls onSearchChange on input')
    it('displays search value')
  })

  describe('Request Selection', () => {
    it('highlights selected request')
    it('calls onSelect when request clicked')
  })

  describe('Infinite Scroll', () => {
    it('triggers onLoadMore when last item visible')
    it('does not trigger when isLoadingMore')
    it('does not trigger when hasMore is false')
  })
})
```

**Tests:** ~20 tests
**Lines:** ~300 lines

### Phase 4: Request Status Badge Tests (NEW FILE)

**File:** `request-status-badge.test.tsx`

**Test Cases:**

```typescript
describe('RequestStatusBadge', () => {
  describe('Status Rendering', () => {
    it('renders badge for valid status')
    it('renders fallback badge for unknown status')
    it('applies correct color class for each status')
  })

  describe('Stage Display', () => {
    it('hides stage label when showStage is false')
    it('shows stage label when showStage is true')
    it('applies stage color class')
  })

  describe('Color Mapping', () => {
    it('renders blue for LEAD stage statuses')
    it('renders green for BOOKING status')
    it('renders red for failed statuses')
  })
})
```

**Tests:** ~12 tests
**Lines:** ~180 lines

### Phase 5: Request List Item Tests (NEW FILE)

**File:** `request-list-item.test.tsx`

**Test Cases:**

```typescript
describe('RequestListItem', () => {
  describe('Rendering', () => {
    it('displays booking code when available')
    it('displays RQID when no booking code')
    it('displays code as fallback')
    it('shows customer name')
    it('shows seller name or N/A')
    it('shows country or N/A')
    it('formats received date')
  })

  describe('Selection', () => {
    it('applies selected style when isSelected true')
    it('removes selected style when isSelected false')
    it('calls onClick when clicked')
  })

  describe('Follow-up Indicator', () => {
    it('shows bell icon for overdue follow-up')
    it('hides bell icon when follow-up not overdue')
    it('hides bell icon when no follow-up set')
  })
})
```

**Tests:** ~12 tests
**Lines:** ~200 lines

---

## File Structure

```
src/components/requests/__tests__/
├── test-utils.ts              # Enhanced (+ ~40 lines)
├── request-form.test.tsx      # Enhanced (+ ~350 lines)
├── request-list-panel.test.tsx  # NEW (~300 lines)
├── request-status-badge.test.tsx # NEW (~180 lines)
└── request-list-item.test.tsx   # NEW (~200 lines)
```

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Request component tests | 4 files | 4 files (enhanced) + 3 new |
| Total test cases | ~60 | ~125 |
| Coverage target | ~50% | ~85% |

---

## Constraints & Notes

1. **No responsive viewport tests** - RTL doesn't support viewport simulation well; responsive behavior is better tested via visual regression or E2E
2. **Mobile touch interactions** - Skip complex touch tests (gestures); focus on click handlers
3. **Intersection Observer** - Mock for infinite scroll tests
4. **Avoid over-testing** - Don't test implementation details, focus on behavior

---

## Dependencies

- `@testing-library/react`
- `@testing-library/jest-dom`
- Jest mocking for:
  - `next/navigation`
  - `next-auth/react`
  - `IntersectionObserver`

---

## Acceptance Criteria

- [x] All existing tests pass
- [x] New validation edge case tests pass
- [x] Loading state tests for RequestListPanel
- [x] Error boundary tests with retry functionality
- [x] Badge and list item components fully tested
- [x] `npm test` runs successfully with no failures

---

## Results

**Tests Added:** 110+ new test cases
**Total Tests:** 1384 (all passing)
**Code Review Score:** 8.5/10
**Critical Issues:** 0
