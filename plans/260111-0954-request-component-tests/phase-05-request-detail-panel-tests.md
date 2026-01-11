# Phase 05: RequestDetailPanel Tests

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 01 (test-utils)

## Overview
- **Date**: 2026-01-11
- **Priority**: P2
- **Status**: pending
- **Review**: pending

## Key Insights
- Component: 367 lines, most complex
- Uses usePermission hook for revenue section visibility
- Fetches revenues via fetch() when bookingCode exists
- 4 states: loading, error, empty, data

## Requirements

### Test Scenarios
1. **States**
   - Loading → renders skeleton (DetailSkeleton)
   - Error → renders error message + retry button
   - Empty (no request) → "Chọn yêu cầu từ danh sách"
   - Data → renders request details

2. **Data Display**
   - Customer info card fields
   - Tour info card fields
   - Booking code banner (when exists)

3. **Interactions**
   - Edit button visibility when onEditClick provided
   - Edit button click calls onEditClick
   - Retry button calls onRefresh

4. **Permission-based Features**
   - Revenue section shown when bookingCode + can('revenue:view')
   - Revenue section hidden without permission

## Architecture

### File: `src/components/requests/__tests__/request-detail-panel.test.tsx`

```typescript
describe('RequestDetailPanel', () => {
  describe('States', () => {
    it('renders loading skeleton when isLoading=true')
    it('renders error state with retry button')
    it('renders empty state when request=null')
  })

  describe('Data Display', () => {
    it('renders customer info fields')
    it('renders tour info fields')
    it('renders booking code banner when exists')
  })

  describe('Interactions', () => {
    it('shows edit button when onEditClick provided')
    it('calls onEditClick when edit button clicked')
    it('calls onRefresh when retry button clicked')
  })

  describe('Permission-based Features', () => {
    it('shows revenue section with permission + bookingCode')
    it('hides revenue section without permission')
  })
})
```

## Related Code Files
- `src/components/requests/request-detail-panel.tsx` (367 lines)
- `src/hooks/use-permission.ts`
- `src/components/revenues/` (RevenueTable, RevenueSummaryCard)

## Implementation Steps

### 1. Setup test file with mock overrides
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequestDetailPanel } from '../request-detail-panel';
import { mockRequest, createMockRequest, setupFetchMock } from './test-utils';
import { usePermission } from '@/hooks/use-permission';

jest.mock('@/hooks/use-permission');
const mockUsePermission = usePermission as jest.Mock;
```

### 2. Implement state tests
```typescript
it('renders loading skeleton when isLoading=true', () => {
  render(
    <RequestDetailPanel
      request={null}
      isLoading={true}
      onRefresh={jest.fn()}
    />
  );
  // Check for skeleton elements (animate-pulse classes)
  expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
});

it('renders error state with retry button', () => {
  render(
    <RequestDetailPanel
      request={null}
      isLoading={false}
      error="Test error"
      onRefresh={jest.fn()}
    />
  );
  expect(screen.getByText('Không thể tải chi tiết')).toBeInTheDocument();
  expect(screen.getByText('Thử lại')).toBeInTheDocument();
});
```

### 3. Implement data display tests
- Check card titles: "Thông tin khách hàng", "Thông tin Tour"
- Check field values rendered

### 4. Implement permission tests
```typescript
it('shows revenue section with permission + bookingCode', () => {
  mockUsePermission.mockReturnValue({
    can: jest.fn(() => true),
    isAdmin: false,
  });

  const requestWithBooking = createMockRequest({ bookingCode: 'BK001' });
  setupFetchMock({ '/api/revenues?requestId=1': { success: true, data: [] }});

  render(
    <RequestDetailPanel
      request={requestWithBooking}
      isLoading={false}
      onRefresh={jest.fn()}
    />
  );

  expect(screen.getByText(/Doanh thu/)).toBeInTheDocument();
});
```

## Todo List
- [ ] Create request-detail-panel.test.tsx
- [ ] State tests (3 scenarios)
- [ ] Data display tests (3 scenarios)
- [ ] Interaction tests (3 scenarios)
- [ ] Permission tests (2 scenarios)

## Success Criteria
- [ ] All 4 states tested
- [ ] Permission-based rendering verified
- [ ] Callbacks properly tested
- [ ] Fetch mocked for revenue data

## Risk Assessment
- **Medium**: useEffect fetches revenues - need async handling
- **Medium**: Multiple permission states to mock

## Security Considerations
- Verify revenue section hidden without proper permission

## Next Steps
→ Run `npm test` to verify all tests pass
