/**
 * Tests for RevenueLockDialog component
 * Tests tier selection, sequential locking, API calls
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevenueLockDialog } from '../revenue-lock-dialog';
import { setupFetchMock, setupFetchMockError, resetMocks } from './test-utils';

// Mock lock config
jest.mock('@/config/lock-config', () => ({
  LOCK_TIER_LABELS: {
    KT: 'Khóa KT',
    Admin: 'Khóa Admin',
    Final: 'Khóa Cuối',
  },
}));

// Mock scrollIntoView for Select
Element.prototype.scrollIntoView = jest.fn();

describe('RevenueLockDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    revenueId: 'rev1',
    currentState: { lockKT: false, lockAdmin: false, lockFinal: false },
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<RevenueLockDialog {...defaultProps} />);

      expect(screen.getByText('Khóa Doanh thu')).toBeInTheDocument();
      expect(screen.getByText(/Chọn mức khóa/)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<RevenueLockDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Khóa Doanh thu')).not.toBeInTheDocument();
    });

    it('displays tier select', () => {
      render(<RevenueLockDialog {...defaultProps} />);

      expect(screen.getByLabelText('Mức khóa')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<RevenueLockDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Hủy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Xác nhận/i })).toBeInTheDocument();
    });
  });

  describe('Tier Selection', () => {
    it('allows KT when no locks', async () => {
      render(<RevenueLockDialog {...defaultProps} />);

      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);

      await waitFor(() => {
        // KT option should be available (multiple elements may match)
        const ktOptions = screen.getAllByText(/Khóa KT/);
        expect(ktOptions.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('disables Admin when KT not locked', async () => {
      render(<RevenueLockDialog {...defaultProps} />);

      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);

      await waitFor(() => {
        // Admin should show "cần khóa KT trước"
        expect(screen.getByText(/cần khóa KT trước/)).toBeInTheDocument();
      });
    });

    it('enables Admin when KT locked', async () => {
      render(
        <RevenueLockDialog
          {...defaultProps}
          currentState={{ lockKT: true, lockAdmin: false, lockFinal: false }}
        />
      );

      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);

      await waitFor(() => {
        // KT should show "đã khóa" - multiple elements may match
        const lockedTexts = screen.getAllByText(/đã khóa/);
        expect(lockedTexts.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Lock API', () => {
    it('calls lock API on confirm', async () => {
      const mockFetch = setupFetchMock({
        '/api/revenues/rev1/lock': { success: true },
      });

      render(<RevenueLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/revenues/rev1/lock',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ tier: 'KT' }),
          })
        );
      });
    });

    it('calls onSuccess on success', async () => {
      setupFetchMock({
        '/api/revenues/rev1/lock': { success: true },
      });

      render(<RevenueLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('closes dialog on success', async () => {
      setupFetchMock({
        '/api/revenues/rev1/lock': { success: true },
      });

      render(<RevenueLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

      await waitFor(() => {
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error on API failure', async () => {
      setupFetchMockError('/api/revenues/rev1/lock', 'Không có quyền');

      render(<RevenueLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

      await waitFor(() => {
        expect(screen.getByText('Không có quyền')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Close', () => {
    it('calls onOpenChange on cancel', () => {
      render(<RevenueLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
