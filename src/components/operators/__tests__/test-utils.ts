/**
 * Test utilities and mock fixtures for Operator components
 * Provides shared mocks, fixtures, and helper functions
 * Follows pattern from src/components/requests/__tests__/test-utils.ts
 */

import type {
  ApprovalQueueItem,
  OperatorHistoryEntry,
  OperatorFilters,
  Supplier,
  PaymentStatus,
} from '@/types';

// ============================================
// MOCK FIXTURES
// ============================================

/**
 * Base mock ApprovalQueueItem fixture
 */
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
  paymentStatus: 'PARTIAL' as PaymentStatus,
  paymentDeadline: new Date('2026-02-15'),
  daysOverdue: -5, // 5 days until due (negative = upcoming)
  isLocked: false,
};

/**
 * Overdue approval item fixture
 */
export const mockOverdueApprovalItem: ApprovalQueueItem = {
  ...mockApprovalQueueItem,
  id: 'op2',
  daysOverdue: 3, // 3 days overdue
  paymentDeadline: new Date('2026-01-08'),
};

/**
 * Today due approval item fixture
 */
export const mockTodayDueApprovalItem: ApprovalQueueItem = {
  ...mockApprovalQueueItem,
  id: 'op3',
  daysOverdue: 0, // Due today
};

/**
 * Locked approval item fixture
 */
export const mockLockedApprovalItem: ApprovalQueueItem = {
  ...mockApprovalQueueItem,
  id: 'op4',
  isLocked: true,
};

/**
 * Array of mock approval items for table tests
 */
export const mockApprovalQueueItems: ApprovalQueueItem[] = [
  mockApprovalQueueItem,
  mockOverdueApprovalItem,
  mockTodayDueApprovalItem,
];

/**
 * Base mock OperatorHistoryEntry fixture
 */
export const mockOperatorHistoryEntry: OperatorHistoryEntry = {
  id: 'h1',
  operatorId: 'op1',
  action: 'CREATE',
  changes: { serviceName: { after: 'Khách sạn Mường Thanh' } },
  userId: 'user1',
  createdAt: new Date('2026-01-10T10:00:00'),
};

/**
 * Update history entry fixture
 */
export const mockUpdateHistoryEntry: OperatorHistoryEntry = {
  id: 'h2',
  operatorId: 'op1',
  action: 'UPDATE',
  changes: {
    totalCost: { before: 4000000, after: 5000000 },
    vat: { before: 400000, after: 500000 },
  },
  userId: 'user1',
  createdAt: new Date('2026-01-11T14:30:00'),
};

/**
 * Lock KT history entry fixture
 */
export const mockLockKTHistoryEntry: OperatorHistoryEntry = {
  id: 'h3',
  operatorId: 'op1',
  action: 'LOCK_KT',
  changes: {
    lockKT: { before: false, after: true },
    tier: 'KT',
    month: '2026-01',
    batch: true,
  },
  userId: 'user1',
  createdAt: new Date('2026-01-12T09:00:00'),
};

/**
 * Array of mock history entries
 */
export const mockOperatorHistoryEntries: OperatorHistoryEntry[] = [
  mockLockKTHistoryEntry,
  mockUpdateHistoryEntry,
  mockOperatorHistoryEntry,
];

/**
 * Default empty operator filters
 */
export const defaultOperatorFilters: OperatorFilters = {
  search: '',
  serviceType: '',
  paymentStatus: '',
  fromDate: '',
  toDate: '',
  isLocked: undefined,
  includeArchived: false,
};

/**
 * Base mock Supplier fixture
 */
export const mockSupplier: Supplier = {
  id: 'sup1',
  code: 'MT001',
  name: 'Mường Thanh Group',
  type: 'HOTEL',
  location: 'HANOI',
  paymentModel: 'CREDIT',
  creditLimit: 100000000,
  paymentTermDays: 30,
  contactName: 'Nguyen Van B',
  contactPhone: '0901234567',
  contactEmail: 'contact@muongthanh.com',
  bankAccount: '0123456789 - Vietcombank',
  isActive: true,
  notes: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

/**
 * Second mock supplier for dropdown tests
 */
export const mockSupplier2: Supplier = {
  ...mockSupplier,
  id: 'sup2',
  code: 'VT001',
  name: 'Viettel Travel',
  type: 'TRANSPORT',
  bankAccount: '9876543210 - Techcombank',
};

/**
 * Array of mock suppliers
 */
export const mockSuppliers: Supplier[] = [mockSupplier, mockSupplier2];

/**
 * Mock F5 request fixture (for booking dropdown)
 */
export const mockRequestF5 = {
  id: 'req1',
  code: 'BK001',
  customerName: 'Nguyen Van A',
  status: 'F5',
};

/**
 * Second F5 request fixture
 */
export const mockRequestF5_2 = {
  id: 'req2',
  code: 'BK002',
  customerName: 'Tran Thi B',
  status: 'F5',
};

/**
 * Array of mock F5 requests
 */
export const mockRequestsF5 = [mockRequestF5, mockRequestF5_2];

/**
 * Mock operator data for edit mode
 */
export const mockOperatorData = {
  id: 'op1',
  requestId: 'req1',
  supplierId: 'sup1',
  supplier: 'Mường Thanh Group',
  serviceDate: new Date('2026-02-01'),
  serviceType: 'HOTEL',
  serviceName: 'Khách sạn Mường Thanh - 2 đêm',
  costBeforeTax: 4545454,
  vat: 454546,
  totalCost: 5000000,
  paidAmount: 2000000,
  paymentDeadline: new Date('2026-02-15'),
  bankAccount: '0123456789 - Vietcombank',
  notes: 'Phòng deluxe, view hồ',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a mock ApprovalQueueItem with custom overrides
 */
export function createMockApprovalItem(
  overrides?: Partial<ApprovalQueueItem>
): ApprovalQueueItem {
  return { ...mockApprovalQueueItem, ...overrides };
}

/**
 * Create a mock OperatorHistoryEntry with custom overrides
 */
export function createMockHistoryEntry(
  overrides?: Partial<OperatorHistoryEntry>
): OperatorHistoryEntry {
  return { ...mockOperatorHistoryEntry, ...overrides };
}

/**
 * Create a mock Supplier with custom overrides
 */
export function createMockSupplier(overrides?: Partial<Supplier>): Supplier {
  return { ...mockSupplier, ...overrides };
}

/**
 * Create mock OperatorFilters with custom overrides
 */
export function createMockFilters(
  overrides?: Partial<OperatorFilters>
): OperatorFilters {
  return { ...defaultOperatorFilters, ...overrides };
}

/**
 * Setup global fetch mock with predefined responses
 * Matches URL patterns to return appropriate mock data
 * @param responses - Map of URL patterns to response data
 */
export function setupFetchMock(
  responses: Record<string, unknown> = {}
): jest.Mock {
  const mockFetch = jest.fn((url: string, options?: RequestInit) => {
    // Find matching response by checking if URL contains the key
    const matchingKey = Object.keys(responses).find((key) => url.includes(key));
    const response = matchingKey
      ? responses[matchingKey]
      : { success: true, data: [] };

    // Handle response based on method
    const method = options?.method || 'GET';

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
  if (global.fetch && typeof (global.fetch as jest.Mock).mockReset === 'function') {
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
    user: { id: 'user1', role: 'ADMIN', name: 'Admin User', email: 'admin@test.com' },
  },
  status: 'authenticated' as const,
};

/**
 * Session mock for ACCOUNTANT role
 */
export const mockAccountantSession = {
  data: {
    user: { id: 'user2', role: 'ACCOUNTANT', name: 'Accountant User', email: 'kt@test.com' },
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
// PERMISSION MOCK
// ============================================

/**
 * Default permission mock return value (ADMIN)
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
  isAdmin: false,
  isAccountant: true,
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
// CURRENCY FORMAT HELPER
// ============================================

/**
 * Format number to VND currency (for test assertions)
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}
