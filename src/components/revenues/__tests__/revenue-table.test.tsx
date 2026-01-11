/**
 * Tests for RevenueTable component
 * Tests rendering, row display, permissions, lock states
 */

import { render, screen } from '@testing-library/react';
import { RevenueTable } from '../revenue-table';
import {
  mockRevenue,
  mockForeignRevenue,
  mockLockedKTRevenue,
  mockLockedFinalRevenue,
  mockRevenues,
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
});
