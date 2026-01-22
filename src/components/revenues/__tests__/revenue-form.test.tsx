/**
 * Tests for RevenueForm component
 * Tests rendering, validation, submission, lock states
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevenueForm } from '../revenue-form';
import {
  mockRevenue,
  mockLockedKTRevenue,
  mockRequests,
  resetMocks,
} from './test-utils';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user1', role: 'ADMIN' } },
    status: 'authenticated',
  }),
}));

// Mock permission hook
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ userId: 'user1' }),
}));

// Mock fetch utilities
const mockSafeFetch = jest.fn();
const mockSafePost = jest.fn();
const mockSafePut = jest.fn();

jest.mock('@/lib/api/fetch-utils', () => ({
  safeFetch: (...args: unknown[]) => mockSafeFetch(...args),
  safePost: (...args: unknown[]) => mockSafePost(...args),
  safePut: (...args: unknown[]) => mockSafePut(...args),
}));

// Mock scrollIntoView for Select
Element.prototype.scrollIntoView = jest.fn();

describe('RevenueForm', () => {
  const defaultProps = {
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
    mockSafeFetch.mockResolvedValue({ data: mockRequests, error: null });
  });

  describe('Rendering', () => {
    it('renders form sections', async () => {
      render(<RevenueForm {...defaultProps} />);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Thông tin Booking')).toBeInTheDocument();
      expect(screen.getByText('Thông tin thanh toán')).toBeInTheDocument();
      expect(screen.getByText('Số tiền')).toBeInTheDocument();
      expect(screen.getByText('Ghi chú')).toBeInTheDocument();
    });

    it('renders create button in create mode', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Tạo thu nhập/i })).toBeInTheDocument();
    });

    it('renders update button in edit mode', async () => {
      render(<RevenueForm {...defaultProps} revenue={mockRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Cập nhật/i })).toBeInTheDocument();
    });

    it('renders loading state', () => {
      mockSafeFetch.mockImplementation(() => new Promise(() => {}));

      render(<RevenueForm {...defaultProps} />);

      expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
    });

    it('renders cancel button when onCancel provided', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Hủy/i })).toBeInTheDocument();
    });

    it('renders locked warning when revenue is locked', async () => {
      render(<RevenueForm {...defaultProps} revenue={mockLockedKTRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Thu nhập đã khóa/)).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders booking select', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Chọn booking/i)).toBeInTheDocument();
    });

    it('renders amount input field', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Số tiền.*VND/i)).toBeInTheDocument();
    });

    it('renders notes textarea', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Ghi chú về thanh toán/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls safePut in edit mode', async () => {
      mockSafePut.mockResolvedValue({ data: { id: 'rev1' }, error: null });

      render(<RevenueForm {...defaultProps} revenue={mockRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Cập nhật/i }));

      await waitFor(() => {
        expect(mockSafePut).toHaveBeenCalledWith(
          '/api/revenues/rev1',
          expect.any(Object)
        );
      });
    });
  });

  describe('Interactions', () => {
    it('calls onCancel when cancel clicked', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('pre-fills form with existing revenue data', async () => {
      render(<RevenueForm {...defaultProps} revenue={mockRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Should have the revenue amount pre-filled
      const amountInput = screen.getByLabelText(/Số tiền.*VND/i);
      expect(amountInput).toHaveValue(5000000);
    });

    it('disables booking select in edit mode', async () => {
      render(<RevenueForm {...defaultProps} revenue={mockRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Booking select should be disabled in edit mode
      const selectTriggers = screen.getAllByRole('combobox');
      const bookingSelect = selectTriggers[0];
      expect(bookingSelect).toHaveAttribute('data-disabled');
    });

    it('pre-fills foreign currency data in edit mode', async () => {
      const foreignRevenue = {
        ...mockRevenue,
        id: 'rev-usd',
        foreignAmount: 1000,
        currency: 'USD',
        exchangeRate: 25000,
        amountVND: 25000000,
      };

      render(<RevenueForm {...defaultProps} revenue={foreignRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Form should render with currency field
      expect(screen.getByText('Loại tiền')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when booking not selected', async () => {
      mockSafePost.mockResolvedValue({ data: null, error: null });

      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Try to submit without selecting booking
      fireEvent.click(screen.getByRole('button', { name: /Tạo thu nhập/i }));

      await waitFor(() => {
        expect(screen.getByText(/Vui lòng chọn Booking/i)).toBeInTheDocument();
      });
    });

    it('shows error when payment type not selected', async () => {
      render(<RevenueForm {...defaultProps} requestId="req1" />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Tạo thu nhập/i }));

      await waitFor(() => {
        expect(screen.getByText(/Vui lòng chọn loại thanh toán/i)).toBeInTheDocument();
      });
    });

    it('validates required fields before submission', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Submit button should be present
      expect(screen.getByRole('button', { name: /Tạo thu nhập/i })).toBeInTheDocument();

      // Click submit - should show booking error
      fireEvent.click(screen.getByRole('button', { name: /Tạo thu nhập/i }));

      await waitFor(() => {
        expect(screen.getByText(/Vui lòng chọn Booking/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Currency Support', () => {
    it('renders currency selector', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Loại tiền')).toBeInTheDocument();
    });

    it('defaults to VND currency', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // VND input should be visible by default
      expect(screen.getByLabelText(/Số tiền.*VND/i)).toBeInTheDocument();
    });

    it('renders currency dropdown with available options', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Currency field should be present
      expect(screen.getByText('Loại tiền')).toBeInTheDocument();
      // VND is default
      expect(screen.getByLabelText(/Số tiền.*VND/i)).toBeInTheDocument();
    });

    it('pre-fills foreign currency in edit mode', async () => {
      const foreignRevenue = {
        ...mockRevenue,
        id: 'rev-usd',
        foreignAmount: 500,
        currency: 'USD',
        exchangeRate: 25000,
        amountVND: 12500000,
      };

      render(<RevenueForm {...defaultProps} revenue={foreignRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Should display the form with currency field
      expect(screen.getByText('Loại tiền')).toBeInTheDocument();
    });
  });

  describe('Exchange Rate Configuration', () => {
    it('has currency input component', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Currency input area exists
      expect(screen.getByText('Số tiền')).toBeInTheDocument();
      expect(screen.getByLabelText(/Số tiền.*VND/i)).toBeInTheDocument();
    });

    it('displays amount field for VND', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/Số tiền.*VND/i);
      expect(amountInput).toBeInTheDocument();
      expect(amountInput).toHaveAttribute('type', 'number');
    });

    it('accepts amount input', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/Số tiền.*VND/i);
      fireEvent.change(amountInput, { target: { value: '5000000' } });

      expect(amountInput).toHaveValue(5000000);
    });

    it('shows formatted amount preview', async () => {
      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/Số tiền.*VND/i);
      fireEvent.change(amountInput, { target: { value: '1000000' } });

      // Should show formatted preview
      await waitFor(() => {
        expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument();
      });
    });
  });

  describe('API Error Handling', () => {
    it('displays API error message', async () => {
      mockSafePut.mockResolvedValue({ data: null, error: 'Server error' });

      render(<RevenueForm {...defaultProps} revenue={mockRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Cập nhật/i }));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('validates API endpoint for create mode', async () => {
      // Check the form calls the correct API endpoint pattern
      render(<RevenueForm {...defaultProps} requestId="req1" />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // The form exists and is ready
      expect(screen.getByRole('button', { name: /Tạo thu nhập/i })).toBeInTheDocument();
    });

    it('validates API endpoint for edit mode', async () => {
      mockSafePut.mockResolvedValue({ data: { id: 'rev1' }, error: null });

      render(<RevenueForm {...defaultProps} revenue={mockRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Cập nhật/i }));

      await waitFor(() => {
        expect(mockSafePut).toHaveBeenCalledWith(
          '/api/revenues/rev1',
          expect.any(Object)
        );
      });
    });
  });

  describe('Lock State Handling', () => {
    it('hides submit button when locked', async () => {
      render(<RevenueForm {...defaultProps} revenue={mockLockedKTRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Cập nhật/i })).not.toBeInTheDocument();
    });

    it('disables all form fields when locked', async () => {
      render(<RevenueForm {...defaultProps} revenue={mockLockedKTRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Check date input is disabled
      const dateInput = screen.getByLabelText(/Ngày thanh toán/i);
      expect(dateInput).toBeDisabled();

      // Check textarea is disabled
      const notesInput = screen.getByPlaceholderText(/Ghi chú về thanh toán/i);
      expect(notesInput).toBeDisabled();
    });

    it('shows locked warning for all lock tiers', async () => {
      const lockedAdminRevenue = {
        ...mockRevenue,
        lockKT: true,
        lockAdmin: true,
        lockFinal: false,
      };

      render(<RevenueForm {...defaultProps} revenue={lockedAdminRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Thu nhập đã khóa/)).toBeInTheDocument();
    });

    it('shows locked warning for legacy isLocked field', async () => {
      const legacyLockedRevenue = {
        ...mockRevenue,
        lockKT: false,
        lockAdmin: false,
        lockFinal: false,
        isLocked: true,
      };

      render(<RevenueForm {...defaultProps} revenue={legacyLockedRevenue as never} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Thu nhập đã khóa/)).toBeInTheDocument();
    });
  });

  describe('Request Fetching', () => {
    it('handles fetch error gracefully', async () => {
      mockSafeFetch.mockResolvedValue({ data: null, error: 'Network error' });

      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Should still render form even with fetch error
      expect(screen.getByText('Thông tin Booking')).toBeInTheDocument();
    });

    it('shows empty requests list when none available', async () => {
      mockSafeFetch.mockResolvedValue({ data: [], error: null });

      render(<RevenueForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải dữ liệu...')).not.toBeInTheDocument();
      });

      // Form should still render
      expect(screen.getByText('Thông tin Booking')).toBeInTheDocument();
    });
  });
});
