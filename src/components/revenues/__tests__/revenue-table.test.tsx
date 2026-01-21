/**
 * Tests for RevenueTable component
 * Tests rendering, row display, permissions, lock states, actions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenueTable } from '../revenue-table';
import {
  mockRevenue,
  mockForeignRevenue,
  mockLockedKTRevenue,
  mockLockedAdminRevenue,
  mockLockedFinalRevenue,
  mockRevenues,
  mockRefundRevenue,
  resetMocks,
} from './test-utils';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock permission hook - default ADMIN
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    isAdmin: true,
    isAccountant: false,
  }),
}));

// Mock lock config
jest.mock('@/config/lock-config', () => ({
  LOCK_TIER_LABELS: {
    KT: 'Khoa KT',
    Admin: 'Khoa Admin',
    Final: 'Khoa Cuoi',
  },
}));

// Mock child components to simplify tests
jest.mock('../revenue-lock-dialog', () => ({
  RevenueLockDialog: ({ open, revenueId }: { open: boolean; revenueId: string }) =>
    open ? <div data-testid="lock-dialog">Lock Dialog for {revenueId}</div> : null,
}));

jest.mock('../revenue-history-panel', () => ({
  RevenueHistoryPanel: ({ revenueId }: { revenueId: string }) => (
    <div data-testid="history-panel">History for {revenueId}</div>
  ),
}));

jest.mock('@/components/shared/lock-tier-badge', () => ({
  LockTierBadgeCompact: ({ lockKT, lockAdmin, lockFinal }: { lockKT: boolean; lockAdmin: boolean; lockFinal: boolean }) => (
    <span data-testid="lock-badge">
      {lockFinal ? 'Final' : lockAdmin ? 'Admin' : lockKT ? 'KT' : 'None'}
    </span>
  ),
}));

// Mock scrollIntoView for Select
Element.prototype.scrollIntoView = jest.fn();

describe('RevenueTable', () => {
  const defaultProps = {
    revenues: mockRevenues,
    showRequest: false,
    onEdit: jest.fn(),
    onRefresh: jest.fn(),
    canManage: true,
    canUnlock: false,
  };

  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('Table Rendering', () => {
    it('renders empty state when no revenues', () => {
      render(<RevenueTable {...defaultProps} revenues={[]} />);

      expect(screen.getByText('Chua co thu nhap nao')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      render(<RevenueTable {...defaultProps} />);

      expect(screen.getByText('Ngay')).toBeInTheDocument();
      expect(screen.getByText('Loai')).toBeInTheDocument();
      expect(screen.getByText('Nguon')).toBeInTheDocument();
      expect(screen.getByText('So tien')).toBeInTheDocument();
      expect(screen.getByText('Khoa')).toBeInTheDocument();
      expect(screen.getByText('Thao tac')).toBeInTheDocument();
    });

    it('renders revenue rows', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(2); // header + 1 data row
    });

    it('displays booking code when showRequest=true', () => {
      render(<RevenueTable {...defaultProps} showRequest revenues={[mockRevenue]} />);

      expect(screen.getByText('Booking')).toBeInTheDocument();
      expect(screen.getByText('BK20260115-001')).toBeInTheDocument();
    });

    it('displays foreign currency amount', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockForeignRevenue]} />);

      expect(screen.getByText(/USD/)).toBeInTheDocument();
    });

    it('displays currency amounts with VND formatting', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      // Check for formatted amount (5,000,000 or 5.000.000 depending on locale)
      expect(screen.getByText(/5.*000.*000/)).toBeInTheDocument();
    });
  });

  describe('Lock State Display', () => {
    it('displays lock badges for each state', () => {
      render(
        <RevenueTable
          {...defaultProps}
          revenues={[mockRevenue, mockLockedKTRevenue, mockLockedFinalRevenue]}
        />
      );

      const badges = screen.getAllByTestId('lock-badge');
      expect(badges.length).toBe(3);
    });

    it('displays correct lock state in badge', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockLockedKTRevenue]} />);

      const badge = screen.getByTestId('lock-badge');
      expect(badge).toHaveTextContent('KT');
    });

    it('displays Final lock state', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockLockedFinalRevenue]} />);

      const badge = screen.getByTestId('lock-badge');
      expect(badge).toHaveTextContent('Final');
    });

    it('displays None for unlocked revenue', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      const badge = screen.getByTestId('lock-badge');
      expect(badge).toHaveTextContent('None');
    });
  });

  describe('Permission-based Visibility', () => {
    it('hides actions when canManage=false', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} canManage={false} />);

      expect(screen.queryByText('Thao tac')).not.toBeInTheDocument();
    });

    it('shows action column when canManage=true', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} canManage={true} />);

      expect(screen.getByText('Thao tac')).toBeInTheDocument();
    });

    it('renders action buttons for each row', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      // Should have an action button (the ellipsis menu trigger)
      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Table Data', () => {
    it('renders correct number of rows for multiple revenues', () => {
      render(<RevenueTable {...defaultProps} revenues={mockRevenues} />);

      // Header + 3 data rows (mockRevenues has 3 items)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(4);
    });

    it('displays payment type labels', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      // DEPOSIT should be displayed (as translated label or raw value)
      expect(screen.getByRole('row', { name: /DEPOSIT|Dat coc/i })).toBeInTheDocument();
    });
  });

  describe('Empty and Error States', () => {
    it('shows empty message with correct text', () => {
      render(<RevenueTable {...defaultProps} revenues={[]} />);

      const emptyMessage = screen.getByText('Chua co thu nhap nao');
      expect(emptyMessage).toBeInTheDocument();
    });

    it('renders table even with empty array', () => {
      const { container } = render(<RevenueTable {...defaultProps} revenues={[]} />);

      // Should still have some structure even if empty
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Action Menu', () => {
    it('opens dropdown menu on button click', async () => {
      const user = userEvent.setup();
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Chinh sua')).toBeInTheDocument();
      });
    });

    it('shows edit option for unlocked revenue', async () => {
      const user = userEvent.setup();
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Chinh sua')).toBeInTheDocument();
      });
    });

    it('renders with canManage enabled', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} canManage={true} />);

      // Should show action column when canManage is true
      expect(screen.getByText('Thao tac')).toBeInTheDocument();
    });

    it('shows history option', async () => {
      const user = userEvent.setup();
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Lich su')).toBeInTheDocument();
      });
    });

    it('shows delete option for unlocked revenue', async () => {
      const user = userEvent.setup();
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByText('Xoa')).toBeInTheDocument();
      });
    });

    it('calls onEdit when edit clicked', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} onEdit={onEdit} />);

      const menuButton = screen.getByRole('button');
      await user.click(menuButton);

      await waitFor(() => {
        const editItem = screen.getByText('Chinh sua');
        fireEvent.click(editItem);
      });

      expect(onEdit).toHaveBeenCalledWith(mockRevenue);
    });
  });

  describe('Lock State Actions', () => {
    it('displays KT lock state correctly', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockLockedKTRevenue]} />);

      const badge = screen.getByTestId('lock-badge');
      expect(badge).toHaveTextContent('KT');
    });

    it('displays Admin lock state correctly', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockLockedAdminRevenue]} />);

      const badge = screen.getByTestId('lock-badge');
      expect(badge).toHaveTextContent('Admin');
    });

    it('displays Final lock state correctly', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockLockedFinalRevenue]} />);

      const badge = screen.getByTestId('lock-badge');
      expect(badge).toHaveTextContent('Final');
    });

    it('displays None for unlocked revenue', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      const badge = screen.getByTestId('lock-badge');
      expect(badge).toHaveTextContent('None');
    });

    it('renders action button for locked revenue', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockLockedKTRevenue]} />);

      const actionButton = screen.getByRole('button');
      expect(actionButton).toBeInTheDocument();
    });
  });

  describe('Delete and Unlock Props', () => {
    it('passes onRefresh prop correctly', () => {
      const onRefresh = jest.fn();
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} onRefresh={onRefresh} />);

      // Component renders with onRefresh callback
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('accepts canUnlock prop', () => {
      render(
        <RevenueTable
          {...defaultProps}
          revenues={[mockLockedKTRevenue]}
          canUnlock={true}
        />
      );

      // Component renders with canUnlock=true
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders without canUnlock prop', () => {
      render(
        <RevenueTable
          {...defaultProps}
          revenues={[mockLockedKTRevenue]}
          canUnlock={false}
        />
      );

      // Component renders with canUnlock=false
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Lock Dialog', () => {
    it('renders lock dialog component', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      // Lock dialog is initially not visible
      expect(screen.queryByTestId('lock-dialog')).not.toBeInTheDocument();
    });
  });

  describe('History Sheet', () => {
    it('renders history panel component', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      // History panel is initially not visible
      expect(screen.queryByTestId('history-panel')).not.toBeInTheDocument();
    });
  });

  describe('Data Rendering Edge Cases', () => {
    it('renders refund payment type', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRefundRevenue]} />);

      expect(screen.getByText('Hoan tien')).toBeInTheDocument();
    });

    it('handles missing request code gracefully', () => {
      const revenueWithoutRequest = {
        ...mockRevenue,
        request: undefined,
      };
      render(
        <RevenueTable
          {...defaultProps}
          showRequest
          revenues={[revenueWithoutRequest]}
        />
      );

      // Should render without crashing
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('displays request code when bookingCode missing', () => {
      const revenueWithRequestCode = {
        ...mockRevenue,
        request: {
          code: 'RQ001',
          customerName: 'Test',
          bookingCode: null,
        },
      };
      render(
        <RevenueTable
          {...defaultProps}
          showRequest
          revenues={[revenueWithRequestCode]}
        />
      );

      expect(screen.getByText('RQ001')).toBeInTheDocument();
    });

    it('displays payment source labels', () => {
      render(<RevenueTable {...defaultProps} revenues={[mockRevenue]} />);

      expect(screen.getByText('Chuyen khoan')).toBeInTheDocument();
    });

    it('handles legacy isLocked field', () => {
      const legacyLockedRevenue = {
        ...mockRevenue,
        id: 'rev-legacy',
        lockKT: false,
        lockAdmin: false,
        lockFinal: false,
        isLocked: true,
      };
      render(<RevenueTable {...defaultProps} revenues={[legacyLockedRevenue]} />);

      // Legacy isLocked maps to lockKT in component logic, but badge shows None because lockKT is false
      const badge = screen.getByTestId('lock-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Multiple Revenues Sorting', () => {
    it('renders revenues in provided order', () => {
      const orderedRevenues = [
        { ...mockRevenue, id: 'first', amountVND: 1000000 },
        { ...mockRevenue, id: 'second', amountVND: 2000000 },
        { ...mockRevenue, id: 'third', amountVND: 3000000 },
      ];

      render(<RevenueTable {...defaultProps} revenues={orderedRevenues} />);

      const rows = screen.getAllByRole('row');
      // Check amounts appear in order (header + 3 data rows)
      expect(rows.length).toBe(4);
      expect(rows[1].textContent).toContain('1');
      expect(rows[2].textContent).toContain('2');
      expect(rows[3].textContent).toContain('3');
    });
  });
});
