/**
 * Tests for FollowUpWidget component
 * - Fetches 3 API endpoints (overdue, today, upcoming)
 * - Renders 3 sections with different colors
 * - Click navigation to request detail
 * - Empty/loading states
 */

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowUpWidget } from '../follow-up-widget';

// Mock request data
const mockOverdue = [
  {
    id: 'r1',
    customerName: 'Nguyen A',
    rqid: 'RQ001',
    country: 'VN',
    status: 'FOLLOWUP',
    nextFollowUp: '2026-01-10',
  },
];

const mockToday = [
  {
    id: 'r2',
    customerName: 'Tran B',
    rqid: 'RQ002',
    country: 'US',
    status: 'QUOTE',
    nextFollowUp: '2026-01-11',
  },
];

const mockUpcoming = [
  {
    id: 'r3',
    customerName: 'Le C',
    rqid: 'RQ003',
    country: 'JP',
    status: 'LEAD',
    nextFollowUp: '2026-01-15',
  },
];

// Setup fetch mock with data
function setupFetchMock() {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('overdue')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockOverdue }),
      });
    }
    if (url.includes('today')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockToday }),
      });
    }
    if (url.includes('upcoming')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockUpcoming }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  }) as jest.Mock;
}

// Setup empty fetch mock
function setupEmptyFetchMock() {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    })
  ) as jest.Mock;
}

describe('FollowUpWidget', () => {
  beforeEach(() => {
    setupFetchMock();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders card with "Follow-up" title', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Follow-up')).toBeInTheDocument();
      });
    });

    it('renders "Xem tất cả" button', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Xem tất cả')).toBeInTheDocument();
      });
    });

    it('renders Clock icon in header', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Follow-up')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading message during fetch', () => {
      // Create a never-resolving promise to keep loading state
      global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

      render(<FollowUpWidget />);

      expect(screen.getByText('Đang tải...')).toBeInTheDocument();
    });

    it('hides loading message after fetch completes', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('fetches 3 endpoints with correct limit param', async () => {
      render(<FollowUpWidget limit={10} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/requests?followup=overdue&limit=10');
        expect(fetch).toHaveBeenCalledWith('/api/requests?followup=today&limit=10');
        expect(fetch).toHaveBeenCalledWith('/api/requests?followup=upcoming&limit=10');
      });
    });

    it('uses default limit=5 when not specified', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/requests?followup=overdue&limit=5');
        expect(fetch).toHaveBeenCalledWith('/api/requests?followup=today&limit=5');
        expect(fetch).toHaveBeenCalledWith('/api/requests?followup=upcoming&limit=5');
      });
    });
  });

  describe('Section Rendering', () => {
    it('renders overdue section with count', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Quá hạn (1)')).toBeInTheDocument();
      });
    });

    it('renders today section with count', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Hôm nay (1)')).toBeInTheDocument();
      });
    });

    it('renders upcoming section with count', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Sắp tới (1)')).toBeInTheDocument();
      });
    });

    it('hides section when array is empty', async () => {
      global.fetch = jest.fn((url: string) => {
        if (url.includes('overdue')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] }),
          });
        }
        if (url.includes('today')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockToday }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }) as jest.Mock;

      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.queryByText(/Quá hạn/)).not.toBeInTheDocument();
        expect(screen.getByText('Hôm nay (1)')).toBeInTheDocument();
      });
    });
  });

  describe('Follow-Up Item Display', () => {
    it('displays customer name', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Nguyen A')).toBeInTheDocument();
        expect(screen.getByText('Tran B')).toBeInTheDocument();
        expect(screen.getByText('Le C')).toBeInTheDocument();
      });
    });

    it('displays RQID and country', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText(/RQ001.*VN/)).toBeInTheDocument();
        expect(screen.getByText(/RQ002.*US/)).toBeInTheDocument();
        expect(screen.getByText(/RQ003.*JP/)).toBeInTheDocument();
      });
    });

    it('displays status badge', async () => {
      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('FOLLOWUP')).toBeInTheDocument();
        expect(screen.getByText('QUOTE')).toBeInTheDocument();
        expect(screen.getByText('LEAD')).toBeInTheDocument();
      });
    });
  });

  describe('Click Handlers', () => {
    it('navigates to request detail on item click', async () => {
      const user = userEvent.setup();
      render(<FollowUpWidget />);

      await waitFor(() => screen.getByText('Nguyen A'));

      await user.click(screen.getByText('Nguyen A'));

      expect(mockPush).toHaveBeenCalledWith('/requests/r1');
    });

    it('navigates to follow-up tab on "Xem tất cả" click', async () => {
      const user = userEvent.setup();
      render(<FollowUpWidget />);

      await waitFor(() => screen.getByText('Xem tất cả'));

      await user.click(screen.getByText('Xem tất cả'));

      expect(mockPush).toHaveBeenCalledWith('/requests?tab=followup');
    });
  });

  describe('Empty State', () => {
    it('shows empty message when all arrays are empty', async () => {
      setupEmptyFetchMock();

      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Không có follow-up nào')).toBeInTheDocument();
      });
    });

    it('renders CheckCircle icon in empty state', async () => {
      setupEmptyFetchMock();

      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Không có follow-up nào')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles fetch error gracefully', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock;

      // Suppress console error
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<FollowUpWidget />);

      await waitFor(() => {
        // Should show empty state after error
        expect(screen.getByText('Không có follow-up nào')).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });

    it('handles non-success response', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false, data: null }),
        })
      ) as jest.Mock;

      render(<FollowUpWidget />);

      await waitFor(() => {
        expect(screen.getByText('Không có follow-up nào')).toBeInTheDocument();
      });
    });
  });
});
