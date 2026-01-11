/**
 * Tests for OperatorApprovalTable component
 * Covers: rendering states, table content, status badges, single/bulk approval, selection
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OperatorApprovalTable } from '../operator-approval-table';
import {
  mockApprovalQueueItems,
  mockOverdueApprovalItem,
  mockTodayDueApprovalItem,
  mockLockedApprovalItem,
  resetMocks,
  createMockApprovalItem,
} from './test-utils';

describe('OperatorApprovalTable', () => {
  const mockOnApprove = jest.fn().mockResolvedValue(undefined);
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    resetMocks();
    mockOnApprove.mockClear();
    mockOnRetry.mockClear();
  });

  describe('Rendering', () => {
    it('renders table with column headers', () => {
      render(
        <OperatorApprovalTable
          items={mockApprovalQueueItems}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Booking')).toBeInTheDocument();
      expect(screen.getByText('Ngày DV')).toBeInTheDocument();
      expect(screen.getByText('Dịch vụ')).toBeInTheDocument();
      expect(screen.getByText('NCC')).toBeInTheDocument();
      expect(screen.getByText('Tổng CP')).toBeInTheDocument();
      expect(screen.getByText('Đã TT')).toBeInTheDocument();
      expect(screen.getByText('Còn nợ')).toBeInTheDocument();
      expect(screen.getByText('Hạn TT')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    });

    it('renders empty state when items array empty', () => {
      render(
        <OperatorApprovalTable
          items={[]}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Không có dịch vụ nào chờ duyệt')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders loading state when loading=true', () => {
      render(
        <OperatorApprovalTable
          items={[]}
          onApprove={mockOnApprove}
          loading={true}
        />
      );

      expect(screen.getByText('Đang tải...')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders error fallback when error prop set', () => {
      render(
        <OperatorApprovalTable
          items={[]}
          onApprove={mockOnApprove}
          error="Network error occurred"
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Lỗi tải danh sách duyệt')).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });

    it('calls onRetry when retry button clicked', () => {
      render(
        <OperatorApprovalTable
          items={[]}
          onApprove={mockOnApprove}
          error="Test error"
          onRetry={mockOnRetry}
        />
      );

      fireEvent.click(screen.getByText('Thử lại'));
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Table Content', () => {
    it('displays request code and customer name', () => {
      const item = createMockApprovalItem({
        id: 'test1',
        requestCode: 'BK999',
        customerName: 'Test Customer',
      });

      render(
        <OperatorApprovalTable
          items={[item]}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('BK999')).toBeInTheDocument();
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
    });

    it('formats service date in vi-VN locale', () => {
      const item = createMockApprovalItem({
        id: 'test1',
        serviceDate: new Date('2026-03-20'),
        paymentDeadline: new Date('2026-04-10'),
      });

      render(
        <OperatorApprovalTable
          items={[item]}
          onApprove={mockOnApprove}
        />
      );

      // vi-VN format: D/M/YYYY (without leading zeros)
      expect(screen.getByText('20/3/2026')).toBeInTheDocument();
    });

    it('formats totalCost in VND', () => {
      const item = createMockApprovalItem({
        id: 'test1',
        totalCost: 5000000,
      });

      render(
        <OperatorApprovalTable
          items={[item]}
          onApprove={mockOnApprove}
        />
      );

      // VND format: 5.000.000 ₫
      expect(screen.getByText(/5\.000\.000/)).toBeInTheDocument();
    });

    it('displays debt in red when positive', () => {
      const item = createMockApprovalItem({
        id: 'test1',
        debt: 3000000,
      });

      const { container } = render(
        <OperatorApprovalTable
          items={[item]}
          onApprove={mockOnApprove}
        />
      );

      // Find the debt cell with red text
      const debtCells = container.querySelectorAll('.text-red-600');
      const hasDebtInRed = Array.from(debtCells).some(cell =>
        cell.textContent?.includes('3.000.000')
      );
      expect(hasDebtInRed).toBe(true);
    });
  });

  describe('Status Badges', () => {
    it('shows "Quá hạn X ngày" badge when daysOverdue > 0', () => {
      render(
        <OperatorApprovalTable
          items={[mockOverdueApprovalItem]}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Quá hạn 3 ngày')).toBeInTheDocument();
    });

    it('shows "Hôm nay" badge when daysOverdue === 0', () => {
      render(
        <OperatorApprovalTable
          items={[mockTodayDueApprovalItem]}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Hôm nay')).toBeInTheDocument();
    });

    it('shows "Còn X ngày" badge when daysOverdue < 0', () => {
      const item = createMockApprovalItem({
        id: 'test1',
        daysOverdue: -5,
      });

      render(
        <OperatorApprovalTable
          items={[item]}
          onApprove={mockOnApprove}
        />
      );

      expect(screen.getByText('Còn 5 ngày')).toBeInTheDocument();
    });
  });

  describe('Single Approval', () => {
    it('calls onApprove with single ID when clicked', async () => {
      render(
        <OperatorApprovalTable
          items={[mockApprovalQueueItems[0]]}
          onApprove={mockOnApprove}
        />
      );

      const approveButton = screen.getByText('Duyệt');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledTimes(1);
        expect(mockOnApprove).toHaveBeenCalledWith(
          ['op1'],
          expect.any(Date)
        );
      });
    });

    it('disables approve button when item isLocked', () => {
      render(
        <OperatorApprovalTable
          items={[mockLockedApprovalItem]}
          onApprove={mockOnApprove}
        />
      );

      const approveButton = screen.getByText('Duyệt');
      expect(approveButton).toBeDisabled();
    });
  });

  describe('Bulk Selection', () => {
    it('toggles single item selection on checkbox click', async () => {
      render(
        <OperatorApprovalTable
          items={mockApprovalQueueItems}
          onApprove={mockOnApprove}
        />
      );

      // Get all checkboxes (first is "select all", rest are row checkboxes)
      const checkboxes = screen.getAllByRole('checkbox');

      // Click first item checkbox (index 1, since 0 is "select all")
      fireEvent.click(checkboxes[1]);

      // Batch action bar should appear
      await waitFor(() => {
        expect(screen.getByText(/Đã chọn 1 dịch vụ/)).toBeInTheDocument();
      });

      // Click again to deselect
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
      });
    });

    it('shows batch action bar when items selected', async () => {
      render(
        <OperatorApprovalTable
          items={mockApprovalQueueItems}
          onApprove={mockOnApprove}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // Select first item
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText(/Đã chọn 1 dịch vụ/)).toBeInTheDocument();
        expect(screen.getByText('Duyệt tất cả')).toBeInTheDocument();
        expect(screen.getByText('Bỏ chọn')).toBeInTheDocument();
      });
    });

    it('calls onApprove with selected IDs on batch approve', async () => {
      render(
        <OperatorApprovalTable
          items={mockApprovalQueueItems}
          onApprove={mockOnApprove}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // Select first two items
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      await waitFor(() => {
        expect(screen.getByText(/Đã chọn 2 dịch vụ/)).toBeInTheDocument();
      });

      // Click batch approve
      const batchApproveButton = screen.getByText('Duyệt tất cả');
      fireEvent.click(batchApproveButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledTimes(1);
        expect(mockOnApprove).toHaveBeenCalledWith(
          expect.arrayContaining(['op1', 'op2']),
          expect.any(Date)
        );
      });
    });

    it('clears selection after successful batch approve', async () => {
      render(
        <OperatorApprovalTable
          items={mockApprovalQueueItems}
          onApprove={mockOnApprove}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // Select first item
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText(/Đã chọn 1 dịch vụ/)).toBeInTheDocument();
      });

      // Click batch approve
      const batchApproveButton = screen.getByText('Duyệt tất cả');
      fireEvent.click(batchApproveButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalled();
      });

      // Selection should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
      });
    });

    it('toggles all items selection when select all checkbox clicked', async () => {
      render(
        <OperatorApprovalTable
          items={mockApprovalQueueItems}
          onApprove={mockOnApprove}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0];

      // Select all
      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/Đã chọn 3 dịch vụ/)).toBeInTheDocument();
      });

      // Deselect all
      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
      });
    });

    it('does not select locked items in checkboxes', () => {
      render(
        <OperatorApprovalTable
          items={[mockLockedApprovalItem]}
          onApprove={mockOnApprove}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // Row checkbox should be disabled
      expect(checkboxes[1]).toBeDisabled();
    });

    it('clears selection when Bỏ chọn button clicked', async () => {
      render(
        <OperatorApprovalTable
          items={mockApprovalQueueItems}
          onApprove={mockOnApprove}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // Select first item
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText(/Đã chọn 1 dịch vụ/)).toBeInTheDocument();
      });

      // Click clear button
      const clearButton = screen.getByText('Bỏ chọn');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
      });
    });
  });
});
