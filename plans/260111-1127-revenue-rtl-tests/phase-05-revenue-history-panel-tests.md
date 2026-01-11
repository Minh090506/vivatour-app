# Phase 05: RevenueHistoryPanel Tests

## Objective
Test RevenueHistoryPanel component: loading, empty state, entry rendering, formatting.

## Output File
`src/components/revenues/__tests__/revenue-history-panel.test.tsx`

## Test Coverage (~10 tests)

### Loading State (2 tests)

1. **renders skeleton loaders while fetching**
   - 3 skeleton items visible
   - Skeleton shapes match entry layout

2. **shows loading state on initial mount**
   - Before API response
   - Skeleton visible, no entries

### Empty State (1 test)

3. **displays empty state when no history**
   - History icon centered
   - Text: "Chua co lich su"

### Error State (1 test)

4. **displays error message on fetch failure**
   - API returns error
   - Error text displayed: "Loi tai lich su" or custom message

### Entry Rendering (4 tests)

5. **renders all history entries from API**
   - Correct number of entries
   - Each entry has action label

6. **displays correct action label from HISTORY_ACTION_LABELS**
   - CREATE -> "Tao moi" (with custom config)
   - LOCK_KT -> mapped label
   - UPDATE -> "Cap nhat"

7. **displays correct icon and color per action type**
   - CREATE: blue, Plus icon
   - UPDATE: gray, Edit icon
   - LOCK_KT: amber, Lock icon
   - UNLOCK_KT: amber-light, Unlock icon

8. **displays userName or userId for each entry**
   - Prefers userName when available
   - Falls back to userId

### Timestamp Formatting (2 tests)

9. **formats timestamp relative in Vietnamese (date-fns/vi)**
   - "2 gio truoc", "hom qua", etc.
   - Uses formatDistanceToNow with addSuffix

10. **displays tier badge for lock/unlock actions**
    - changes.tier displayed as Badge
    - Variant: outline

## Mock Setup

```typescript
// Mock fetch for history API
const mockHistoryData = [
  {
    id: 'h1',
    revenueId: 'rev1',
    action: 'CREATE',
    changes: { amountVND: { after: 5000000 } },
    userId: 'user1',
    userName: 'Admin User',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'h2',
    revenueId: 'rev1',
    action: 'LOCK_KT',
    changes: { tier: 'KT', lockKT: { before: false, after: true } },
    userId: 'user2',
    userName: 'Accountant',
    createdAt: '2026-01-16T14:30:00Z',
  },
];

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: mockHistoryData }),
    })
  );
});
```

## Key Test Patterns

### Loading State
```typescript
it('renders skeleton loaders while fetching', () => {
  render(<RevenueHistoryPanel revenueId="rev1" />);

  // Check for 3 skeleton groups
  const skeletons = screen.getAllByRole('generic').filter(el =>
    el.classList.contains('animate-pulse')
  );
  expect(skeletons.length).toBeGreaterThan(0);
});
```

### Empty State
```typescript
it('displays empty state when no history', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })
  );

  render(<RevenueHistoryPanel revenueId="rev1" />);

  await waitFor(() => {
    expect(screen.getByText('Chua co lich su')).toBeInTheDocument();
  });
});
```

### Action Config Mapping
```typescript
it('displays correct icon and color per action type', async () => {
  render(<RevenueHistoryPanel revenueId="rev1" />);

  await waitFor(() => {
    // CREATE action should have blue styling
    const createEntry = screen.getByText('Tao moi').closest('div');
    expect(createEntry?.querySelector('.bg-blue-100')).toBeInTheDocument();
  });
});
```

### Relative Time
```typescript
// Note: formatDistanceToNow behavior depends on current time
// Mock Date.now() for consistent tests
jest.useFakeTimers().setSystemTime(new Date('2026-01-17T00:00:00Z'));

render(<RevenueHistoryPanel revenueId="rev1" />);

await waitFor(() => {
  // Entry from 2026-01-16T14:30:00Z should show ~9 hours ago
  expect(screen.getByText(/truoc/)).toBeInTheDocument();
});
```

## Estimated Lines
~200 lines
