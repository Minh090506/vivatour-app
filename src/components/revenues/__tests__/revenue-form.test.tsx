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
  });
});
