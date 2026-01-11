# Phase 01: Test Utils Setup

## Objective
Create shared test utilities and mock fixtures for Revenue component tests.

## Output File
`src/components/revenues/__tests__/test-utils.ts`

## Mock Fixtures

### Revenue Mock
```typescript
export const mockRevenue = {
  id: 'rev1',
  requestId: 'req1',
  paymentDate: new Date('2026-01-15'),
  paymentType: 'DEPOSIT',
  paymentSource: 'BANK_TRANSFER',
  foreignAmount: null,
  currency: 'VND',
  exchangeRate: null,
  amountVND: 5000000,
  notes: 'Dat coc 50%',
  lockKT: false,
  lockAdmin: false,
  lockFinal: false,
  isLocked: false,
  request: {
    code: 'RQ001',
    customerName: 'Nguyen Van A',
    bookingCode: 'BK20260115-001',
  },
};
```

### Locked Revenue Variants
- `mockLockedKTRevenue` - KT tier only
- `mockLockedAdminRevenue` - KT + Admin tiers
- `mockLockedFinalRevenue` - All 3 tiers (fully locked)

### Foreign Currency Revenue
```typescript
export const mockForeignRevenue = {
  ...mockRevenue,
  foreignAmount: 1000,
  currency: 'USD',
  exchangeRate: 25000,
  amountVND: 25000000,
};
```

### Request Mock (for dropdown)
```typescript
export const mockRequestOutcome = {
  id: 'req1',
  code: 'RQ001',
  customerName: 'Nguyen Van A',
  bookingCode: 'BK20260115-001',
};
```

### History Entry Mock
```typescript
export const mockHistoryEntry = {
  id: 'h1',
  revenueId: 'rev1',
  action: 'CREATE',
  changes: { amountVND: { after: 5000000 } },
  userId: 'user1',
  userName: 'Admin User',
  createdAt: '2026-01-15T10:00:00Z',
};
```

## Helper Functions

### createMockRevenue(overrides)
Create custom revenue with merged overrides

### createMockHistoryEntry(overrides)
Create custom history entry

### setupFetchMock(responses)
Setup global fetch mock with URL pattern matching

### setupFetchMockError(url, message)
Setup fetch mock to return error for specific URL

### resetMocks()
Clear all mocks before each test

## Global Mocks

### mockRouter
```typescript
export const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};
```

### mockSession
```typescript
export const mockSession = {
  data: {
    user: { id: 'user1', role: 'ADMIN', name: 'Admin User' },
  },
  status: 'authenticated',
};
```

### mockToast
```typescript
export const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};
```

### defaultPermissionMock
```typescript
export const defaultPermissionMock = {
  can: jest.fn(() => true),
  canAll: jest.fn(() => true),
  canAny: jest.fn(() => true),
  role: 'ADMIN',
  userId: 'user1',
  isLoading: false,
  isAuthenticated: true,
  isAdmin: true,
  isAccountant: false,
};
```

## Constants

### PAYMENT_TYPES
```typescript
export const PAYMENT_TYPES = {
  DEPOSIT: 'Dat coc',
  FULL_PAYMENT: 'Thanh toan du',
  PARTIAL: 'Mot phan',
  REFUND: 'Hoan tien',
};
```

### PAYMENT_SOURCES
```typescript
export const PAYMENT_SOURCES = {
  BANK_TRANSFER: 'Chuyen khoan',
  CASH: 'Tien mat',
  CARD: 'The tin dung',
  PAYPAL: 'PayPal',
  WISE: 'Wise',
  OTHER: 'Khac',
};
```

## Estimated Lines
~150 lines

## Dependencies
- Types from `@/types`
- Pattern from `src/components/operators/__tests__/test-utils.ts`
