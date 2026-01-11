/**
 * Tests for RevenueHistoryPanel component
 * Tests loading, empty state, entry rendering, formatting
 */

import { render, screen, waitFor } from '@testing-library/react';
import { RevenueHistoryPanel } from '../revenue-history-panel';
import { mockHistoryEntries, resetMocks } from './test-utils';

// Mock lock config
jest.mock('@/config/lock-config', () => ({
  HISTORY_ACTION_LABELS: {
    CREATE: 'Tao moi',
    UPDATE: 'Cap nhat',
    DELETE: 'Xoa',
    LOCK_KT: 'Khoa KT',
    UNLOCK_KT: 'Mo khoa KT',
    LOCK_ADMIN: 'Khoa Admin',
    UNLOCK_ADMIN: 'Mo khoa Admin',
    LOCK_FINAL: 'Khoa Cuoi',
    UNLOCK_FINAL: 'Mo khoa Cuoi',
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 gio truoc'),
}));

jest.mock('date-fns/locale', () => ({
  vi: {},
}));

describe('RevenueHistoryPanel', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading initially', () => {
      global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

      render(<RevenueHistoryPanel revenueId="rev1" />);

      // Should not show entries yet (loading)
      expect(screen.queryByText('Tao moi')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no history', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        })
      ) as unknown as typeof fetch;

      render(<RevenueHistoryPanel revenueId="rev1" />);

      await waitFor(() => {
        expect(screen.getByText('Chưa có lịch sử')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('displays error message on failure', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      ) as unknown as typeof fetch;

      render(<RevenueHistoryPanel revenueId="rev1" />);

      await waitFor(() => {
        expect(screen.getByText(/Loi|Failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Entry Rendering', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockHistoryEntries }),
        })
      ) as unknown as typeof fetch;
    });

    it('renders history entries', async () => {
      render(<RevenueHistoryPanel revenueId="rev1" />);

      await waitFor(() => {
        expect(screen.getByText('Khoa KT')).toBeInTheDocument();
        expect(screen.getByText('Cap nhat')).toBeInTheDocument();
        expect(screen.getByText('Tao moi')).toBeInTheDocument();
      });
    });

    it('displays user name', async () => {
      render(<RevenueHistoryPanel revenueId="rev1" />);

      await waitFor(() => {
        expect(screen.getAllByText(/Admin User|Accountant User/).length).toBeGreaterThan(0);
      });
    });

    it('displays relative time', async () => {
      render(<RevenueHistoryPanel revenueId="rev1" />);

      await waitFor(() => {
        expect(screen.getAllByText(/truoc/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('API Call', () => {
    it('calls correct endpoint', async () => {
      const mockFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        })
      ) as unknown as typeof fetch;

      global.fetch = mockFetch;

      render(<RevenueHistoryPanel revenueId="test-123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/revenues/test-123/history');
      });
    });
  });
});
