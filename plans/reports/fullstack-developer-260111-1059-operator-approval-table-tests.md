# RTL Tests: OperatorApprovalTable Component

**Date**: 2026-01-11
**Component**: `src/components/operators/operator-approval-table.tsx`
**Test File**: `src/components/operators/__tests__/operator-approval-table.test.tsx`
**Status**: ✅ Complete - 21/21 tests passing

## Test Coverage Summary

### Rendering (5 tests)
- ✅ Renders table with all column headers
- ✅ Empty state when no items
- ✅ Loading state with "Đang tải..." text
- ✅ Error fallback with message and retry button
- ✅ onRetry callback invoked on retry click

### Table Content (4 tests)
- ✅ Displays request code and customer name
- ✅ Formats service date in vi-VN locale (D/M/YYYY)
- ✅ Formats totalCost in VND currency
- ✅ Shows debt in red when positive amount

### Status Badges (3 tests)
- ✅ "Quá hạn X ngày" badge when daysOverdue > 0
- ✅ "Hôm nay" badge when daysOverdue === 0
- ✅ "Còn X ngày" badge when daysOverdue < 0

### Single Approval (2 tests)
- ✅ Calls onApprove with single ID and date
- ✅ Disables approve button when item isLocked

### Bulk Selection (7 tests)
- ✅ Toggles single item selection via checkbox
- ✅ Shows batch action bar when items selected
- ✅ Calls onApprove with selected IDs on batch approve
- ✅ Clears selection after successful batch approve
- ✅ Select/deselect all via header checkbox
- ✅ Disables checkbox for locked items
- ✅ Clear selection via "Bỏ chọn" button

## Files Created

```
src/components/operators/__tests__/
└── operator-approval-table.test.tsx (330 lines)
```

## Test Execution

```bash
PASS src/components/operators/__tests__/operator-approval-table.test.tsx
  OperatorApprovalTable
    Rendering
      ✓ renders table with column headers (216 ms)
      ✓ renders empty state when items array empty (6 ms)
      ✓ renders loading state when loading=true (3 ms)
      ✓ renders error fallback when error prop set (18 ms)
      ✓ calls onRetry when retry button clicked (16 ms)
    Table Content
      ✓ displays request code and customer name (43 ms)
      ✓ formats service date in vi-VN locale (62 ms)
      ✓ formats totalCost in VND (30 ms)
      ✓ displays debt in red when positive (31 ms)
    Status Badges
      ✓ shows "Quá hạn X ngày" badge when daysOverdue > 0 (28 ms)
      ✓ shows "Hôm nay" badge when daysOverdue === 0 (28 ms)
      ✓ shows "Còn X ngày" badge when daysOverdue < 0 (31 ms)
    Single Approval
      ✓ calls onApprove with single ID when clicked (60 ms)
      ✓ disables approve button when item isLocked (27 ms)
    Bulk Selection
      ✓ toggles single item selection on checkbox click (229 ms)
      ✓ shows batch action bar when items selected (127 ms)
      ✓ calls onApprove with selected IDs on batch approve (130 ms)
      ✓ clears selection after successful batch approve (180 ms)
      ✓ toggles all items selection when select all checkbox clicked (126 ms)
      ✓ does not select locked items in checkboxes (34 ms)
      ✓ clears selection when Bỏ chọn button clicked (123 ms)

Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
```

## Key Testing Patterns

### Vietnamese Locale Testing
```typescript
expect(screen.getByText('20/3/2026')).toBeInTheDocument(); // vi-VN date
expect(screen.getByText(/5\.000\.000/)).toBeInTheDocument(); // VND format
```

### Status Badge Testing
```typescript
expect(screen.getByText('Quá hạn 3 ngày')).toBeInTheDocument();
expect(screen.getByText('Hôm nay')).toBeInTheDocument();
expect(screen.getByText('Còn 5 ngày')).toBeInTheDocument();
```

### Async Approval Testing
```typescript
fireEvent.click(approveButton);
await waitFor(() => {
  expect(mockOnApprove).toHaveBeenCalledWith(['op1'], expect.any(Date));
});
```

### Checkbox Selection Testing
```typescript
const checkboxes = screen.getAllByRole('checkbox');
fireEvent.click(checkboxes[1]); // First item
await waitFor(() => {
  expect(screen.getByText(/Đã chọn 1 dịch vụ/)).toBeInTheDocument();
});
```

## Mock Utilities Used

From `test-utils.ts`:
- `mockApprovalQueueItems` - Array of 3 approval items
- `mockOverdueApprovalItem` - Item with daysOverdue > 0
- `mockTodayDueApprovalItem` - Item with daysOverdue === 0
- `mockLockedApprovalItem` - Item with isLocked: true
- `createMockApprovalItem()` - Helper for custom overrides
- `resetMocks()` - Reset all mocks in beforeEach

## Issues Resolved

1. **Duplicate text matches**: Fixed by using unique dates and request codes in test data
2. **Date format**: Corrected to vi-VN format (D/M/YYYY without leading zeros)
3. **Multiple instances**: Used single-item arrays when testing specific formatting

## Next Steps

Consider adding tests for:
- Network failure during approval (onApprove rejects)
- Batch approve with mixed locked/unlocked items
- Sorting/filtering integration if added
- Pagination if large datasets expected
