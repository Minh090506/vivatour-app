/**
 * Tests for FollowUpStatusTable component
 * Covers: rendering, CRUD, drag & drop, badges
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

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FollowUpStatusTable } from '../followup-status-table';
import {
  resetMocks,
  setupFetchMock,
  mockFollowUpStatus,
  mockFollowUpStatuses,
} from './test-utils';

// Mock dnd-kit modules
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: jest.fn((arr, from, to) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}));

describe('FollowUpStatusTable', () => {
  const defaultProps = {
    onEdit: jest.fn(),
    onDelete: jest.fn().mockResolvedValue(undefined),
    onAdd: jest.fn(),
  };

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
        '/api/config/follow-up-statuses': { success: true, data: [] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Trạng thái Follow-up')).toBeInTheDocument();
      expect(screen.getAllByText('Trạng thái').length).toBeGreaterThan(0);
      expect(screen.getByText('Aliases')).toBeInTheDocument();
      expect(screen.getByText('Số ngày')).toBeInTheDocument();
      expect(screen.getByText('Thao tác')).toBeInTheDocument();
    });

    it('renders loading state "Đang tải..."', () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: mockFollowUpStatuses },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      expect(screen.getByText('Đang tải...')).toBeInTheDocument();
    });

    it('renders empty state "Chưa có trạng thái nào"', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Chưa có trạng thái nào')).toBeInTheDocument();
      });
    });

    it('renders status rows with data', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: mockFollowUpStatuses },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.status)).toBeInTheDocument();
      });
    });
  });

  describe('CRUD Operations', () => {
    it('calls onAdd when add button clicked', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Thêm trạng thái/i });
      fireEvent.click(addButton);

      expect(defaultProps.onAdd).toHaveBeenCalled();
    });

    it('calls onEdit with status when edit clicked', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.status)).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Sửa');
      fireEvent.click(editButtons[0]);

      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockFollowUpStatus);
    });

    it('shows delete dialog on delete click', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.status)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Xóa');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
        expect(screen.getByText(/Bạn có chắc muốn xóa trạng thái/i)).toBeInTheDocument();
      });
    });

    it('calls onDelete after confirm', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} onDelete={onDelete} />);

      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.status)).toBeInTheDocument();
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
        expect(onDelete).toHaveBeenCalledWith(mockFollowUpStatus.id);
      });
    });

    it('shows success toast after delete', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.status)).toBeInTheDocument();
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
        expect(mockToastModule.success).toHaveBeenCalledWith('Đã xóa trạng thái thành công');
      });
    });
  });

  describe('Drag & Drop', () => {
    it('renders drag handle (GripVertical icon)', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.status)).toBeInTheDocument();
      });

      // Check for drag handle button
      const dragHandles = document.querySelectorAll('.cursor-grab');
      expect(dragHandles.length).toBeGreaterThan(0);
    });

    it('renders sortable rows', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: mockFollowUpStatuses },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        mockFollowUpStatuses.forEach((status) => {
          expect(screen.getByText(status.status)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Badges', () => {
    it('renders days badge with value', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(`${mockFollowUpStatus.daysToFollowup} ngày`)).toBeInTheDocument();
      });
    });

    it('renders active status badge "Hoạt động"', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Hoạt động')).toBeInTheDocument();
      });
    });

    it('renders inactive status badge "Ngừng"', async () => {
      const inactiveStatus = { ...mockFollowUpStatus, isActive: false };
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [inactiveStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Ngừng')).toBeInTheDocument();
      });
    });

    it('renders alias badges', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        mockFollowUpStatus.aliases.forEach((alias) => {
          expect(screen.getByText(alias)).toBeInTheDocument();
        });
      });
    });

    it('renders "-" when no aliases', async () => {
      const statusNoAliases = { ...mockFollowUpStatus, aliases: [] };
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [statusNoAliases] },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('-')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast on delete failure', async () => {
      const onDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: true, data: [mockFollowUpStatus] },
      });

      render(<FollowUpStatusTable {...defaultProps} onDelete={onDelete} />);

      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.status)).toBeInTheDocument();
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
        expect(mockToastModule.error).toHaveBeenCalledWith('Delete failed');
      });
    });

    it('shows error toast on fetch failure', async () => {
      setupFetchMock({
        '/api/config/follow-up-statuses': { success: false, error: 'Server error' },
      });

      render(<FollowUpStatusTable {...defaultProps} />);

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Server error');
      });
    });
  });
});
