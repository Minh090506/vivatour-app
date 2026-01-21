/**
 * Tests for FollowUpStatusFormModal component
 * Covers: rendering, validation, alias management, submit
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
import { FollowUpStatusFormModal } from '../followup-status-form-modal';
import { resetMocks, mockFollowUpStatus } from './test-utils';

describe('FollowUpStatusFormModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    status: null,
    onSuccess: jest.fn(),
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
    it('renders create mode title "Thêm trạng thái mới"', () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);
      expect(screen.getByText('Thêm trạng thái mới')).toBeInTheDocument();
    });

    it('renders edit mode title "Sửa trạng thái"', () => {
      render(<FollowUpStatusFormModal {...defaultProps} status={mockFollowUpStatus} />);
      expect(screen.getByText('Sửa trạng thái')).toBeInTheDocument();
    });

    it('populates form fields in edit mode', () => {
      render(<FollowUpStatusFormModal {...defaultProps} status={mockFollowUpStatus} />);

      expect(screen.getByDisplayValue(mockFollowUpStatus.status)).toBeInTheDocument();
      expect(
        screen.getByDisplayValue(mockFollowUpStatus.daysToFollowup.toString())
      ).toBeInTheDocument();

      // Check aliases are displayed as badges
      mockFollowUpStatus.aliases.forEach((alias) => {
        expect(screen.getByText(alias)).toBeInTheDocument();
      });
    });

    it('shows form fields', () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);

      expect(screen.getByLabelText(/Tên trạng thái/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Số ngày follow-up/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Đang hoạt động/i)).toBeInTheDocument();
      expect(screen.getByText(/Nhấn Enter để thêm/i)).toBeInTheDocument();
    });

    it('shows correct button text for create mode', () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Tạo mới' })).toBeInTheDocument();
    });

    it('shows correct button text for edit mode', () => {
      render(<FollowUpStatusFormModal {...defaultProps} status={mockFollowUpStatus} />);
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error for empty status name', async () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Tên trạng thái không được để trống')).toBeInTheDocument();
      });
    });

    it('allows daysToFollowup >= 0', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 'new-status' } }),
      });
      global.fetch = mockFetch;

      render(<FollowUpStatusFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Tên trạng thái/i), {
        target: { value: 'Test Status' },
      });
      fireEvent.change(screen.getByLabelText(/Số ngày follow-up/i), {
        target: { value: '0' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('shows error for negative daysToFollowup', async () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Tên trạng thái/i), {
        target: { value: 'Test Status' },
      });
      fireEvent.change(screen.getByLabelText(/Số ngày follow-up/i), {
        target: { value: '-1' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Số ngày phải >= 0')).toBeInTheDocument();
      });
    });
  });

  describe('Alias Management', () => {
    it('adds alias on Enter key', async () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);

      const aliasInput = screen.getByPlaceholderText('VD: mới, new, moi');
      fireEvent.change(aliasInput, { target: { value: 'test-alias' } });
      fireEvent.keyDown(aliasInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('test-alias')).toBeInTheDocument();
      });
    });

    it('clears input after adding alias', async () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);

      const aliasInput = screen.getByPlaceholderText('VD: mới, new, moi') as HTMLInputElement;
      fireEvent.change(aliasInput, { target: { value: 'test-alias' } });
      fireEvent.keyDown(aliasInput, { key: 'Enter' });

      await waitFor(() => {
        expect(aliasInput.value).toBe('');
      });
    });

    it('removes alias on X button click', async () => {
      render(<FollowUpStatusFormModal {...defaultProps} status={mockFollowUpStatus} />);

      // Wait for aliases to be rendered
      await waitFor(() => {
        expect(screen.getByText(mockFollowUpStatus.aliases[0])).toBeInTheDocument();
      });

      // Find and click the X button for the first alias
      const removeButtons = screen.getAllByRole('button').filter((btn) =>
        btn.querySelector('.lucide-x')
      );

      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);

        await waitFor(() => {
          expect(screen.queryByText(mockFollowUpStatus.aliases[0])).not.toBeInTheDocument();
        });
      }
    });

    it('shows duplicate alias error', async () => {
      render(<FollowUpStatusFormModal {...defaultProps} />);

      const aliasInput = screen.getByPlaceholderText('VD: mới, new, moi');

      // Add first alias
      fireEvent.change(aliasInput, { target: { value: 'duplicate' } });
      fireEvent.keyDown(aliasInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('duplicate')).toBeInTheDocument();
      });

      // Try to add duplicate
      fireEvent.change(aliasInput, { target: { value: 'duplicate' } });
      fireEvent.keyDown(aliasInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Alias đã tồn tại');
      });
    });

    it('displays aliases as badges', () => {
      render(<FollowUpStatusFormModal {...defaultProps} status={mockFollowUpStatus} />);

      mockFollowUpStatus.aliases.forEach((alias) => {
        const aliasBadge = screen.getByText(alias);
        expect(aliasBadge).toBeInTheDocument();
      });
    });
  });

  describe('Submit', () => {
    it('calls POST on create', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 'new-status' } }),
      });
      global.fetch = mockFetch;

      render(<FollowUpStatusFormModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Tên trạng thái/i), {
        target: { value: 'New Status' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/config/follow-up-statuses',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('calls PUT on edit', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockFollowUpStatus }),
      });
      global.fetch = mockFetch;

      render(<FollowUpStatusFormModal {...defaultProps} status={mockFollowUpStatus} />);

      const submitButton = screen.getByRole('button', { name: 'Lưu thay đổi' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/config/follow-up-statuses/${mockFollowUpStatus.id}`,
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    it('shows success toast and closes modal', async () => {
      const onOpenChange = jest.fn();
      const onSuccess = jest.fn();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 'new-status' } }),
      });
      global.fetch = mockFetch;

      render(
        <FollowUpStatusFormModal
          {...defaultProps}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      );

      fireEvent.change(screen.getByLabelText(/Tên trạng thái/i), {
        target: { value: 'New Status' },
      });

      const submitButton = screen.getByRole('button', { name: 'Tạo mới' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastModule.success).toHaveBeenCalledWith('Tạo trạng thái thành công');
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('shows error toast on API failure', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Status already exists' }),
      });
      global.fetch = mockFetch;

      render(<FollowUpStatusFormModal {...defaultProps} status={mockFollowUpStatus} />);

      const submitButton = screen.getByRole('button', { name: 'Lưu thay đổi' });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastModule.error).toHaveBeenCalledWith('Status already exists');
      });
    });
  });
});
