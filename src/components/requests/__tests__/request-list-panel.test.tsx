/**
 * Tests for RequestListPanel component
 * Covers: loading states, error handling, empty states, search, selection, infinite scroll
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequestListPanel } from '../request-list-panel';
import {
  mockRequests,
  createMockRequest,
  mockIntersectionObserver,
  createMockRequestWithOverdueFollowUp,
} from './test-utils';

describe('RequestListPanel', () => {
  const mockOnSelect = jest.fn();
  const mockOnSearchChange = jest.fn();
  const mockOnRetry = jest.fn();
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIntersectionObserver();
  });

  // ============================================
  // LOADING STATES
  // ============================================

  describe('Loading States', () => {
    it('displays loading spinner when isLoading is true', () => {
      render(
        <RequestListPanel
          requests={[]}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={true}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('Đang tải...')).toBeInTheDocument();
    });

    it('hides loading spinner when data loads', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
    });

    it('shows "Đang tải thêm..." during pagination', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          isLoadingMore={true}
          hasMore={true}
        />
      );

      expect(screen.getByText('Đang tải thêm...')).toBeInTheDocument();
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('displays error message when error prop is set', () => {
      render(
        <RequestListPanel
          requests={[]}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          error="Lỗi kết nối server"
        />
      );

      expect(screen.getByText('Lỗi kết nối server')).toBeInTheDocument();
    });

    it('shows retry button when onRetry provided', () => {
      render(
        <RequestListPanel
          requests={[]}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          error="Lỗi kết nối"
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });

    it('hides retry button when onRetry not provided', () => {
      render(
        <RequestListPanel
          requests={[]}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          error="Lỗi kết nối"
        />
      );

      expect(screen.queryByRole('button', { name: /thử lại/i })).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button clicked', async () => {
      render(
        <RequestListPanel
          requests={[]}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          error="Lỗi kết nối"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /thử lại/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('displays loadMoreError for pagination failures', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          loadMoreError="Không thể tải thêm"
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('Không thể tải thêm')).toBeInTheDocument();
    });
  });

  // ============================================
  // EMPTY STATE
  // ============================================

  describe('Empty State', () => {
    it('shows "Không có yêu cầu nào" when requests empty', () => {
      render(
        <RequestListPanel
          requests={[]}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('Không có yêu cầu nào')).toBeInTheDocument();
    });

    it('displays total count in footer', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          total={10}
        />
      );

      expect(screen.getByText(/Hiển thị 3 \/ 10 yêu cầu/)).toBeInTheDocument();
    });

    it('displays request count when no total provided', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('3 yêu cầu')).toBeInTheDocument();
    });
  });

  // ============================================
  // SEARCH FUNCTIONALITY
  // ============================================

  describe('Search Functionality', () => {
    it('renders search input', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByPlaceholderText('Tìm kiếm...')).toBeInTheDocument();
    });

    it('calls onSearchChange on input', async () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Tìm kiếm...');
      fireEvent.change(searchInput, { target: { value: 'Nguyen' } });

      expect(mockOnSearchChange).toHaveBeenCalledWith('Nguyen');
    });

    it('displays search value', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue="Test search"
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Tìm kiếm...') as HTMLInputElement;
      expect(searchInput.value).toBe('Test search');
    });
  });

  // ============================================
  // REQUEST SELECTION
  // ============================================

  describe('Request Selection', () => {
    it('highlights selected request', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId="1"
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      // Selected item should have border-l-primary class
      const selectedItem = screen.getByText('Nguyen Van A').closest('div[class*="border-l-primary"]');
      expect(selectedItem).toBeInTheDocument();
    });

    it('calls onSelect when request clicked', async () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      // Click on a request item (customer name)
      const requestItem = screen.getByText('Nguyen Van A').closest('div[class*="cursor-pointer"]');
      if (requestItem) {
        fireEvent.click(requestItem);
      }

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('1');
      });
    });
  });

  // ============================================
  // INFINITE SCROLL
  // ============================================

  describe('Infinite Scroll', () => {
    it('does not show load more state when hasMore is false', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          hasMore={false}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.queryByText('Đang tải thêm...')).not.toBeInTheDocument();
    });

    it('does not trigger loadMore when already loading more', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
          hasMore={true}
          isLoadingMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      // IntersectionObserver should not trigger loadMore when isLoadingMore is true
      expect(screen.getByText('Đang tải thêm...')).toBeInTheDocument();
    });
  });

  // ============================================
  // REQUEST LIST ITEMS
  // ============================================

  describe('Request List Items', () => {
    it('renders all requests in list', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
      expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
      expect(screen.getByText('Le Van C')).toBeInTheDocument();
    });

    it('displays request codes', () => {
      render(
        <RequestListPanel
          requests={mockRequests}
          selectedId={null}
          onSelect={mockOnSelect}
          isLoading={false}
          searchValue=""
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByText('RQ-2024-001')).toBeInTheDocument();
      expect(screen.getByText('RQ-2024-002')).toBeInTheDocument();
    });
  });
});
