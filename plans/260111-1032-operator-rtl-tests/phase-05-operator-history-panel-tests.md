# Phase 05: OperatorHistoryPanel Tests

**Parent**: [plan.md](./plan.md)
**Status**: Done
**Effort**: 25min
**Tests**: ~12

---

## Overview

Test `operator-history-panel.tsx` component covering history timeline rendering, action badges, change diff display, and value formatting.

---

## Component Analysis

**Props**:
```typescript
interface OperatorHistoryPanelProps {
  history: OperatorHistoryEntry[];
}
```

**Key Features**:
- Card with "Lịch sử thay đổi" title
- ScrollArea with timeline entries
- Action badges with icons and colors
- Batch indicator for bulk lock actions
- Timestamp and user display
- Change diff: before → after formatting

---

## Test Cases

### describe('Rendering')

```typescript
it('renders card with history count in title')
it('renders empty state when history array empty')
it('renders timeline with vertical line and dots')
it('renders correct number of history entries')
```

### describe('Entry Display')

```typescript
it('displays action badge with correct label')
it('displays action badge with correct color')
it('shows correct icon for CREATE action')
it('shows correct icon for UPDATE action')
it('shows correct icon for LOCK_KT action')
it('shows correct icon for APPROVE action')
it('displays formatted timestamp in vi-VN locale')
it('displays userId for each entry')
```

### describe('Batch Indicator')

```typescript
it('shows batch badge when changes.batch is true')
it('does not show batch badge for regular actions')
it('shows month info for tier lock actions')
```

### describe('Change Diff')

```typescript
it('displays field names in Vietnamese')
it('shows only "after" value for CREATE action')
it('shows before → after for UPDATE action')
it('formats before value with strikethrough')
it('formats after value in green')
```

### describe('Value Formatting')

```typescript
it('formats numbers with Vietnamese locale')
it('formats dates in DD/MM/YYYY format')
it('shows "Có"/"Không" for boolean values')
it('shows "(trống)" for null/undefined values')
it('handles object values as JSON string')
```

---

## Mock Requirements

```typescript
// History entries with various actions
const mockHistory: OperatorHistoryEntry[] = [
  {
    id: 'h1',
    operatorId: 'op1',
    action: 'CREATE',
    changes: { serviceName: { after: 'Hotel ABC' }, totalCost: { after: 5000000 } },
    userId: 'user1',
    createdAt: new Date('2026-01-10T10:00:00'),
  },
  {
    id: 'h2',
    operatorId: 'op1',
    action: 'UPDATE',
    changes: {
      totalCost: { before: 5000000, after: 6000000 },
      notes: { before: null, after: 'Updated notes' },
    },
    userId: 'user2',
    createdAt: new Date('2026-01-11T14:30:00'),
  },
  {
    id: 'h3',
    operatorId: 'op1',
    action: 'LOCK_KT',
    changes: {
      tier: 'KT',
      batch: true,
      month: '2026-01',
      lockKT: { before: false, after: true },
    },
    userId: 'user3',
    createdAt: new Date('2026-01-12T09:00:00'),
  },
];
```

---

## Success Criteria

- [x] 12 tests pass
- [x] All action types display correctly
- [x] Value formatting matches expected output
- [x] Timeline structure renders properly
- [x] Tier lock actions show extra info
