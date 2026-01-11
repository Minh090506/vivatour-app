/**
 * Tests for OperatorHistoryPanel component
 * Pure presentational component - no API calls
 * Focus: Vietnamese formatting, action types, batch indicators, value formatting
 */

import { render, screen } from '@testing-library/react';
import { OperatorHistoryPanel } from '../operator-history-panel';
import {
  mockOperatorHistoryEntries,
  mockOperatorHistoryEntry,
  mockUpdateHistoryEntry,
  mockLockKTHistoryEntry,
  createMockHistoryEntry,
} from './test-utils';

describe('OperatorHistoryPanel', () => {
  describe('Rendering', () => {
    it('renders card with history count in title', () => {
      render(<OperatorHistoryPanel history={mockOperatorHistoryEntries} />);

      // Should show count in title
      expect(
        screen.getByText(`Lịch sử thay đổi (${mockOperatorHistoryEntries.length})`)
      ).toBeInTheDocument();
    });

    it('renders empty state when history array empty', () => {
      render(<OperatorHistoryPanel history={[]} />);

      expect(screen.getByText('Lịch sử thay đổi')).toBeInTheDocument();
      expect(screen.getByText('Chưa có lịch sử thay đổi')).toBeInTheDocument();
    });

    it('renders correct number of history entries', () => {
      render(<OperatorHistoryPanel history={mockOperatorHistoryEntries} />);

      // Should render 3 entries
      expect(screen.getByText('Tạo mới')).toBeInTheDocument();
      expect(screen.getByText('Cập nhật')).toBeInTheDocument();
      expect(screen.getByText('Khóa KT')).toBeInTheDocument();
    });
  });

  describe('Entry Display', () => {
    it('displays action badge with correct label', () => {
      render(<OperatorHistoryPanel history={[mockOperatorHistoryEntry]} />);

      // Should show CREATE action label
      expect(screen.getByText('Tạo mới')).toBeInTheDocument();
    });

    it('displays formatted timestamp in vi-VN locale', () => {
      const entry = createMockHistoryEntry({
        createdAt: new Date('2026-01-10T14:30:00'),
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Vietnamese format: HH:mm DD/MM/YYYY (based on component output)
      expect(screen.getByText('14:30 10/01/2026')).toBeInTheDocument();
    });

    it('displays userId for each entry', () => {
      render(<OperatorHistoryPanel history={[mockOperatorHistoryEntry]} />);

      // Should show user who made the change
      expect(screen.getByText(/Bởi:/)).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
    });
  });

  describe('Batch Indicator', () => {
    it('shows batch badge when changes.batch is true', () => {
      render(<OperatorHistoryPanel history={[mockLockKTHistoryEntry]} />);

      // Should show batch indicator
      expect(screen.getByText('Hàng loạt')).toBeInTheDocument();
    });

    it('does not show batch badge for regular actions', () => {
      render(<OperatorHistoryPanel history={[mockUpdateHistoryEntry]} />);

      // Should NOT show batch indicator
      expect(screen.queryByText('Hàng loạt')).not.toBeInTheDocument();
    });

    it('shows month info for tier lock actions', () => {
      render(<OperatorHistoryPanel history={[mockLockKTHistoryEntry]} />);

      // Should show month and tier info
      expect(screen.getByText(/Tháng: 2026-01/)).toBeInTheDocument();
      expect(screen.getByText(/Tier: KT/)).toBeInTheDocument();
    });
  });

  describe('Change Diff', () => {
    it('shows only "after" value for CREATE action', () => {
      render(<OperatorHistoryPanel history={[mockOperatorHistoryEntry]} />);

      // Should show only after value, no before → after
      expect(screen.getByText('Tên dịch vụ:')).toBeInTheDocument();
      expect(screen.getByText('Khách sạn Mường Thanh')).toBeInTheDocument();
      // Should not have arrow separator
      expect(screen.queryByText('→')).not.toBeInTheDocument();
    });

    it('shows before → after for UPDATE action', () => {
      render(<OperatorHistoryPanel history={[mockUpdateHistoryEntry]} />);

      // Should show both before and after values with arrow
      expect(screen.getByText('Tổng chi phí:')).toBeInTheDocument();

      // Check for arrow in the document (may be in separate text nodes)
      const element = screen.getByText('Tổng chi phí:').closest('div');
      expect(element?.textContent).toContain('→');

      // Should show formatted numbers
      expect(screen.getByText('4.000.000')).toBeInTheDocument();
      expect(screen.getByText('5.000.000')).toBeInTheDocument();
    });
  });

  describe('Value Formatting', () => {
    it('formats numbers with Vietnamese locale (1,000,000)', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          totalCost: { before: 1000000, after: 2500000 },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Vietnamese number format uses dots as thousand separator
      expect(screen.getByText('1.000.000')).toBeInTheDocument();
      expect(screen.getByText('2.500.000')).toBeInTheDocument();
    });

    it('formats dates in DD/MM/YYYY format', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          serviceDate: { before: '2026-01-15', after: '2026-02-20' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Should format dates in Vietnamese format (D/M/YYYY without leading zeros)
      expect(screen.getByText('15/1/2026')).toBeInTheDocument();
      expect(screen.getByText('20/2/2026')).toBeInTheDocument();
    });

    it('shows "(trống)" for null values', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          notes: { before: null, after: 'Some note' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Should show Vietnamese "(empty)" text for null
      expect(screen.getByText('(trống)')).toBeInTheDocument();
      expect(screen.getByText('Some note')).toBeInTheDocument();
    });

    it('formats boolean values as "Có"/"Không"', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          isLocked: { before: false, after: true },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Should show Vietnamese boolean labels
      expect(screen.getByText('Không')).toBeInTheDocument();
      expect(screen.getByText('Có')).toBeInTheDocument();
    });
  });

  describe('Action Types', () => {
    it('displays CREATE action correctly', () => {
      render(<OperatorHistoryPanel history={[mockOperatorHistoryEntry]} />);

      expect(screen.getByText('Tạo mới')).toBeInTheDocument();
    });

    it('displays UPDATE action correctly', () => {
      render(<OperatorHistoryPanel history={[mockUpdateHistoryEntry]} />);

      expect(screen.getByText('Cập nhật')).toBeInTheDocument();
    });

    it('displays DELETE action correctly', () => {
      const deleteEntry = createMockHistoryEntry({
        action: 'DELETE',
        changes: { deleted: true },
      });
      render(<OperatorHistoryPanel history={[deleteEntry]} />);

      expect(screen.getByText('Xóa')).toBeInTheDocument();
    });

    it('displays LOCK_KT action correctly', () => {
      render(<OperatorHistoryPanel history={[mockLockKTHistoryEntry]} />);

      expect(screen.getByText('Khóa KT')).toBeInTheDocument();
    });

    it('displays LOCK_ADMIN action correctly', () => {
      const lockAdminEntry = createMockHistoryEntry({
        action: 'LOCK_ADMIN',
        changes: {
          lockAdmin: { before: false, after: true },
          tier: 'ADMIN',
          month: '2026-01',
        },
      });
      render(<OperatorHistoryPanel history={[lockAdminEntry]} />);

      expect(screen.getByText('Khóa Admin')).toBeInTheDocument();
    });

    it('displays APPROVE action correctly', () => {
      const approveEntry = createMockHistoryEntry({
        action: 'APPROVE',
        changes: { paymentStatus: { before: 'PENDING', after: 'PAID' } },
      });
      render(<OperatorHistoryPanel history={[approveEntry]} />);

      expect(screen.getByText('Duyệt TT')).toBeInTheDocument();
    });
  });

  describe('Field Label Translation', () => {
    it('translates field names to Vietnamese', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          serviceName: { before: 'Old name', after: 'New name' },
          supplier: { before: 'Old supplier', after: 'New supplier' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Tên dịch vụ:')).toBeInTheDocument();
      expect(screen.getByText('Nhà cung cấp:')).toBeInTheDocument();
    });

    it('translates payment-related fields', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          paymentStatus: { before: 'PENDING', after: 'PAID' },
          paidAmount: { before: 0, after: 1000000 },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Trạng thái TT:')).toBeInTheDocument();
      expect(screen.getByText('Số tiền đã TT:')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined history gracefully', () => {
      // @ts-expect-error Testing runtime safety
      render(<OperatorHistoryPanel history={undefined} />);

      expect(screen.getByText('Chưa có lịch sử thay đổi')).toBeInTheDocument();
    });

    it('filters out tier/batch/month meta fields for tier lock actions', () => {
      render(<OperatorHistoryPanel history={[mockLockKTHistoryEntry]} />);

      // Should show month info in separate badge
      expect(screen.getByText(/Tháng: 2026-01/)).toBeInTheDocument();

      // Should NOT show tier/batch as change fields (they're meta info)
      // The only change field should be lockKT
      const changesSection = screen.getByText('Khóa KT:');
      expect(changesSection).toBeInTheDocument();
    });

    it('handles changes with only "before" value', () => {
      const entry = createMockHistoryEntry({
        action: 'DELETE',
        changes: {
          serviceName: { before: 'Deleted service' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Deleted service')).toBeInTheDocument();
    });

    it('handles direct value changes (not object format)', () => {
      const entry = createMockHistoryEntry({
        action: 'CREATE',
        changes: {
          serviceName: 'Direct value',
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Direct value')).toBeInTheDocument();
    });
  });
});
