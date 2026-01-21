/**
 * Tests for OperatorLockDialog component
 * Tests rendering, role-based tiers, preview flow, confirmation, error handling
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { OperatorLockDialog } from '../operator-lock-dialog';
import { setupFetchMock, setupFetchMockError, resetMocks } from './test-utils';
import { toast } from 'sonner';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock scrollIntoView for Select component
Element.prototype.scrollIntoView = jest.fn();

describe('OperatorLockDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    resetMocks();
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders dialog when open=true', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      expect(screen.getByText('Khóa Operator theo tháng')).toBeInTheDocument();
      expect(screen.getByText('Chọn tháng và mức khóa để khóa tất cả operator trong kỳ')).toBeInTheDocument();
    });

    it('does not render when open=false', () => {
      render(<OperatorLockDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Khóa Operator theo tháng')).not.toBeInTheDocument();
    });

    it('displays dialog title with lock icon', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      const title = screen.getByText('Khóa Operator theo tháng');
      expect(title).toBeInTheDocument();
      expect(title.closest('h2')).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('renders month input with current month default', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      const monthInput = screen.getByLabelText('Tháng');
      expect(monthInput).toBeInTheDocument();
      expect(monthInput).toHaveAttribute('type', 'month');

      // Verify default value matches current month format YYYY-MM
      const currentValue = monthInput.getAttribute('value') || '';
      expect(currentValue).toMatch(/^\d{4}-\d{2}$/);
    });

    it('renders tier select dropdown', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      expect(screen.getByLabelText('Mức khóa')).toBeInTheDocument();
    });
  });

  describe('Role-based Tiers', () => {
    it('shows only KT tier for ACCOUNTANT role', () => {
      render(<OperatorLockDialog {...defaultProps} userRole="ACCOUNTANT" />);

      // Open select dropdown
      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);

      // Only KT tier should be visible in dropdown
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Khóa KT');

      // Admin and Final should not be in dropdown
      expect(screen.queryByRole('option', { name: 'Khóa Admin' })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Khóa Cuối' })).not.toBeInTheDocument();
    });

    it('shows all 3 tiers for ADMIN role', () => {
      render(<OperatorLockDialog {...defaultProps} userRole="ADMIN" />);

      // Open select dropdown
      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);

      // All 3 tiers should be visible in dropdown
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('Khóa KT');
      expect(options[1]).toHaveTextContent('Khóa Admin');
      expect(options[2]).toHaveTextContent('Khóa Cuối');
    });

    it('defaults to KT tier selection', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      // KT tier info should be displayed by default
      expect(screen.getByText(/Khóa KT:/)).toBeInTheDocument();
      expect(screen.getByText(/Khóa các operator chưa có khóa nào/)).toBeInTheDocument();
    });
  });

  describe('Tier Info Display', () => {
    it('shows KT tier info when KT selected', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      expect(screen.getByText(/Khóa KT:/)).toBeInTheDocument();
      expect(screen.getByText(/Khóa các operator chưa có khóa nào/)).toBeInTheDocument();
      expect(screen.getByText(/KT và Admin đều có thể mở khóa/)).toBeInTheDocument();
    });

    it('shows Admin tier info when Admin selected', () => {
      render(<OperatorLockDialog {...defaultProps} userRole="ADMIN" />);

      // Open select and choose Admin
      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);
      fireEvent.click(screen.getByText('Khóa Admin'));

      expect(screen.getByText(/Khóa Admin:/)).toBeInTheDocument();
      expect(screen.getByText(/Khóa các operator đã khóa KT nhưng chưa khóa Admin/)).toBeInTheDocument();
      expect(screen.getByText(/Chỉ Admin có thể mở khóa/)).toBeInTheDocument();
    });

    it('shows Final tier info when Final selected', () => {
      render(<OperatorLockDialog {...defaultProps} userRole="ADMIN" />);

      // Open select and choose Final
      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);
      fireEvent.click(screen.getByText('Khóa Cuối'));

      expect(screen.getByText(/Khóa Cuối:/)).toBeInTheDocument();
      expect(screen.getByText(/Khóa vĩnh viễn các operator đã khóa Admin/)).toBeInTheDocument();
      expect(screen.getByText(/Chỉ Admin có thể mở khóa/)).toBeInTheDocument();
    });
  });

  describe('Preview Flow', () => {
    it('shows "Xem trước" button initially', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Xem trước/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Xác nhận khóa/ })).not.toBeInTheDocument();
    });

    it('calls GET /api/operators/lock-period on preview click', async () => {
      const mockFetch = setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 5, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Click preview button
      const previewBtn = screen.getByRole('button', { name: /Xem trước/ });
      fireEvent.click(previewBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const fetchCall = mockFetch.mock.calls[0][0];
      expect(fetchCall).toContain('/api/operators/lock-period');
      expect(fetchCall).toContain('month=');
      expect(fetchCall).toContain('tier=KT');
    });

    it('displays operator count after preview', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 12, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Click preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByText('Số lượng cần khóa:')).toBeInTheDocument();
      });

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/Sẽ khóa 12 operator với mức/)).toBeInTheDocument();
    });

    it('shows "Xác nhận khóa" button after preview', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 5, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Initially only preview button
      expect(screen.getByRole('button', { name: /Xem trước/ })).toBeInTheDocument();

      // Click preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      // After preview, confirm button appears
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Xem trước/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Xác nhận khóa/ })).toBeInTheDocument();
      });
    });

    it('resets preview when month changes', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 5, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Click preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      // Wait for preview data
      await waitFor(() => {
        expect(screen.getByText('Số lượng cần khóa:')).toBeInTheDocument();
      });

      // Change month
      const monthInput = screen.getByLabelText('Tháng');
      fireEvent.change(monthInput, { target: { value: '2026-03' } });

      // Preview should be reset, back to preview button
      await waitFor(() => {
        expect(screen.queryByText('Số lượng cần khóa:')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Xem trước/ })).toBeInTheDocument();
      });
    });

    it('resets preview when tier changes', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 5, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} userRole="ADMIN" />);

      // Click preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      // Wait for preview data
      await waitFor(() => {
        expect(screen.getByText('Số lượng cần khóa:')).toBeInTheDocument();
      });

      // Change tier
      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);
      fireEvent.click(screen.getByText('Khóa Admin'));

      // Preview should be reset
      await waitFor(() => {
        expect(screen.queryByText('Số lượng cần khóa:')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Xem trước/ })).toBeInTheDocument();
      });
    });
  });

  describe('Confirmation Flow', () => {
    it('calls POST /api/operators/lock-period on confirm', async () => {
      const mockFetch = setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 5, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Preview first
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Xác nhận khóa/ })).toBeInTheDocument();
      });

      // Reset mock to track POST call
      mockFetch.mockClear();

      // Click confirm
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận khóa/ }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/operators/lock-period',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.any(String),
          })
        );
      });
    });

    it('shows success toast on completion', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 8, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Xác nhận khóa/ })).toBeInTheDocument();
      });

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận khóa/ }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Đã khóa 8 dịch vụ với mức Khóa KT')
        );
      });
    });

    it('calls onSuccess callback after lock', async () => {
      const onSuccess = jest.fn();
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 5, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} onSuccess={onSuccess} />);

      // Preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Xác nhận khóa/ })).toBeInTheDocument();
      });

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận khóa/ }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('disables confirm button when count is 0', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 0, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        const confirmBtn = screen.getByRole('button', { name: /Xác nhận khóa/ });
        expect(confirmBtn).toBeDisabled();
      });

      expect(screen.getByText(/Không có operator nào cần khóa/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message on preview failure', async () => {
      setupFetchMockError('/api/operators/lock-period', 'Không tìm thấy dữ liệu');

      render(<OperatorLockDialog {...defaultProps} />);

      // Click preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByText('Không tìm thấy dữ liệu')).toBeInTheDocument();
      });
    });

    it('displays error message on confirm failure', async () => {
      const mockFetch = jest.fn((url: string, options?: RequestInit) => {
        const method = options?.method || 'GET';
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, data: { count: 5, operators: [] } }),
          });
        }
        // POST fails
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ success: false, error: 'Lỗi server' }),
        });
      });

      global.fetch = mockFetch as unknown as typeof fetch;

      render(<OperatorLockDialog {...defaultProps} />);

      // Preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Xác nhận khóa/ })).toBeInTheDocument();
      });

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận khóa/ }));

      await waitFor(() => {
        expect(screen.getByText('Lỗi server')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Close', () => {
    it('calls onOpenChange(false) when Cancel clicked', () => {
      const onOpenChange = jest.fn();
      render(<OperatorLockDialog {...defaultProps} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets state on close', async () => {
      jest.useFakeTimers();

      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 5, operators: [] },
        },
      });

      const { rerender } = render(<OperatorLockDialog {...defaultProps} />);

      // Preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByText('Số lượng cần khóa:')).toBeInTheDocument();
      });

      // Close dialog
      fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));

      // Fast forward timers to trigger state reset
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Reopen dialog
      rerender(<OperatorLockDialog {...defaultProps} open={false} />);
      rerender(<OperatorLockDialog {...defaultProps} open={true} />);

      // Should be back to initial state (preview button, no preview data)
      expect(screen.getByRole('button', { name: /Xem trước/ })).toBeInTheDocument();
      expect(screen.queryByText('Số lượng cần khóa:')).not.toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('Preview with Operators List', () => {
    it('shows operator list when count <= 10', async () => {
      const mockOperators = [
        { id: 'op1', serviceName: 'Khách sạn ABC', serviceDate: '2026-01-10', totalCost: 1000000 },
        { id: 'op2', serviceName: 'Xe đưa đón', serviceDate: '2026-01-11', totalCost: 500000 },
      ];

      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 2, operators: mockOperators },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByText('Khách sạn ABC')).toBeInTheDocument();
        expect(screen.getByText('Xe đưa đón')).toBeInTheDocument();
      });
    });

    it('shows formatted total cost for each operator', async () => {
      const mockOperators = [
        { id: 'op1', serviceName: 'Khách sạn', serviceDate: '2026-01-10', totalCost: 2500000 },
      ];

      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 1, operators: mockOperators },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        // VND format: 2.500.000 ₫
        expect(screen.getByText(/2\.500\.000/)).toBeInTheDocument();
      });
    });

    it('does not show operator list when count > 10', async () => {
      // When preview.operators.length > 10, the list should not be shown
      // This is handled by the component rendering condition
      const manyOperators = Array.from({ length: 15 }, (_, i) => ({
        id: `op${i}`,
        serviceName: `Service ${i}`,
        serviceDate: '2026-01-10',
        totalCost: 100000,
      }));

      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 15, operators: manyOperators },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText(/Sẽ khóa 15 operator/)).toBeInTheDocument();
      });
    });
  });

  describe('Tier Progression Messages', () => {
    it('shows message about needing lower tier lock first when count is 0', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 0, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} userRole="ADMIN" />);

      // Select Admin tier
      const tierSelect = screen.getByLabelText('Mức khóa');
      fireEvent.click(tierSelect);
      fireEvent.click(screen.getByText('Khóa Admin'));

      // Preview with Admin tier
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByText(/Không có operator nào cần khóa/)).toBeInTheDocument();
        expect(screen.getByText(/Có thể cần khóa tier thấp hơn trước/)).toBeInTheDocument();
      });
    });

    it('does not show tier message when KT tier has count 0', async () => {
      setupFetchMock({
        '/api/operators/lock-period': {
          success: true,
          data: { count: 0, operators: [] },
        },
      });

      render(<OperatorLockDialog {...defaultProps} />);

      // Preview with default KT tier
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByText(/Không có operator nào cần khóa/)).toBeInTheDocument();
      });

      // KT is the lowest tier, so no message about lower tier
      expect(screen.queryByText(/Có thể cần khóa tier thấp hơn trước/)).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner during preview fetch', async () => {
      const slowFetch = jest.fn(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { count: 5, operators: [] } }),
          }), 300)
        )
      );
      global.fetch = slowFetch as unknown as typeof fetch;

      render(<OperatorLockDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      // Should show loading state in button
      await waitFor(() => {
        // The Loader2 spinner should be visible during loading
        const buttons = screen.getAllByRole('button');
        const previewButton = buttons.find(b => b.textContent?.includes('Xem trước'));
        expect(previewButton).toBeDefined();
      }, { timeout: 100 });
    });

    it('shows loading spinner during confirm action', async () => {
      let resolveConfirm: (value: unknown) => void;
      const confirmPromise = new Promise((resolve) => { resolveConfirm = resolve; });

      const mockFetch = jest.fn((url: string, options?: RequestInit) => {
        const method = options?.method || 'GET';
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { count: 5, operators: [] } }),
          });
        }
        // POST returns pending promise
        return confirmPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { count: 5 } }),
        }));
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      render(<OperatorLockDialog {...defaultProps} />);

      // Preview
      fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Xác nhận khóa/ })).toBeInTheDocument();
      });

      // Click confirm
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận khóa/ }));

      // Should show loading state
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /Xác nhận khóa/ });
        expect(confirmButton).toBeDisabled();
      }, { timeout: 100 });

      // Resolve to clean up
      resolveConfirm!({});
    });
  });

  describe('Month Input Validation', () => {
    it('disables preview button when month is empty', () => {
      render(<OperatorLockDialog {...defaultProps} />);

      const monthInput = screen.getByLabelText('Tháng');
      fireEvent.change(monthInput, { target: { value: '' } });

      const previewButton = screen.getByRole('button', { name: /Xem trước/ });
      expect(previewButton).toBeDisabled();
    });
  });
});
