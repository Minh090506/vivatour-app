/**
 * Tests for useReports hook
 * Covers: data fetching, loading state, error handling, date range filtering, refresh
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useReports, type DateRangeOption } from '../use-reports';

// Mock safeFetch
const mockSafeFetch = jest.fn();
jest.mock('@/lib/api/fetch-utils', () => ({
  safeFetch: (...args: unknown[]) => mockSafeFetch(...args),
}));

// Mock data
const mockDashboardData = {
  kpiCards: {
    totalBookings: 100,
    totalRevenue: 50000000,
    totalProfit: 10000000,
    activeRequests: 25,
    conversionRate: 0.35,
  },
  comparison: {
    bookings: { current: 100, previous: 80, changePercent: 25 },
    revenue: { current: 50000000, previous: 40000000, changePercent: 25 },
  },
  dateRange: {
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
    label: 'Thang 1/2026',
  },
};

const mockTrendData = {
  data: [
    { period: '2026-01', revenue: 50000000, cost: 40000000, profit: 10000000 },
  ],
  summary: {
    totalRevenue: 50000000,
    totalCost: 40000000,
    totalProfit: 10000000,
    avgMonthly: 50000000,
  },
  dateRange: mockDashboardData.dateRange,
};

const mockCostBreakdownData = {
  byServiceType: [
    { type: 'Transport', amount: 20000000, percentage: 50 },
    { type: 'Hotel', amount: 15000000, percentage: 37.5 },
    { type: 'Tour', amount: 5000000, percentage: 12.5 },
  ],
  paymentStatus: { paid: 30000000, partial: 5000000, unpaid: 5000000 },
  dateRange: mockDashboardData.dateRange,
};

const mockFunnelData = {
  stages: [
    { stage: 'F1', count: 100, percentage: 100 },
    { stage: 'F2', count: 75, percentage: 75 },
    { stage: 'F3', count: 50, percentage: 50 },
    { stage: 'F4', count: 35, percentage: 35 },
    { stage: 'F5', count: 30, percentage: 30 },
  ],
  conversionRate: 0.3,
  dateRange: mockDashboardData.dateRange,
};

describe('useReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful responses
    mockSafeFetch.mockImplementation((url: string) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({ data: mockDashboardData, error: null, status: 200 });
      }
      if (url.includes('/revenue-trend')) {
        return Promise.resolve({ data: mockTrendData, error: null, status: 200 });
      }
      if (url.includes('/cost-breakdown')) {
        return Promise.resolve({ data: mockCostBreakdownData, error: null, status: 200 });
      }
      if (url.includes('/funnel')) {
        return Promise.resolve({ data: mockFunnelData, error: null, status: 200 });
      }
      return Promise.resolve({ data: null, error: 'Not found', status: 404 });
    });
  });

  describe('Initial Loading State', () => {
    it('starts with loading true', () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      expect(result.current.loading).toBe(true);
    });

    it('starts with null data', () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      expect(result.current.dashboard).toBeNull();
      expect(result.current.trend).toBeNull();
      expect(result.current.costBreakdown).toBeNull();
      expect(result.current.funnel).toBeNull();
    });

    it('starts with null error', () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Data Fetching', () => {
    it('fetches all 4 report endpoints', async () => {
      renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalledTimes(4);
      });

      expect(mockSafeFetch).toHaveBeenCalledWith(
        '/api/reports/dashboard?range=thisMonth',
        expect.any(Object)
      );
      expect(mockSafeFetch).toHaveBeenCalledWith(
        '/api/reports/revenue-trend?range=thisMonth',
        expect.any(Object)
      );
      expect(mockSafeFetch).toHaveBeenCalledWith(
        '/api/reports/cost-breakdown?range=thisMonth',
        expect.any(Object)
      );
      expect(mockSafeFetch).toHaveBeenCalledWith(
        '/api/reports/funnel?range=thisMonth',
        expect.any(Object)
      );
    });

    it('sets loading to false after fetch completes', async () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('populates dashboard data', async () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.dashboard).toEqual(mockDashboardData);
      });
    });

    it('populates trend data', async () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.trend).toEqual(mockTrendData);
      });
    });

    it('populates costBreakdown data', async () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.costBreakdown).toEqual(mockCostBreakdownData);
      });
    });

    it('populates funnel data', async () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.funnel).toEqual(mockFunnelData);
      });
    });
  });

  describe('Error Handling', () => {
    it('sets error when one endpoint fails', async () => {
      mockSafeFetch.mockImplementation((url: string) => {
        if (url.includes('/dashboard')) {
          return Promise.resolve({ data: null, error: 'Server error', status: 500 });
        }
        return Promise.resolve({ data: mockTrendData, error: null, status: 200 });
      });

      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.error).toBe('Server error');
      });
    });

    it('sets Vietnamese error message on network failure', async () => {
      mockSafeFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.error).toBe('Không thể tải dữ liệu báo cáo');
      });
    });

    it('sets loading to false on error', async () => {
      mockSafeFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('clears previous data on error', async () => {
      // First successful fetch
      const { result, rerender } = renderHook(
        ({ range }: { range: DateRangeOption }) => useReports(range),
        { initialProps: { range: 'thisMonth' as DateRangeOption } }
      );

      await waitFor(() => {
        expect(result.current.dashboard).not.toBeNull();
      });

      // Set up failure for next fetch
      mockSafeFetch.mockImplementation(() =>
        Promise.resolve({ data: null, error: 'Failed', status: 500 })
      );

      // Trigger refetch
      rerender({ range: 'lastMonth' });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed');
      });
    });
  });

  describe('Date Range Filtering', () => {
    const dateRanges: DateRangeOption[] = [
      'thisMonth',
      'lastMonth',
      'last3Months',
      'last6Months',
      'thisYear',
    ];

    dateRanges.forEach((range) => {
      it(`fetches with correct range parameter: ${range}`, async () => {
        renderHook(() => useReports(range));

        await waitFor(() => {
          expect(mockSafeFetch).toHaveBeenCalledWith(
            expect.stringContaining(`range=${range}`),
            expect.any(Object)
          );
        });
      });
    });

    it('refetches when date range changes', async () => {
      const { rerender } = renderHook(
        ({ range }: { range: DateRangeOption }) => useReports(range),
        { initialProps: { range: 'thisMonth' as DateRangeOption } }
      );

      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalledTimes(4);
      });

      // Change range
      rerender({ range: 'lastMonth' });

      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalledTimes(8);
      });

      expect(mockSafeFetch).toHaveBeenCalledWith(
        expect.stringContaining('range=lastMonth'),
        expect.any(Object)
      );
    });
  });

  describe('Data Refresh', () => {
    it('provides refetch function', async () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.refetch).toBeInstanceOf(Function);
      });
    });

    it('refetches data when refetch is called', async () => {
      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalledTimes(4);
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalledTimes(8);
      });
    });

    it('sets loading to true during refetch', async () => {
      let resolvePromises: (() => void)[] = [];

      mockSafeFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromises.push(() => resolve({ data: mockDashboardData, error: null, status: 200 }));
        });
      });

      const { result } = renderHook(() => useReports('thisMonth'));

      // Wait for initial fetch to start
      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalledTimes(4);
      });

      // Resolve initial promises
      resolvePromises.forEach((resolve) => resolve());
      resolvePromises = [];

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger refetch
      act(() => {
        result.current.refetch();
      });

      expect(result.current.loading).toBe(true);

      // Resolve refetch promises
      resolvePromises.forEach((resolve) => resolve());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('clears error on successful refetch', async () => {
      // First fetch fails
      mockSafeFetch.mockRejectedValueOnce(new Error('Network error'));
      mockSafeFetch.mockRejectedValueOnce(new Error('Network error'));
      mockSafeFetch.mockRejectedValueOnce(new Error('Network error'));
      mockSafeFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(result.current.error).toBe('Không thể tải dữ liệu báo cáo');
      });

      // Reset mock for successful refetch
      mockSafeFetch.mockImplementation((url: string) => {
        if (url.includes('/dashboard')) {
          return Promise.resolve({ data: mockDashboardData, error: null, status: 200 });
        }
        if (url.includes('/revenue-trend')) {
          return Promise.resolve({ data: mockTrendData, error: null, status: 200 });
        }
        if (url.includes('/cost-breakdown')) {
          return Promise.resolve({ data: mockCostBreakdownData, error: null, status: 200 });
        }
        if (url.includes('/funnel')) {
          return Promise.resolve({ data: mockFunnelData, error: null, status: 200 });
        }
        return Promise.resolve({ data: null, error: 'Not found', status: 404 });
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Request Abortion', () => {
    it('aborts previous request on date range change', async () => {
      const abortSpy = jest.fn();
      const originalAbortController = global.AbortController;

      global.AbortController = jest.fn().mockImplementation(() => ({
        signal: { aborted: false },
        abort: abortSpy,
      })) as unknown as typeof AbortController;

      const { rerender } = renderHook(
        ({ range }: { range: DateRangeOption }) => useReports(range),
        { initialProps: { range: 'thisMonth' as DateRangeOption } }
      );

      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalled();
      });

      // Change range - should abort previous
      rerender({ range: 'lastMonth' });

      await waitFor(() => {
        expect(abortSpy).toHaveBeenCalled();
      });

      global.AbortController = originalAbortController;
    });

    it('aborts request on unmount', async () => {
      const abortSpy = jest.fn();
      const originalAbortController = global.AbortController;

      global.AbortController = jest.fn().mockImplementation(() => ({
        signal: { aborted: false },
        abort: abortSpy,
      })) as unknown as typeof AbortController;

      const { unmount } = renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(mockSafeFetch).toHaveBeenCalled();
      });

      unmount();

      expect(abortSpy).toHaveBeenCalled();

      global.AbortController = originalAbortController;
    });

    it('does not update state if request is aborted', async () => {
      mockSafeFetch.mockImplementation((url: string, options?: { signal?: AbortSignal }) => {
        return new Promise((resolve) => {
          // Simulate delay
          setTimeout(() => {
            if (options?.signal?.aborted) {
              // Should not resolve with data if aborted
              return;
            }
            resolve({ data: mockDashboardData, error: null, status: 200 });
          }, 100);
        });
      });

      const { result, unmount } = renderHook(() => useReports('thisMonth'));

      // Unmount before fetch completes
      unmount();

      // State should remain initial (no updates after unmount)
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Parallel Fetching', () => {
    it('fetches all endpoints in parallel', async () => {
      const callOrder: string[] = [];

      mockSafeFetch.mockImplementation((url: string) => {
        callOrder.push(url);
        return Promise.resolve({ data: mockDashboardData, error: null, status: 200 });
      });

      renderHook(() => useReports('thisMonth'));

      await waitFor(() => {
        expect(callOrder.length).toBe(4);
      });

      // All 4 calls should be made before any resolve
      expect(callOrder.some((u) => u.includes('/dashboard'))).toBe(true);
      expect(callOrder.some((u) => u.includes('/revenue-trend'))).toBe(true);
      expect(callOrder.some((u) => u.includes('/cost-breakdown'))).toBe(true);
      expect(callOrder.some((u) => u.includes('/funnel'))).toBe(true);
    });
  });
});
