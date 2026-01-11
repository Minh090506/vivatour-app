# Phase 01: Test Utils Setup

**Parent**: [plan.md](./plan.md)
**Status**: Done
**Effort**: 20min

---

## Overview

Create shared test utilities, mock fixtures, and helper functions for Operator component tests. Follows pattern from `src/components/requests/__tests__/test-utils.ts`.

---

## File: `src/components/operators/__tests__/test-utils.ts`

### Mock Fixtures

```typescript
// ApprovalQueueItem fixture
export const mockApprovalQueueItem: ApprovalQueueItem = {
  id: 'op1',
  requestCode: 'BK001',
  customerName: 'Nguyen Van A',
  serviceDate: new Date('2026-02-01'),
  serviceType: 'HOTEL',
  serviceName: 'Khách sạn Mường Thanh',
  supplierName: 'Mường Thanh Group',
  totalCost: 5000000,
  paidAmount: 2000000,
  debt: 3000000,
  paymentDeadline: new Date('2026-02-15'),
  daysOverdue: -5, // 5 days until due
  isLocked: false,
};

// OperatorHistoryEntry fixture
export const mockOperatorHistoryEntry: OperatorHistoryEntry = {
  id: 'h1',
  operatorId: 'op1',
  action: 'CREATE',
  changes: { serviceName: { after: 'Khách sạn Mường Thanh' } },
  userId: 'user1',
  createdAt: new Date('2026-01-10T10:00:00'),
};

// OperatorFilters fixture
export const defaultOperatorFilters: OperatorFilters = {
  search: '',
  serviceType: '',
  paymentStatus: '',
  fromDate: '',
  toDate: '',
  isLocked: undefined,
  includeArchived: false,
};

// Supplier fixture
export const mockSupplier: Supplier = {
  id: 'sup1',
  code: 'MT001',
  name: 'Mường Thanh Group',
  type: 'HOTEL',
  paymentModel: 'CREDIT',
  bankAccount: '0123456789 - Vietcombank',
  creditLimit: 100000000,
  notes: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Request fixture (F5 status)
export const mockRequestF5 = {
  id: 'req1',
  code: 'BK001',
  customerName: 'Nguyen Van A',
  status: 'F5',
};
```

### Helper Functions

```typescript
// Create custom ApprovalQueueItem
export function createMockApprovalItem(overrides?: Partial<ApprovalQueueItem>): ApprovalQueueItem;

// Create custom HistoryEntry
export function createMockHistoryEntry(overrides?: Partial<OperatorHistoryEntry>): OperatorHistoryEntry;

// Setup fetch mock with URL pattern matching
export function setupFetchMock(responses: Record<string, unknown>): jest.Mock;

// Reset all mocks
export function resetMocks(): void;
```

### Global Mocks

```typescript
// Router mock
export const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
};

// Session mock (ADMIN by default)
export const mockSession = {
  data: { user: { id: 'user1', role: 'ADMIN', name: 'Admin User' } },
  status: 'authenticated',
};

// Toast mock
export const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
```

---

## Mock Setup Pattern

Each test file should import and apply mocks:

```typescript
import { setupFetchMock, resetMocks, mockApprovalQueueItem } from './test-utils';

// Module mocks at top
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => mockSession),
}));

jest.mock('sonner', () => ({
  toast: mockToast,
}));

describe('ComponentName', () => {
  beforeEach(() => {
    resetMocks();
    setupFetchMock({
      '/api/operators': { success: true, data: [] },
    });
  });
});
```

---

## Success Criteria

- [x] All fixtures typed correctly with TypeScript
- [x] Fixtures match actual data structures in types/index.ts
- [x] Helper functions tested with simple smoke tests
- [x] Pattern matches requests/__tests__/test-utils.ts
