/**
 * Test utilities and mock fixtures for Settings components
 * Provides shared mocks, fixtures, and helper functions
 */

import type { Seller, FollowUpStatus } from '@/types';

// ============================================
// MOCK FIXTURES - SELLER
// ============================================

export const mockSeller: Seller = {
  id: 'seller1',
  telegramId: '123456789',
  sellerName: 'Ly - Jenny',
  sheetName: 'Ly - Jenny',
  metaName: 'Jenny Nguyen',
  email: 'jenny@vivatour.vn',
  gender: 'FEMALE',
  sellerCode: 'J',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const mockInactiveSeller: Seller = {
  ...mockSeller,
  id: 'seller2',
  telegramId: '987654321',
  sellerName: 'Nguyen Van A',
  sheetName: 'Nguyen Van A',
  sellerCode: 'A',
  gender: 'MALE',
  isActive: false,
};

export const mockSellers: Seller[] = [mockSeller, mockInactiveSeller];

// ============================================
// MOCK FIXTURES - FOLLOWUP STATUS
// ============================================

export const mockFollowUpStatus: FollowUpStatus = {
  id: 'status1',
  status: 'Mới',
  aliases: ['mới', 'new', 'moi'],
  daysToFollowup: 1,
  sortOrder: 0,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const mockFollowUpStatus2: FollowUpStatus = {
  id: 'status2',
  status: 'Đang theo dõi',
  aliases: ['theo dõi', 'following'],
  daysToFollowup: 3,
  sortOrder: 1,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const mockFollowUpStatus3: FollowUpStatus = {
  id: 'status3',
  status: 'Chờ phản hồi',
  aliases: [],
  daysToFollowup: 0,
  sortOrder: 2,
  isActive: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const mockFollowUpStatuses: FollowUpStatus[] = [
  mockFollowUpStatus,
  mockFollowUpStatus2,
  mockFollowUpStatus3,
];

// ============================================
// MOCK FIXTURES - SYNC STATUS
// ============================================

export const mockSyncStatus = {
  configured: true,
  stats: [
    { sheetName: 'Request', status: 'SUCCESS', _count: 150 },
    { sheetName: 'Request', status: 'FAILED', _count: 3 },
    { sheetName: 'Operator', status: 'SUCCESS', _count: 89 },
    { sheetName: 'Revenue', status: 'SUCCESS', _count: 45 },
  ],
  lastSyncs: [
    { sheetName: 'Request', lastSync: '2026-01-12T10:30:00Z', lastRow: 153 },
    { sheetName: 'Operator', lastSync: '2026-01-12T09:15:00Z', lastRow: 89 },
    { sheetName: 'Revenue', lastSync: null, lastRow: null },
  ],
};

export const mockSyncStatusUnconfigured = {
  configured: false,
  stats: [],
  lastSyncs: [],
};

export const mockSyncResponse = {
  success: true,
  synced: 5,
  errors: 0,
  message: 'Synced 5 rows',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createMockSeller(overrides?: Partial<Seller>): Seller {
  return { ...mockSeller, ...overrides };
}

export function createMockFollowUpStatus(
  overrides?: Partial<FollowUpStatus>
): FollowUpStatus {
  return { ...mockFollowUpStatus, ...overrides };
}

// ============================================
// FETCH MOCK HELPERS
// ============================================

export function setupFetchMock(
  responses: Record<string, unknown> = {}
): jest.Mock {
  const mockFetch = jest.fn((url: string, options?: RequestInit) => {
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

export function resetMocks(): void {
  jest.clearAllMocks();
  if (global.fetch && typeof (global.fetch as jest.Mock).mockReset === 'function') {
    (global.fetch as jest.Mock).mockReset();
  }
}

// ============================================
// GLOBAL MOCKS
// ============================================

export const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

export const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};
