# Phase 04: Follow-Up Widget Tests

**Effort**: 45 minutes
**Output**: `src/components/dashboard/__tests__/follow-up-widget.test.tsx`
**Target**: ~14 tests

## Component Analysis

**File**: `src/components/dashboard/follow-up-widget.tsx` (189 lines)

### Props Interface

```typescript
interface FollowUpWidgetProps {
  limit?: number;  // Default: 5
}
```

### Key Features

1. **3 Parallel API Calls** on mount:
   - `/api/requests?followup=overdue&limit=N`
   - `/api/requests?followup=today&limit=N`
   - `/api/requests?followup=upcoming&limit=N`

2. **3 Sections** with different colors:
   - Overdue (red) - AlertCircle icon
   - Today (yellow) - Clock icon
   - Upcoming (green) - Clock icon

3. **FollowUpItem** sub-component:
   - Customer name, RQID, country
   - Status badge
   - Next follow-up date

4. **Click Navigation**: `router.push(/requests/${id})`

5. **Empty State**: CheckCircle with "Không có follow-up nào"

## Mock Requirements

### Router Mock

```typescript
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

### Fetch Mock

```typescript
const mockOverdue = [
  { id: 'r1', customerName: 'Nguyen A', rqid: 'RQ001', country: 'VN', status: 'FOLLOWUP', nextFollowUp: '2026-01-10' },
];
const mockToday = [
  { id: 'r2', customerName: 'Tran B', rqid: 'RQ002', country: 'US', status: 'QUOTE', nextFollowUp: '2026-01-11' },
];
const mockUpcoming = [
  { id: 'r3', customerName: 'Le C', rqid: 'RQ003', country: 'JP', status: 'LEAD', nextFollowUp: '2026-01-15' },
];
```

## Test Cases

### 1. Rendering Tests (~3 tests)

```typescript
describe('FollowUpWidget Rendering', () => {
  it('renders card with "Follow-up" title');
  it('renders Clock icon in header');
  it('renders "Xem tất cả" button');
});
```

### 2. Loading State (~2 tests)

```typescript
describe('FollowUpWidget Loading', () => {
  it('shows "Đang tải..." during fetch');
  it('hides loading message after fetch completes');
});
```

### 3. API Calls (~2 tests)

```typescript
describe('FollowUpWidget API', () => {
  it('fetches 3 endpoints with correct limit param', async () => {
    render(<FollowUpWidget limit={10} />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/requests?followup=overdue&limit=10');
      expect(fetch).toHaveBeenCalledWith('/api/requests?followup=today&limit=10');
      expect(fetch).toHaveBeenCalledWith('/api/requests?followup=upcoming&limit=10');
    });
  });

  it('uses default limit=5 when not specified');
});
```

### 4. Section Rendering (~4 tests)

```typescript
describe('FollowUpWidget Sections', () => {
  it('renders overdue section with red styling and count', async () => {
    render(<FollowUpWidget />);
    await waitFor(() => {
      expect(screen.getByText('Quá hạn (1)')).toBeInTheDocument();
    });
  });

  it('renders today section with yellow styling');
  it('renders upcoming section with green styling');
  it('hides section when array is empty');
});
```

### 5. Follow-Up Item Tests (~2 tests)

```typescript
describe('FollowUpItem', () => {
  it('displays customer name, RQID, and country', async () => {
    render(<FollowUpWidget />);
    await waitFor(() => {
      expect(screen.getByText('Nguyen A')).toBeInTheDocument();
      expect(screen.getByText(/RQ001.*VN/)).toBeInTheDocument();
    });
  });

  it('displays status badge');
});
```

### 6. Click Handlers (~2 tests)

```typescript
describe('FollowUpWidget Navigation', () => {
  it('navigates to request detail on item click', async () => {
    const user = userEvent.setup();
    render(<FollowUpWidget />);

    await waitFor(() => screen.getByText('Nguyen A'));
    await user.click(screen.getByText('Nguyen A'));

    expect(mockPush).toHaveBeenCalledWith('/requests/r1');
  });

  it('navigates to follow-up tab on "Xem tất cả" click', async () => {
    const user = userEvent.setup();
    render(<FollowUpWidget />);

    await user.click(screen.getByText('Xem tất cả'));
    expect(mockPush).toHaveBeenCalledWith('/requests?tab=followup');
  });
});
```

### 7. Empty State (~1 test)

```typescript
describe('FollowUpWidget Empty State', () => {
  it('shows "Không có follow-up nào" when all arrays empty', async () => {
    setupEmptyFetchMock();
    render(<FollowUpWidget />);

    await waitFor(() => {
      expect(screen.getByText('Không có follow-up nào')).toBeInTheDocument();
    });
  });
});
```

## Test File Structure

```typescript
// src/components/dashboard/__tests__/follow-up-widget.test.tsx

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowUpWidget } from '../follow-up-widget';

// Mock data
const mockOverdue = [...];
const mockToday = [...];
const mockUpcoming = [...];

function setupFetchMock() {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('overdue')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: mockOverdue }) });
    if (url.includes('today')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: mockToday }) });
    if (url.includes('upcoming')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: mockUpcoming }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });
  }) as jest.Mock;
}

describe('FollowUpWidget', () => {
  beforeEach(() => {
    setupFetchMock();
    jest.clearAllMocks();
  });

  // Tests...
});
```

## Directory Structure

```
src/components/dashboard/__tests__/
└── follow-up-widget.test.tsx (~200 lines, 14 tests)
```

## Verification Checklist

- [ ] All 3 API endpoints called correctly
- [ ] Limit prop passed to API
- [ ] 3 sections render with correct colors
- [ ] Empty state renders when no data
- [ ] Click handlers call router.push with correct paths
- [ ] Loading state visible initially
- [ ] Section counts match array lengths
