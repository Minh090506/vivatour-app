/**
 * Test utilities and mock fixtures for Request components
 * Provides shared mocks, fixtures, and helper functions
 */

import type { Request, User, RequestFilters } from '@/types';

// ============================================
// MOCK FIXTURES
// ============================================

/**
 * Base mock request with all required fields
 */
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
  expectedDate: null,
  expectedRevenue: 5000000,
  expectedCost: 3000000,
  requestDate: new Date('2026-01-10'),
  receivedDate: new Date('2026-01-10'),
  lastContactDate: null,
  nextFollowUp: null,
  statusChangedAt: null,
  statusChangedBy: null,
  notes: 'Test notes',
  sellerId: 's1',
  seller: { id: 's1', email: 'seller@test.com', name: 'Test Seller', role: 'SELLER', avatar: null },
  sheetRowIndex: null,
  createdAt: new Date('2026-01-10'),
  updatedAt: new Date('2026-01-10'),
};

/**
 * Mock request with booking code (for detail panel revenue tests)
 */
export const mockRequestWithBooking: Request = {
  ...mockRequest,
  id: '2',
  code: 'BK001',
  bookingCode: '20260110S0001',
  status: 'BOOKING',
  stage: 'OUTCOME',
};

/**
 * Array of mock requests for table tests
 */
export const mockRequests: Request[] = [
  mockRequest,
  {
    ...mockRequest,
    id: '2',
    code: 'RQ002',
    rqid: 'RQ-2024-002',
    customerName: 'Tran Thi B',
    contact: 'tran@example.com',
    country: 'France',
    status: 'DA_BAO_GIA',
    stage: 'QUOTE',
    nextFollowUp: new Date(Date.now() - 86400000), // Yesterday (overdue)
  },
  {
    ...mockRequest,
    id: '3',
    code: 'RQ003',
    rqid: 'RQ-2024-003',
    customerName: 'Le Van C',
    contact: 'le@example.com',
    country: 'UK',
    status: 'F1',
    stage: 'FOLLOWUP',
    nextFollowUp: new Date(), // Today
  },
];

/**
 * Mock sellers for filter tests
 */
export const mockSellers: User[] = [
  { id: 's1', email: 'seller1@test.com', name: 'Seller One', role: 'SELLER', avatar: null },
  { id: 's2', email: 'seller2@test.com', name: 'Seller Two', role: 'SELLER', avatar: null },
];

/**
 * Default empty filters
 */
export const defaultFilters: RequestFilters = {
  search: '',
  seller: '',
  status: '',
  stage: '',
  source: '',
  country: '',
  fromDate: '',
  toDate: '',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a mock request with custom overrides
 */
export function createMockRequest(overrides?: Partial<Request>): Request {
  return { ...mockRequest, ...overrides };
}

/**
 * Setup global fetch mock with predefined responses
 * @param responses - Map of URL patterns to response data
 */
export function setupFetchMock(responses: Record<string, unknown> = {}): jest.Mock {
  const mockFetch = jest.fn((url: string) => {
    // Find matching response by checking if URL contains the key
    const matchingKey = Object.keys(responses).find((key) => url.includes(key));
    const response = matchingKey ? responses[matchingKey] : { success: true, data: [] };

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
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
// MOCK PERMISSION HELPER
// ============================================

/**
 * Default permission mock return value
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
 * Create permission mock with custom settings
 */
export function createPermissionMock(overrides?: Partial<typeof defaultPermissionMock>) {
  return { ...defaultPermissionMock, ...overrides };
}

// ============================================
// ERROR MOCK HELPERS
// ============================================

/**
 * Setup fetch mock to return error response
 * @param status - HTTP status code
 * @param message - Error message
 */
export function setupFetchErrorMock(status: number, message: string): jest.Mock {
  const mockFetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ success: false, error: message }),
    })
  );
  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

/**
 * Setup fetch mock to simulate network failure
 */
export function setupNetworkErrorMock(): jest.Mock {
  const mockFetch = jest.fn(() => Promise.reject(new Error('Network error')));
  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}

/**
 * Create mock request with overdue follow-up
 */
export function createMockRequestWithOverdueFollowUp(daysOverdue: number = 1): Request {
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - daysOverdue);
  return createMockRequest({
    id: 'overdue-1',
    nextFollowUp: overdueDate,
  });
}

/**
 * Create mock request with future follow-up
 */
export function createMockRequestWithFutureFollowUp(daysAhead: number = 1): Request {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  return createMockRequest({
    id: 'future-1',
    nextFollowUp: futureDate,
  });
}

// ============================================
// INTERSECTION OBSERVER MOCK
// ============================================

/**
 * Mock IntersectionObserver for infinite scroll tests
 */
export function mockIntersectionObserver(): void {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });
  window.IntersectionObserver = mockIntersectionObserver;
}

/**
 * Trigger intersection observer callback
 * @param isIntersecting - Whether element is visible
 */
export function triggerIntersection(isIntersecting: boolean): void {
  const observer = (window.IntersectionObserver as jest.Mock).mock.results[0]?.value;
  if (observer) {
    const callback = (window.IntersectionObserver as jest.Mock).mock.calls[0]?.[0];
    if (callback) {
      callback([{ isIntersecting }]);
    }
  }
}
