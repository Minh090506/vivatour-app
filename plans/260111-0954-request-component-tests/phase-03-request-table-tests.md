# Phase 03: RequestTable Tests

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 01 (test-utils)

## Overview
- **Date**: 2026-01-11
- **Priority**: P2
- **Status**: pending
- **Review**: pending

## Key Insights
- Component: 99 lines, simple table
- Uses RequestStatusBadge for status display
- FollowUpIndicator shows overdue/today/upcoming states
- Empty state: "Không có yêu cầu nào"
- Loading state: "Đang tải..."

## Requirements

### Test Scenarios
1. **States**
   - Loading state displays "Đang tải..."
   - Empty state displays "Không có yêu cầu nào"

2. **Data Rendering**
   - Renders table headers
   - Renders request rows with correct data
   - Displays status badge for each row

3. **Interactions**
   - Row click triggers onRowClick callback
   - Row has cursor-pointer when clickable

4. **FollowUpIndicator**
   - Overdue: red text, "Quá hạn X ngày"
   - Today: yellow text, "Hôm nay"
   - Future: green text, formatted date

## Architecture

### File: `src/components/requests/__tests__/request-table.test.tsx`

```typescript
describe('RequestTable', () => {
  describe('States', () => {
    it('renders loading state')
    it('renders empty state when no requests')
  })

  describe('Data Rendering', () => {
    it('renders table headers')
    it('renders request rows with data')
    it('displays RequestStatusBadge for each row')
  })

  describe('Row Interaction', () => {
    it('calls onRowClick with request when row clicked')
    it('applies hover styles when onRowClick provided')
  })

  describe('FollowUpIndicator', () => {
    it('shows overdue styling for past dates')
    it('shows today styling for current date')
    it('shows upcoming styling for future dates')
  })
})
```

## Related Code Files
- `src/components/requests/request-table.tsx` (99 lines)
- `src/components/requests/request-status-badge.tsx`

## Implementation Steps

### 1. Setup test file
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RequestTable } from '../request-table';
import { mockRequests, createMockRequest } from './test-utils';
```

### 2. Implement state tests
- Pass `isLoading={true}` → check "Đang tải..."
- Pass `requests={[]}` → check "Không có yêu cầu nào"

### 3. Implement data rendering tests
- Check table headers via getByText
- Check row data rendered correctly

### 4. Implement interaction tests
```typescript
const onRowClick = jest.fn();
render(<RequestTable requests={mockRequests} onRowClick={onRowClick} />);
fireEvent.click(screen.getByText('Nguyen Van A'));
expect(onRowClick).toHaveBeenCalledWith(mockRequests[0]);
```

### 5. Implement FollowUpIndicator tests
- Create requests with different nextFollowUp dates
- Check color classes applied

## Todo List
- [ ] Create request-table.test.tsx
- [ ] State tests (2 scenarios)
- [ ] Data rendering tests (3 scenarios)
- [ ] Row interaction tests (2 scenarios)
- [ ] FollowUpIndicator tests (3 scenarios)

## Success Criteria
- [ ] Loading/empty states verified
- [ ] Row click callback tested
- [ ] Follow-up indicator colors tested

## Risk Assessment
- **Low**: Simple presentational component
- **Low**: No async operations

## Next Steps
→ Phase 04: RequestFilters tests
