# Phase 01: Test Utilities & Mock Fixtures

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Jest, RTL, existing test patterns

## Overview
- **Date**: 2026-01-11
- **Priority**: P2
- **Status**: pending
- **Review**: pending

## Key Insights
- Reuse mock patterns from `src/app/login/__tests__/login-form.test.tsx`
- usePermission hook wraps useSession - mock at hook level for simplicity
- Request module uses REQUEST_STATUSES config - mock not needed (use real config)

## Requirements
1. Create shared mock fixtures for Request data
2. Mock next/navigation, next-auth/react
3. Mock usePermission hook with configurable returns
4. Mock global.fetch for API calls
5. Utility render wrapper with providers if needed

## Architecture

### File: `src/components/requests/__tests__/test-utils.ts`

```typescript
// Mock fixtures
export const mockRequest: Request
export const mockRequests: Request[]
export const mockSellers: User[]

// Mock setup helpers
export function setupPermissionMock(options?)
export function setupFetchMock(responses?)
export function createMockRequest(overrides?): Request
```

## Related Code Files
- `src/app/login/__tests__/login-form.test.tsx` (patterns)
- `src/types/index.ts` (Request, User types)
- `src/hooks/use-permission.ts` (hook interface)

## Implementation Steps

### 1. Create test-utils.ts with mocks
```typescript
// Jest mocks at top of file
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', role: 'ADMIN' } },
    status: 'authenticated',
  })),
}));

jest.mock('@/hooks/use-permission', () => ({
  usePermission: jest.fn(() => ({
    can: jest.fn(() => true),
    isAdmin: true,
    isAccountant: false,
    isSeller: false,
    isLoading: false,
    isAuthenticated: true,
  })),
}));
```

### 2. Create mock fixtures
```typescript
export const mockRequest: Request = {
  id: '1',
  code: 'RQ001',
  rqid: 'RQ-2024-001',
  bookingCode: null,
  customerName: 'Nguyen Van A',
  contact: 'test@example.com',
  whatsapp: '+84123456789',
  pax: 2,
  country: 'USA',
  source: 'TripAdvisor',
  status: 'DANG_LL_CHUA_TL',
  stage: 'LEAD',
  tourDays: 5,
  startDate: new Date('2026-02-01'),
  endDate: new Date('2026-02-05'),
  expectedRevenue: 5000000,
  expectedCost: 3000000,
  notes: 'Test notes',
  // ... other fields
};

export const mockSellers: User[] = [
  { id: 's1', email: 'seller1@test.com', name: 'Seller 1', role: 'SELLER', avatar: null },
  { id: 's2', email: 'seller2@test.com', name: 'Seller 2', role: 'SELLER', avatar: null },
];
```

### 3. Create helper functions
```typescript
export function createMockRequest(overrides?: Partial<Request>): Request {
  return { ...mockRequest, ...overrides };
}

export function setupFetchMock(responses: Record<string, unknown>) {
  global.fetch = jest.fn((url: string) => {
    const response = responses[url] || { success: false };
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
    });
  }) as jest.Mock;
}
```

## Todo List
- [ ] Create test-utils.ts file
- [ ] Define mock Request/User fixtures
- [ ] Setup jest.mock for dependencies
- [ ] Create helper functions

## Success Criteria
- [ ] Mocks importable by all test files
- [ ] Fixtures match actual types
- [ ] Helper functions reduce test boilerplate

## Risk Assessment
- **Low**: Standard mocking patterns, no complex setup

## Security Considerations
- None (test code only)

## Next Steps
→ Phase 02: RequestForm tests
