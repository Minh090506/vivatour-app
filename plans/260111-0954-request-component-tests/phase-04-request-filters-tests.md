# Phase 04: RequestFilters Tests

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 01 (test-utils)

## Overview
- **Date**: 2026-01-11
- **Priority**: P2
- **Status**: pending
- **Review**: pending

## Key Insights
- Component: 139 lines
- 5 filter controls: Stage, Status, Seller, Search, Date Range
- Seller filter conditional via `showSellerFilter` prop
- "all" value resets filter to empty string
- Uses controlled component pattern (filters + onChange)

## Requirements

### Test Scenarios
1. **Rendering**
   - All filter controls render
   - Seller filter hidden when showSellerFilter=false
   - Seller filter visible when showSellerFilter=true + sellers provided

2. **Filter Changes**
   - Stage change → onChange with updated stage
   - Status change → onChange with updated status
   - Search input → onChange with search value
   - Date inputs → onChange with fromDate/toDate

3. **Reset Behavior**
   - Selecting "Tất cả" sets filter to empty string

## Architecture

### File: `src/components/requests/__tests__/request-filters.test.tsx`

```typescript
describe('RequestFilters', () => {
  describe('Rendering', () => {
    it('renders all filter controls')
    it('hides seller filter when showSellerFilter=false')
    it('shows seller filter when showSellerFilter=true')
  })

  describe('Filter Changes', () => {
    it('calls onChange when stage changed')
    it('calls onChange when status changed')
    it('calls onChange when seller changed')
    it('calls onChange when search input changes')
    it('calls onChange when date range changes')
  })

  describe('Reset Behavior', () => {
    it('sets stage to empty when "Tất cả" selected')
  })
})
```

## Related Code Files
- `src/components/requests/request-filters.tsx` (139 lines)
- `src/config/request-config.ts` (stage/status config)
- `src/types/index.ts` (RequestFilters type)

## Implementation Steps

### 1. Setup test file
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RequestFilters } from '../request-filters';
import { mockSellers } from './test-utils';
import type { RequestFilters as FiltersType } from '@/types';
```

### 2. Implement rendering tests
```typescript
const defaultFilters: FiltersType = {
  search: '',
  seller: '',
  status: '',
  stage: '',
  fromDate: '',
  toDate: '',
};

it('renders all filter controls', () => {
  render(<RequestFilters filters={defaultFilters} onChange={jest.fn()} />);
  expect(screen.getByText('Phễu')).toBeInTheDocument();
  expect(screen.getByText('Trạng thái')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Tìm theo tên, mã...')).toBeInTheDocument();
});
```

### 3. Implement filter change tests
- Select components use Radix - may need userEvent
- Use getByRole for accessibility

### 4. Implement reset tests
- Select "all" value → verify onChange called with empty string

## Todo List
- [ ] Create request-filters.test.tsx
- [ ] Rendering tests (3 scenarios)
- [ ] Filter change tests (5 scenarios)
- [ ] Reset behavior tests (1 scenario)

## Success Criteria
- [ ] All filter controls render
- [ ] onChange called with correct filter updates
- [ ] Seller filter conditional rendering works

## Risk Assessment
- **Medium**: Radix Select components need specific interaction patterns
- **Low**: Controlled component - straightforward testing

## Next Steps
→ Phase 05: RequestDetailPanel tests
