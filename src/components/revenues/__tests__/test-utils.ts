/**
 * Test utilities and mock fixtures for Revenue components
 * Provides shared mocks, fixtures, and helper functions
 * Follows pattern from src/components/operators/__tests__/test-utils.ts
 */

// ============================================
// MOCK FIXTURES
// ============================================

/**
 * Base mock Revenue fixture
 */
export const mockRevenue = {
  id: 'rev1',
  requestId: 'req1',
  paymentDate: new Date('2026-01-15'),
  paymentType: 'DEPOSIT',
  paymentSource: 'BANK_TRANSFER',
  foreignAmount: null as number | null,
  currency: 'VND',
  exchangeRate: null as number | null,
  amountVND: 5000000,
  notes: 'Dat coc 50%',
  lockKT: false,
  lockAdmin: false,
  lockFinal: false,
  isLocked: false,
  lockedAt: null as Date | string | null,
  lockedBy: null as string | null,
  request: {
    code: 'RQ001',
    customerName: 'Nguyen Van A',
    bookingCode: 'BK20260115-001',
  },
};

/**
 * Revenue locked at KT tier only
 */
export const mockLockedKTRevenue = {
  ...mockRevenue,
  id: 'rev-kt',
  lockKT: true,
  lockAdmin: false,
  lockFinal: false,
};

/**
 * Revenue locked at KT + Admin tiers
 */
export const mockLockedAdminRevenue = {
  ...mockRevenue,
  id: 'rev-admin',
  lockKT: true,
  lockAdmin: true,
  lockFinal: false,
};

/**
 * Revenue fully locked (all 3 tiers)
 */
export const mockLockedFinalRevenue = {
  ...mockRevenue,
  id: 'rev-final',
  lockKT: true,
  lockAdmin: true,
  lockFinal: true,
};

/**
 * Foreign currency revenue (USD)
 */
export const mockForeignRevenue = {
  ...mockRevenue,
  id: 'rev-usd',
  foreignAmount: 1000,
  currency: 'USD',
  exchangeRate: 25000,
  amountVND: 25000000,
};

/**
 * Refund revenue (negative in calculations)
 */
export const mockRefundRevenue = {
  ...mockRevenue,
  id: 'rev-refund',
  paymentType: 'REFUND',
  amountVND: 1000000,
  notes: 'Hoan tien khach',
};

/**
 * Array of mock revenues for table tests
 */
export const mockRevenues = [
  mockRevenue,
  mockForeignRevenue,
  mockLockedKTRevenue,
];

/**
 * Request for dropdown (OUTCOME stage)
 */
export const mockRequestOutcome = {
  id: 'req1',
  code: 'RQ001',
  customerName: 'Nguyen Van A',
  bookingCode: 'BK20260115-001',
};

/**
 * Second request for dropdown
 */
export const mockRequestOutcome2 = {
  id: 'req2',
  code: 'RQ002',
  customerName: 'Tran Thi B',
  bookingCode: 'BK20260116-002',
};

/**
 * Array of mock requests
 */
export const mockRequests = [mockRequestOutcome, mockRequestOutcome2];

/**
 * Base mock history entry
 */
export const mockHistoryEntry = {
  id: 'h1',
  revenueId: 'rev1',
  action: 'CREATE',
  changes: { amountVND: { after: 5000000 } },
  userId: 'user1',
  userName: 'Admin User',
  createdAt: '2026-01-15T10:00:00Z',
};

/**
 * Update history entry
 */
export const mockUpdateHistoryEntry = {
  id: 'h2',
  revenueId: 'rev1',
  action: 'UPDATE',
  changes: {
    amountVND: { before: 5000000, after: 6000000 },
  },
  userId: 'user1',
  userName: 'Admin User',
  createdAt: '2026-01-16T14:30:00Z',
};

/**
 * Lock KT history entry
 */
export const mockLockKTHistoryEntry = {
  id: 'h3',
  revenueId: 'rev1',
  action: 'LOCK_KT',
  changes: { tier: 'KT' },
  userId: 'user2',
  userName: 'Accountant User',
  createdAt: '2026-01-17T09:00:00Z',
};

/**
 * Array of mock history entries
 */
export const mockHistoryEntries = [
  mockLockKTHistoryEntry,
  mockUpdateHistoryEntry,
  mockHistoryEntry,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create mock Revenue with custom overrides
 */
export function createMockRevenue(overrides?: Partial<typeof mockRevenue>) {
  return { ...mockRevenue, ...overrides };
}

/**
 * Create mock history entry with custom overrides
 */
export function createMockHistoryEntry(
  overrides?: Partial<typeof mockHistoryEntry>
) {
  return { ...mockHistoryEntry, ...overrides };
}

/**
 * Create mock Request with custom overrides
 */
export function createMockRequest(
  overrides?: Partial<typeof mockRequestOutcome>
) {
  return { ...mockRequestOutcome, ...overrides };
}

/**
 * Setup global fetch mock with predefined responses
 * Matches URL patterns to return appropriate mock data
 */
export function setupFetchMock(
  responses: Record<string, unknown> = {}
): jest.Mock {
  const mockFetch = jest.fn((url: string, _options?: RequestInit) => {
    // Find matching response by checking if URL contains the key
    const matchingKey = Object.keys(responses).find((key) => url.includes(key));
    const response = matchingKey
      ? responses[matchingKey]
      : { success: true, data: [] };

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    });
  });

  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

/**
 * Setup fetch mock that returns error for specific URL
 */
export function setupFetchMockError(
  errorUrl: string,
  errorMessage: string
): jest.Mock {
  const mockFetch = jest.fn((url: string) => {
    if (url.includes(errorUrl)) {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: errorMessage }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });

  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

/**
 * Reset all mocks - call in beforeEach
 */
export function resetMocks(): void {
  jest.clearAllMocks();
  if (
    global.fetch &&
    typeof (global.fetch as jest.Mock).mockReset === 'function'
  ) {
    (global.fetch as jest.Mock).mockReset();
  }
}

// ============================================
// GLOBAL MOCKS
// ============================================

/**
 * Router mock for next/navigation
 */
export const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

/**
 * Session mock for next-auth/react (ADMIN by default)
 */
export const mockSession = {
  data: {
    user: {
      id: 'user1',
      role: 'ADMIN',
      name: 'Admin User',
      email: 'admin@test.com',
    },
  },
  status: 'authenticated' as const,
};

/**
 * Session mock for ACCOUNTANT role
 */
export const mockAccountantSession = {
  data: {
    user: {
      id: 'user2',
      role: 'ACCOUNTANT',
      name: 'Accountant User',
      email: 'kt@test.com',
    },
  },
  status: 'authenticated' as const,
};

/**
 * Toast mock for sonner
 */
export const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

// ============================================
// PERMISSION MOCKS
// ============================================

/**
 * Default permission mock (ADMIN - full access)
 */
export const defaultPermissionMock = {
  can: jest.fn(() => true),
  canAll: jest.fn(() => true),
  canAny: jest.fn(() => true),
  role: 'ADMIN' as const,
  userId: 'user1',
  isLoading: false,
  isAuthenticated: true,
  isAdmin: true,
  isAccountant: false,
  isSeller: false,
  isOperator: false,
};

/**
 * Accountant permission mock
 */
export const accountantPermissionMock = {
  ...defaultPermissionMock,
  role: 'ACCOUNTANT' as const,
  userId: 'user2',
  isAdmin: false,
  isAccountant: true,
};

/**
 * Seller permission mock (limited access)
 */
export const sellerPermissionMock = {
  ...defaultPermissionMock,
  role: 'SELLER' as const,
  userId: 'user3',
  isAdmin: false,
  isSeller: true,
  can: jest.fn((permission: string) => permission.startsWith('revenue:view')),
};

/**
 * Create permission mock with custom settings
 */
export function createPermissionMock(
  overrides?: Partial<typeof defaultPermissionMock>
) {
  return { ...defaultPermissionMock, ...overrides };
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Payment type labels (Vietnamese)
 */
export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Dat coc',
  FULL_PAYMENT: 'Thanh toan du',
  PARTIAL: 'Mot phan',
  REFUND: 'Hoan tien',
};

/**
 * Payment source labels (Vietnamese)
 */
export const PAYMENT_SOURCE_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Chuyen khoan',
  CASH: 'Tien mat',
  CARD: 'The tin dung',
  PAYPAL: 'PayPal',
  WISE: 'Wise',
  OTHER: 'Khac',
};

// ============================================
// CURRENCY FORMAT HELPER
// ============================================

/**
 * Format number to VND currency (for test assertions)
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}
