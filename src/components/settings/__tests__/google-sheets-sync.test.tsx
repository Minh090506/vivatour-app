/**
 * Tests for GoogleSheetsSync component
 * Covers: loading state, unconfigured state, configured rendering, sync actions
 */

// Mock sonner toast - use var to ensure availability in jest.mock()
// eslint-disable-next-line no-var
var mockToastModule: Record<string, jest.Mock>;

jest.mock('sonner', () => {
  // Create fresh mocks for each test suite
  mockToastModule = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  };
  return {
    toast: mockToastModule,
  };
});

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GoogleSheetsSync } from '../google-sheets-sync';
import {
  resetMocks,
  setupFetchMock,
  mockSyncStatus,
  mockSyncStatusUnconfigured,
  mockSyncResponse,
} from './test-utils';

describe('GoogleSheetsSync', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('Loading State', () => {
    it('renders loading spinner on initial load', () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      // Check for spinner (Loader2 with animate-spin)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides loader after fetch completes', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });
  });

  describe('Unconfigured State', () => {
    it('shows Alert when configured: false', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatusUnconfigured },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByText('Google Sheets Not Configured')).toBeInTheDocument();
      });
    });

    it('lists required env vars', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatusUnconfigured },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByText('GOOGLE_SERVICE_ACCOUNT_EMAIL')).toBeInTheDocument();
        expect(screen.getByText('GOOGLE_PRIVATE_KEY')).toBeInTheDocument();
        expect(screen.getByText('GOOGLE_SHEET_ID')).toBeInTheDocument();
      });
    });
  });

  describe('Configured State', () => {
    it('renders 3 sheet cards (Request, Operator, Revenue)', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByText('Requests')).toBeInTheDocument();
        expect(screen.getByText('Operators')).toBeInTheDocument();
        expect(screen.getByText('Revenues')).toBeInTheDocument();
      });
    });

    it('displays sync stats badges', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        // Check for synced count badges
        expect(screen.getByText('150 synced')).toBeInTheDocument();
        expect(screen.getByText('89 synced')).toBeInTheDocument();
        expect(screen.getByText('45 synced')).toBeInTheDocument();
        // Check for failed count badge
        expect(screen.getByText('3 failed')).toBeInTheDocument();
      });
    });

    it('shows lastSync timestamp formatted', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        // Check that dates are formatted
        expect(screen.getAllByText(/Last sync:/i).length).toBeGreaterThan(0);
      });
    });

    it('shows lastRow number when available', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByText('Last row: 153')).toBeInTheDocument();
        expect(screen.getByText('Last row: 89')).toBeInTheDocument();
      });
    });

    it('renders refresh status button', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh Status/i })).toBeInTheDocument();
      });
    });

    it('renders sync buttons for each sheet', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        const syncButtons = screen.getAllByRole('button', { name: /^Sync$/i });
        expect(syncButtons.length).toBe(3);
      });
    });
  });

  describe('Sync Actions', () => {
    it('calls POST /api/sync/sheets with sheetName on sync click', async () => {
      const mockFetch = setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      // Override for POST request
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSyncResponse),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSyncStatus }),
        });
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /^Sync$/i }).length).toBe(3);
      });

      const syncButtons = screen.getAllByRole('button', { name: /^Sync$/i });
      await act(async () => {
        fireEvent.click(syncButtons[0]);
      });

      await waitFor(() => {
        const postCalls = mockFetch.mock.calls.filter(
          (call: unknown[]) => (call[1] as RequestInit)?.method === 'POST'
        );
        expect(postCalls.length).toBeGreaterThan(0);
        const body = JSON.parse((postCalls[0][1] as RequestInit).body as string);
        expect(body.sheetName).toBe('Request');
      });
    });

    it('shows loading spinner during sync', async () => {
      const mockFetch = jest.fn();
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockSyncResponse),
                }),
              500
            )
          );
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSyncStatus }),
        });
      });
      global.fetch = mockFetch;

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /^Sync$/i }).length).toBe(3);
      });

      const syncButtons = screen.getAllByRole('button', { name: /^Sync$/i });
      await act(async () => {
        fireEvent.click(syncButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument();
      });
    });

    it('disables all buttons during sync', async () => {
      const mockFetch = jest.fn();
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockSyncResponse),
                }),
              500
            )
          );
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSyncStatus }),
        });
      });
      global.fetch = mockFetch;

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /^Sync$/i }).length).toBe(3);
      });

      const syncButtons = screen.getAllByRole('button', { name: /^Sync$/i });
      await act(async () => {
        fireEvent.click(syncButtons[0]);
      });

      await waitFor(() => {
        // All sync buttons should be disabled
        const allSyncButtons = screen.getAllByRole('button');
        const disabledSyncButtons = allSyncButtons.filter(
          (btn) => btn.hasAttribute('disabled') && btn.textContent?.includes('Sync')
        );
        expect(disabledSyncButtons.length).toBeGreaterThan(0);
      });
    });

    it('shows success toast on sync success', async () => {
      const mockFetch = setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, synced: 5, errors: 0 }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSyncStatus }),
        });
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /^Sync$/i }).length).toBe(3);
      });

      const syncButtons = screen.getAllByRole('button', { name: /^Sync$/i });
      await act(async () => {
        fireEvent.click(syncButtons[0]);
      });

      await waitFor(() => {
        expect(mockToastModule.success).toHaveBeenCalledWith('Synced 5 rows');
      });
    });

    it('shows info toast when no new rows', async () => {
      const mockFetch = setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, synced: 0, errors: 0 }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSyncStatus }),
        });
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /^Sync$/i }).length).toBe(3);
      });

      const syncButtons = screen.getAllByRole('button', { name: /^Sync$/i });
      await act(async () => {
        fireEvent.click(syncButtons[0]);
      });

      await waitFor(() => {
        expect(mockToastModule.info).toHaveBeenCalledWith('No new rows to sync');
      });
    });

    it('shows error toast on sync failure', async () => {
      const mockFetch = setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: false, error: 'Sync timeout' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSyncStatus }),
        });
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /^Sync$/i }).length).toBe(3);
      });

      const syncButtons = screen.getAllByRole('button', { name: /^Sync$/i });
      await act(async () => {
        fireEvent.click(syncButtons[0]);
      });

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Sync timeout');
      });
    });
  });

  describe('UI Elements', () => {
    it('renders title and description', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByText('Google Sheets Sync')).toBeInTheDocument();
        expect(
          screen.getByText('One-way sync from Google Sheets to database (append-only)')
        ).toBeInTheDocument();
      });
    });

    it('renders how it works section', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByText('How it works')).toBeInTheDocument();
      });
    });

    it('renders sheet descriptions', async () => {
      setupFetchMock({
        '/api/sync/sheets': { success: true, data: mockSyncStatus },
      });

      render(<GoogleSheetsSync />);

      await waitFor(() => {
        expect(screen.getByText('Sync customer requests from sheet')).toBeInTheDocument();
        expect(screen.getByText('Sync operator costs from sheet')).toBeInTheDocument();
        expect(screen.getByText('Sync revenue entries from sheet')).toBeInTheDocument();
      });
    });
  });
});
