# Phase 06: OperatorListFilters Tests

**Parent**: [plan.md](./plan.md)
**Status**: Done
**Effort**: 25min
**Tests**: ~12

---

## Overview

Test `operator-list-filters.tsx` component covering search input, filter dropdowns, checkboxes, and clear functionality.

---

## Component Analysis

**Props**:
```typescript
interface OperatorListFiltersProps {
  filters: OperatorFilters;
  onFilterChange: (filters: OperatorFilters) => void;
}
```

**Key Features**:
- Search input with icon
- Service type dropdown (SERVICE_TYPES config)
- Payment status dropdown (PAYMENT_STATUSES config)
- Date range inputs (fromDate, toDate)
- Lock status dropdown (all/locked/unlocked)
- includeArchived checkbox
- "Xóa bộ lọc" clear button

---

## Test Cases

### describe('Rendering')

```typescript
it('renders search input with placeholder')
it('renders service type dropdown')
it('renders payment status dropdown')
it('renders date range inputs')
it('renders lock status dropdown')
it('renders includeArchived checkbox')
it('does not show clear button with no filters')
```

### describe('Search Filter')

```typescript
it('displays current search value')
it('calls onFilterChange when search input changes')
it('shows search icon')
```

### describe('Service Type Filter')

```typescript
it('displays "Tất cả loại DV" when no selection')
it('renders all service types from config')
it('displays Vietnamese labels')
it('calls onFilterChange with selected type')
it('resets to empty string when "all" selected')
```

### describe('Payment Status Filter')

```typescript
it('displays "Tất cả TT" when no selection')
it('renders all payment statuses from config')
it('calls onFilterChange with selected status')
```

### describe('Date Range Filter')

```typescript
it('displays fromDate value')
it('displays toDate value')
it('calls onFilterChange when fromDate changes')
it('calls onFilterChange when toDate changes')
```

### describe('Lock Status Filter')

```typescript
it('displays "Tất cả" when isLocked undefined')
it('displays "Đã khóa" when isLocked true')
it('displays "Chưa khóa" when isLocked false')
it('sets isLocked to undefined when "all" selected')
it('sets isLocked to true when "locked" selected')
it('sets isLocked to false when "unlocked" selected')
```

### describe('Include Archived')

```typescript
it('displays unchecked by default')
it('displays checked when filters.includeArchived true')
it('calls onFilterChange when checkbox toggled')
it('shows archive icon and label')
```

### describe('Clear Filters')

```typescript
it('shows "Xóa bộ lọc" button when filters active')
it('resets all filters to defaults on click')
it('hides button after clearing')
```

---

## Mock Requirements

```typescript
// Filter change callback
const mockOnFilterChange = jest.fn();

// Initial filter states for different tests
const emptyFilters: OperatorFilters = {
  search: '',
  serviceType: '',
  paymentStatus: '',
  fromDate: '',
  toDate: '',
  isLocked: undefined,
  includeArchived: false,
};

const activeFilters: OperatorFilters = {
  search: 'hotel',
  serviceType: 'HOTEL',
  paymentStatus: 'PENDING',
  fromDate: '2026-01-01',
  toDate: '2026-01-31',
  isLocked: true,
  includeArchived: true,
};
```

---

## Success Criteria

- [x] 12 tests pass
- [x] All filter types tested
- [x] Clear button logic verified
- [x] onFilterChange called with correct values
- [x] Vietnamese labels displayed correctly
