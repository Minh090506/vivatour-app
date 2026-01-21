/**
 * Tests for SellerTable component
 * Covers: rendering, CRUD operations, search, pagination, badges
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
import { SellerTable } from '../seller-table';
import {
  resetMocks,
  setupFetchMock,
  mockSeller,
  mockInactiveSeller,
  mockSellers,
} from './test-utils';

describe('SellerTable', () => {
  beforeEach(() => {
    resetMocks();
    // Mock DOM methods for Radix UI
    Element.prototype.scrollIntoView = jest.fn();
    HTMLElement.prototype.hasPointerCapture = jest.fn();
    HTMLElement.prototype.setPointerCapture = jest.fn();
    HTMLElement.prototype.releasePointerCapture = jest.fn();
  });

  describe('Rendering', () => {
    it('renders table headers correctly', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: [], total: 0, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Telegram ID')).toBeInTheDocument();
      expect(screen.getByText('Tên Seller')).toBeInTheDocument();
      expect(screen.getByText('Tên Sheet')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Giới tính')).toBeInTheDocument();
      expect(screen.getByText('Mã')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
      expect(screen.getByText('Thao tác')).toBeInTheDocument();
    });

    it('renders loading state "Đang tải..."', () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 2, hasMore: false },
      });

      render(<SellerTable />);

      expect(screen.getByText('Đang tải...')).toBeInTheDocument();
    });

    it('renders empty state "Không có seller nào"', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: [], total: 0, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.getByText('Không có seller nào')).toBeInTheDocument();
      });
    });

    it('renders seller data in rows', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 2, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        // sellerName and sheetName are both "Ly - Jenny", so use getAllByText
        const sellerNames = screen.getAllByText(mockSeller.sellerName);
        expect(sellerNames.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(mockSeller.telegramId)).toBeInTheDocument();
      });
    });
  });

  describe('CRUD Operations', () => {
    it('opens modal in create mode on add click', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: [], total: 0, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Thêm Seller/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Thêm Seller mới')).toBeInTheDocument();
      });
    });

    it('opens modal in edit mode on edit click', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: [mockSeller], total: 1, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        // sellerName and sheetName are the same, use getAllByText
        expect(screen.getAllByText(mockSeller.sellerName).length).toBeGreaterThanOrEqual(1);
      });

      const editButtons = screen.getAllByTitle('Sửa');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Sửa thông tin Seller')).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockSeller.telegramId)).toBeInTheDocument();
      });
    });

    it('shows delete confirmation dialog on delete click', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: [mockSeller], total: 1, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        // sellerName and sheetName are the same, use getAllByText
        expect(screen.getAllByText(mockSeller.sellerName).length).toBeGreaterThanOrEqual(1);
      });

      const deleteButtons = screen.getAllByTitle('Xóa');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
        expect(screen.getByText(/Bạn có chắc muốn xóa seller/i)).toBeInTheDocument();
      });
    });

    it('calls DELETE API on confirm', async () => {
      const mockFetch = setupFetchMock({
        '/api/config/sellers?': { success: true, data: [mockSeller], total: 1, hasMore: false },
        [`/api/config/sellers/${mockSeller.id}`]: { success: true },
      });

      render(<SellerTable />);

      await waitFor(() => {
        // sellerName and sheetName are the same, use getAllByText
        expect(screen.getAllByText(mockSeller.sellerName).length).toBeGreaterThanOrEqual(1);
      });

      const deleteButtons = screen.getAllByTitle('Xóa');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Xóa' });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        const deleteCalls = mockFetch.mock.calls.filter(
          (call: [string, RequestInit?]) => call[1]?.method === 'DELETE'
        );
        expect(deleteCalls.length).toBeGreaterThan(0);
      });
    });

    it('shows success toast after delete', async () => {
      setupFetchMock({
        '/api/config/sellers?': { success: true, data: [mockSeller], total: 1, hasMore: false },
        [`/api/config/sellers/${mockSeller.id}`]: { success: true },
      });

      render(<SellerTable />);

      await waitFor(() => {
        // sellerName and sheetName are the same, use getAllByText
        expect(screen.getAllByText(mockSeller.sellerName).length).toBeGreaterThanOrEqual(1);
      });

      const deleteButtons = screen.getAllByTitle('Xóa');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Xóa' });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockToastModule.success).toHaveBeenCalledWith('Đã xóa seller thành công');
      });
    });
  });

  describe('Search & Filter', () => {
    it('updates search input on type', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: [], total: 0, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Tìm kiếm seller...');
      fireEvent.change(searchInput, { target: { value: 'Jenny' } });

      expect(searchInput).toHaveValue('Jenny');
    });

    it('makes search request with query parameter', async () => {
      jest.useFakeTimers();

      const mockFetch = setupFetchMock({
        '/api/config/sellers': { success: true, data: [], total: 0, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Tìm kiếm seller...');
      fireEvent.change(searchInput, { target: { value: 'Jenny' } });

      // Wait for debounce (300ms)
      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        const searchCalls = mockFetch.mock.calls.filter((call: string[]) =>
          call[0].includes('search=Jenny')
        );
        expect(searchCalls.length).toBeGreaterThan(0);
      });

      jest.useRealTimers();
    });
  });

  describe('Pagination', () => {
    it('shows pagination when totalPages > 1', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 25, hasMore: true },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Trang 1/)).toBeInTheDocument();
    });

    it('disables prev button on page 1', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 25, hasMore: true },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      const prevButtons = document.querySelectorAll('button[disabled]');
      const hasPrevDisabled = Array.from(prevButtons).some((btn) =>
        btn.querySelector('svg.lucide-chevron-left')
      );
      expect(hasPrevDisabled).toBe(true);
    });

    it('disables next button on last page', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 2, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      // When hasMore is false, next button should be disabled
      const allButtons = screen.getAllByRole('button');
      const nextButton = allButtons.find((btn) => btn.querySelector('.lucide-chevron-right'));
      if (nextButton) {
        expect(nextButton).toBeDisabled();
      }
    });

    it('updates page on navigation', async () => {
      const mockFetch = setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 25, hasMore: true },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      // Find next button
      const allButtons = screen.getAllByRole('button');
      const nextButton = allButtons.find((btn) => btn.querySelector('.lucide-chevron-right'));

      if (nextButton) {
        fireEvent.click(nextButton);

        await waitFor(() => {
          const page2Calls = mockFetch.mock.calls.filter((call: string[]) =>
            call[0].includes('page=2')
          );
          expect(page2Calls.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Badges', () => {
    it('renders gender badge (Nam/Nữ)', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 2, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.getByText('Nữ')).toBeInTheDocument();
        expect(screen.getByText('Nam')).toBeInTheDocument();
      });
    });

    it('renders status badge (Hoạt động/Ngừng)', async () => {
      setupFetchMock({
        '/api/config/sellers': { success: true, data: mockSellers, total: 2, hasMore: false },
      });

      render(<SellerTable />);

      await waitFor(() => {
        expect(screen.getByText('Hoạt động')).toBeInTheDocument();
        expect(screen.getByText('Ngừng')).toBeInTheDocument();
      });
    });
  });
});
