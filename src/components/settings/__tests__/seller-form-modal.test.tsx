/**
 * Tests for SellerFormModal component
 * Covers: rendering, form validation, submit handling, modal states
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
import { SellerFormModal } from '../seller-form-modal';
import { resetMocks, mockSeller } from './test-utils';

describe('SellerFormModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    seller: null,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    resetMocks();
    // Mock DOM methods for Radix UI Select
    Element.prototype.scrollIntoView = jest.fn();
    HTMLElement.prototype.hasPointerCapture = jest.fn();
    HTMLElement.prototype.setPointerCapture = jest.fn();
    HTMLElement.prototype.releasePointerCapture = jest.fn();
  });

  describe('Rendering', () => {
    it('renders with create mode title "Thêm Seller mới"', () => {
      render(<SellerFormModal {...defaultProps} />);
      expect(screen.getByText('Thêm Seller mới')).toBeInTheDocument();
    });

    it('renders with edit mode title "Sửa thông tin Seller"', () => {
      render(<SellerFormModal {...defaultProps} seller={mockSeller} />);
      expect(screen.getByText('Sửa thông tin Seller')).toBeInTheDocument();
    });

    it('populates form with seller data in edit mode', () => {
      render(<SellerFormModal {...defaultProps} seller={mockSeller} />);

      expect(screen.getByDisplayValue(mockSeller.telegramId)).toBeInTheDocument();
      // sellerName and sheetName have same value, use getAllByDisplayValue
      const sameValueInputs = screen.getAllByDisplayValue(mockSeller.sellerName);
      expect(sameValueInputs.length).toBe(2); // sellerName and sheetName
      expect(screen.getByDisplayValue(mockSeller.sellerCode)).toBeInTheDocument();
    });

    it('shows all form fields', () => {
      render(<SellerFormModal {...defaultProps} />);

      expect(screen.getByLabelText(/Telegram ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tên Seller/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tên Sheet/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mã/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tên Meta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      // Select component doesn't have proper aria association, check label text instead
      expect(screen.getByText(/Giới tính/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Đang hoạt động/i)).toBeInTheDocument();
    });

    it('shows correct button text for create mode', () => {
      render(<SellerFormModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Tạo mới' })).toBeInTheDocument();
    });

    it('shows correct button text for edit mode', () => {
      render(<SellerFormModal {...defaultProps} seller={mockSeller} />);
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error for empty telegramId', async () => {
      render(<SellerFormModal {...defaultProps} />);

      // Fill other required fields but leave telegramId empty
      fireEvent.change(screen.getByLabelText(/Tên Seller/i), {
        target: { value: 'Test Seller' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Sheet/i), {
        target: { value: 'Test Sheet' },
      });
      fireEvent.change(screen.getByLabelText(/Mã/i), {
        target: { value: 'T' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Telegram ID không được để trống');
      });
    });

    it('shows error for empty sellerName', async () => {
      render(<SellerFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Telegram ID/i), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Sheet/i), {
        target: { value: 'Test Sheet' },
      });
      fireEvent.change(screen.getByLabelText(/Mã/i), {
        target: { value: 'T' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Tên seller không được để trống');
      });
    });

    it('shows error for empty sheetName', async () => {
      render(<SellerFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Telegram ID/i), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Seller/i), {
        target: { value: 'Test Seller' },
      });
      fireEvent.change(screen.getByLabelText(/Mã/i), {
        target: { value: 'T' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Tên sheet không được để trống');
      });
    });

    it('shows error for empty sellerCode', async () => {
      render(<SellerFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Telegram ID/i), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Seller/i), {
        target: { value: 'Test Seller' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Sheet/i), {
        target: { value: 'Test Sheet' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Mã seller không được để trống');
      });
    });

    it('shows error for invalid sellerCode format', async () => {
      render(<SellerFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Telegram ID/i), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Seller/i), {
        target: { value: 'Test Seller' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Sheet/i), {
        target: { value: 'Test Sheet' },
      });
      fireEvent.change(screen.getByLabelText(/Mã/i), {
        target: { value: 'abc' }, // lowercase and > 2 chars
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Mã seller phải là 1-2 ký tự in hoa (A-Z)');
      });
    });
  });

  describe('Submit', () => {
    it('calls POST /api/config/sellers on create', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 'new-seller' } }),
      });
      global.fetch = mockFetch;

      render(<SellerFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Telegram ID/i), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Seller/i), {
        target: { value: 'Test Seller' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Sheet/i), {
        target: { value: 'Test Sheet' },
      });
      fireEvent.change(screen.getByLabelText(/Mã/i), {
        target: { value: 'T' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/config/sellers',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('calls PUT /api/config/sellers/[id] on edit', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockSeller }),
      });
      global.fetch = mockFetch;

      render(<SellerFormModal {...defaultProps} seller={mockSeller} />);

      const submitButton = screen.getByRole('button', { name: 'Lưu thay đổi' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/config/sellers/${mockSeller.id}`,
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    it('shows success toast on submit', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 'new-seller' } }),
      });
      global.fetch = mockFetch;

      render(<SellerFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Telegram ID/i), {
        target: { value: '123456789' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Seller/i), {
        target: { value: 'Test Seller' },
      });
      fireEvent.change(screen.getByLabelText(/Tên Sheet/i), {
        target: { value: 'Test Sheet' },
      });
      fireEvent.change(screen.getByLabelText(/Mã/i), {
        target: { value: 'T' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastModule.success).toHaveBeenCalledWith('Tạo seller thành công');
      });
    });

    it('shows error toast on API failure', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Database error' }),
      });
      global.fetch = mockFetch;

      render(<SellerFormModal {...defaultProps} seller={mockSeller} />);

      const submitButton = screen.getByRole('button', { name: 'Lưu thay đổi' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Database error');
      });
    });
  });

  describe('State', () => {
    it('shows loading text while submitting', async () => {
      const mockFetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true, data: mockSeller }),
                }),
              500
            )
          )
      );
      global.fetch = mockFetch;

      render(<SellerFormModal {...defaultProps} seller={mockSeller} />);

      const submitButton = screen.getByRole('button', { name: 'Lưu thay đổi' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Đang lưu...')).toBeInTheDocument();
      });
    });

    it('closes modal and calls onSuccess after submit', async () => {
      const onOpenChange = jest.fn();
      const onSuccess = jest.fn();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockSeller }),
      });
      global.fetch = mockFetch;

      render(
        <SellerFormModal
          {...defaultProps}
          seller={mockSeller}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Lưu thay đổi' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('calls onOpenChange when cancel button clicked', () => {
      const onOpenChange = jest.fn();
      render(<SellerFormModal {...defaultProps} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByRole('button', { name: 'Hủy' });
      fireEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
