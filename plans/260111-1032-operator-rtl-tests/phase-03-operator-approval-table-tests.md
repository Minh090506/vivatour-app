# Phase 03: OperatorApprovalTable Tests

**Parent**: [plan.md](./plan.md)
**Status**: Done
**Effort**: 30min
**Tests**: ~15

---

## Overview

Test `operator-approval-table.tsx` component covering table rendering, selection behavior, approval actions, and status indicators.

---

## Component Analysis

**Props**:
```typescript
interface Props {
  items: ApprovalQueueItem[];
  onApprove: (ids: string[], paymentDate: Date) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}
```

**Key Features**:
- Table with columns: Booking, Date, Service, Supplier, Costs, Status
- Checkbox selection (single + header toggle all)
- Batch approval action bar
- Single item approve button
- Overdue/today/upcoming status badges
- Error fallback with retry

---

## Test Cases

### describe('Rendering')

```typescript
it('renders table with column headers')
it('renders empty state when items array empty')
it('renders loading state when loading=true')
it('renders error fallback when error prop set')
it('renders retry button in error state')
it('calls onRetry when retry button clicked')
```

### describe('Table Content')

```typescript
it('displays request code and customer name')
it('formats service date in vi-VN locale')
it('displays service name and type')
it('formats totalCost in VND')
it('formats paidAmount in green')
it('displays debt in red when positive')
it('formats paymentDeadline date')
```

### describe('Status Badges')

```typescript
it('shows "Quá hạn X ngày" badge when daysOverdue > 0')
it('shows "Hôm nay" badge when daysOverdue === 0')
it('shows "Còn X ngày" badge when daysOverdue < 0')
it('applies red background to overdue rows')
```

### describe('Single Approval')

```typescript
it('renders approve button for each row')
it('disables approve button when item isLocked')
it('calls onApprove with single ID when clicked')
it('disables button during approval processing')
```

### describe('Bulk Selection')

```typescript
it('toggles single item selection on checkbox click')
it('toggles all items when header checkbox clicked')
it('shows batch action bar when items selected')
it('displays selected count in action bar')
it('calls onApprove with selected IDs on batch approve')
it('clears selection after successful batch approve')
it('hides action bar after deselection')
```

### describe('Disabled States')

```typescript
it('disables checkbox for locked items')
it('excludes locked items from select all')
```

---

## Mock Requirements

```typescript
// ApprovalQueueItem fixtures
const mockItems: ApprovalQueueItem[] = [
  mockApprovalQueueItem,
  { ...mockApprovalQueueItem, id: 'op2', daysOverdue: 3 },  // Overdue
  { ...mockApprovalQueueItem, id: 'op3', daysOverdue: 0 },  // Today
  { ...mockApprovalQueueItem, id: 'op4', isLocked: true },  // Locked
];

// onApprove mock
const mockOnApprove = jest.fn().mockResolvedValue(undefined);
```

---

## Success Criteria

- [x] 15 tests pass
- [x] Selection logic verified
- [x] Status badges correct for all cases
- [x] Disabled states work correctly
- [x] Batch actions tested
