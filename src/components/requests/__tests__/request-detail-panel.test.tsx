/**
 * Tests for RequestDetailPanel component
 * Covers: states, data display, interactions, permission-based features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequestDetailPanel } from '../request-detail-panel';
import { mockRequest, mockRequestWithBooking, setupFetchMock, resetMocks } from './test-utils';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', role: 'ADMIN' } },
    status: 'authenticated',
  })),
}));

// Mock usePermission hook
const mockUsePermission = jest.fn();
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => mockUsePermission(),
}));

describe('RequestDetailPanel', () => {
  const mockOnRefresh = jest.fn();
  const mockOnEditClick = jest.fn();

  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();

    // Default permission mock - admin with all permissions
    mockUsePermission.mockReturnValue({
      can: jest.fn(() => true),
      canAll: jest.fn(() => true),
      canAny: jest.fn(() => true),
      role: 'ADMIN',
      isAdmin: true,
      isAccountant: false,
      isSeller: false,
      isLoading: false,
      isAuthenticated: true,
    });
  });

  describe('States', () => {
    it('renders loading skeleton when isLoading=true', () => {
      const { container } = render(
        <RequestDetailPanel
          request={null}
          isLoading={true}
          onRefresh={mockOnRefresh}
        />
      );

      // Should have skeleton animation elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders error state with retry button', () => {
      render(
        <RequestDetailPanel
          request={null}
          isLoading={false}
          error="Test error message"
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Không thể tải chi tiết')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });

    it('renders empty state when request=null', () => {
      render(
        <RequestDetailPanel
          request={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Chọn yêu cầu từ danh sách')).toBeInTheDocument();
      expect(screen.getByText('để xem chi tiết')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('renders customer info fields', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Thông tin khách hàng')).toBeInTheDocument();
      // Customer name appears in multiple places (header, info row)
      expect(screen.getAllByText('Nguyen Van A').length).toBeGreaterThan(0);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('USA')).toBeInTheDocument();
    });

    it('renders tour info fields', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Thông tin Tour')).toBeInTheDocument();
      // Tour days may appear multiple times
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });

    it('renders request code/rqid in header', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // RQID should be displayed
      expect(screen.getAllByText('RQ-2024-001').length).toBeGreaterThan(0);
    });

    it('renders booking code banner when booking exists', async () => {
      setupFetchMock({ '/api/revenues': { success: true, data: [] } });

      render(
        <RequestDetailPanel
          request={mockRequestWithBooking}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Booking code banner should show immediately (no async needed for this part)
      expect(screen.getByText('Mã Booking')).toBeInTheDocument();
      // Booking code appears twice - in header and banner
      expect(screen.getAllByText('20260110S0001').length).toBeGreaterThan(0);
    });

    it('does not render booking banner for non-booking request', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.queryByText('Mã Booking')).not.toBeInTheDocument();
    });

    it('renders notes section when notes exist', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Ghi chú')).toBeInTheDocument();
      expect(screen.getByText('Test notes')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('shows edit button when onEditClick provided', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
          onEditClick={mockOnEditClick}
        />
      );

      expect(screen.getByText('Chỉnh sửa')).toBeInTheDocument();
    });

    it('hides edit button when onEditClick not provided', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.queryByText('Chỉnh sửa')).not.toBeInTheDocument();
    });

    it('calls onEditClick when edit button clicked', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
          onEditClick={mockOnEditClick}
        />
      );

      fireEvent.click(screen.getByText('Chỉnh sửa'));
      expect(mockOnEditClick).toHaveBeenCalled();
    });

    it('calls onRefresh when retry button clicked in error state', () => {
      render(
        <RequestDetailPanel
          request={null}
          isLoading={false}
          error="Error occurred"
          onRefresh={mockOnRefresh}
        />
      );

      fireEvent.click(screen.getByText('Thử lại'));
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Permission-based Features', () => {
    it('shows revenue section with permission and bookingCode', async () => {
      mockUsePermission.mockReturnValue({
        can: jest.fn((perm: string) => perm === 'revenue:view' || perm === 'revenue:manage'),
        isAdmin: true,
        isAccountant: false,
      });

      setupFetchMock({ '/api/revenues': { success: true, data: [] } });

      render(
        <RequestDetailPanel
          request={mockRequestWithBooking}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Wait for revenue section to appear (may need time for async state updates)
      await waitFor(() => {
        const revenueTexts = screen.queryAllByText(/Doanh thu/);
        expect(revenueTexts.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('hides revenue section without permission', () => {
      mockUsePermission.mockReturnValue({
        can: jest.fn(() => false),
        isAdmin: false,
        isAccountant: false,
      });

      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequestWithBooking}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Revenue section should not appear when permission denied
      // Note: Card with "Doanh thu" title should not be present
      const revenueHeaders = screen.queryAllByText(/Doanh thu \(/);
      expect(revenueHeaders.length).toBe(0);
    });

    it('hides revenue section for non-booking request even with permission', () => {
      mockUsePermission.mockReturnValue({
        can: jest.fn(() => true),
        isAdmin: true,
        isAccountant: false,
      });

      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest} // No bookingCode
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Revenue section should not appear without bookingCode
      const revenueHeaders = screen.queryAllByText(/Doanh thu \(/);
      expect(revenueHeaders.length).toBe(0);
    });
  });

  describe('Revenue Loading', () => {
    it('shows loading state while fetching revenues', async () => {
      mockUsePermission.mockReturnValue({
        can: jest.fn(() => true),
        isAdmin: true,
      });

      // Slow fetch mock
      global.fetch = jest.fn(() =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, data: [] }),
            });
          }, 100)
        )
      ) as jest.Mock;

      render(
        <RequestDetailPanel
          request={mockRequestWithBooking}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
      });
    });

    it('shows revenue error state with retry option', async () => {
      mockUsePermission.mockReturnValue({
        can: jest.fn(() => true),
        isAdmin: true,
      });

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false, error: 'Failed to load' }),
        })
      ) as jest.Mock;

      render(
        <RequestDetailPanel
          request={mockRequestWithBooking}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        // Error text or retry button should appear
        const retryButtons = screen.queryAllByText('Thử lại');
        expect(retryButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Info Row Display', () => {
    it('displays WhatsApp when available', () => {
      setupFetchMock({});

      render(
        <RequestDetailPanel
          request={mockRequest}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('+84123456789')).toBeInTheDocument();
    });

    it('displays dash when WhatsApp not available', () => {
      setupFetchMock({});

      const requestNoWhatsapp = { ...mockRequest, whatsapp: null };

      render(
        <RequestDetailPanel
          request={requestNoWhatsapp}
          isLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Should have dash for empty WhatsApp field
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });
});
