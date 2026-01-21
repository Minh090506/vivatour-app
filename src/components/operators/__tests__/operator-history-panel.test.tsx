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

    it('handles empty changes object', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {},
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Should still render the entry without crashing
      expect(screen.getByText('Cập nhật')).toBeInTheDocument();
    });

    it('handles object values in changes', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          customField: { nested: 'value' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Should JSON stringify the object
      expect(screen.getByText(/nested/)).toBeInTheDocument();
    });
  });

  describe('All Action Types', () => {
    it('displays UNLOCK_KT action correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'UNLOCK_KT',
        changes: {
          lockKT: { before: true, after: false },
          tier: 'KT',
          month: '2026-01',
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Mở khóa KT')).toBeInTheDocument();
    });

    it('displays UNLOCK_ADMIN action correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'UNLOCK_ADMIN',
        changes: {
          lockAdmin: { before: true, after: false },
          tier: 'ADMIN',
          month: '2026-01',
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Mở khóa Admin')).toBeInTheDocument();
    });

    it('displays LOCK_FINAL action correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'LOCK_FINAL',
        changes: {
          lockFinal: { before: false, after: true },
          tier: 'FINAL',
          month: '2026-01',
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Khóa Cuối')).toBeInTheDocument();
    });

    it('displays UNLOCK_FINAL action correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'UNLOCK_FINAL',
        changes: {
          lockFinal: { before: true, after: false },
          tier: 'FINAL',
          month: '2026-01',
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Mở khóa Cuối')).toBeInTheDocument();
    });

    it('displays legacy LOCK action correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'LOCK',
        changes: {
          isLocked: { before: false, after: true },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Khóa')).toBeInTheDocument();
    });

    it('displays legacy UNLOCK action correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'UNLOCK',
        changes: {
          isLocked: { before: true, after: false },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Mở khóa')).toBeInTheDocument();
    });

    it('handles unknown action gracefully', () => {
      const entry = createMockHistoryEntry({
        action: 'UNKNOWN_ACTION' as 'CREATE',
        changes: {
          someField: 'value',
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      // Should show the action name as-is
      expect(screen.getByText('UNKNOWN_ACTION')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('applies green border for CREATE action', () => {
      render(<OperatorHistoryPanel history={[mockOperatorHistoryEntry]} />);

      // Find badge with green styling
      const badge = screen.getByText('Tạo mới').closest('[class*="border-green"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies blue border for UPDATE action', () => {
      render(<OperatorHistoryPanel history={[mockUpdateHistoryEntry]} />);

      // Find badge with blue styling
      const badge = screen.getByText('Cập nhật').closest('[class*="border-blue"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies red border for DELETE action', () => {
      const deleteEntry = createMockHistoryEntry({
        action: 'DELETE',
        changes: { deleted: true },
      });
      render(<OperatorHistoryPanel history={[deleteEntry]} />);

      // Find badge with red styling
      const badge = screen.getByText('Xóa').closest('[class*="border-red"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies amber border for LOCK_KT action', () => {
      render(<OperatorHistoryPanel history={[mockLockKTHistoryEntry]} />);

      // Find badge with amber styling
      const badge = screen.getByText('Khóa KT').closest('[class*="border-amber"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies emerald border for APPROVE action', () => {
      const approveEntry = createMockHistoryEntry({
        action: 'APPROVE',
        changes: { paymentStatus: { before: 'PENDING', after: 'PAID' } },
      });
      render(<OperatorHistoryPanel history={[approveEntry]} />);

      // Find badge with emerald styling
      const badge = screen.getByText('Duyệt TT').closest('[class*="border-emerald"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Tier Lock Field Labels', () => {
    it('translates 3-tier lock field names correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          lockKT: { before: false, after: true },
          lockKTAt: { before: null, after: '2026-01-15T10:00:00' },
          lockKTBy: { before: null, after: 'admin' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Khóa KT:')).toBeInTheDocument();
      expect(screen.getByText('Ngày khóa KT:')).toBeInTheDocument();
      expect(screen.getByText('Người khóa KT:')).toBeInTheDocument();
    });

    it('translates lockAdmin field names correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          lockAdmin: { before: false, after: true },
          lockAdminAt: { before: null, after: '2026-01-16T10:00:00' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Khóa Admin:')).toBeInTheDocument();
      expect(screen.getByText('Ngày khóa Admin:')).toBeInTheDocument();
    });

    it('translates lockFinal field names correctly', () => {
      const entry = createMockHistoryEntry({
        action: 'UPDATE',
        changes: {
          lockFinal: { before: false, after: true },
          lockFinalAt: { before: null, after: '2026-01-17T10:00:00' },
        },
      });
      render(<OperatorHistoryPanel history={[entry]} />);

      expect(screen.getByText('Khóa Cuối:')).toBeInTheDocument();
      expect(screen.getByText('Ngày khóa Cuối:')).toBeInTheDocument();
    });
  });

  describe('Scroll Area', () => {
    it('renders scroll area when history has entries', () => {
      const { container } = render(
        <OperatorHistoryPanel history={mockOperatorHistoryEntries} />
      );

      // ScrollArea should be present
      const scrollArea = container.querySelector('[data-radix-scroll-area-viewport]');
      expect(scrollArea).toBeInTheDocument();
    });
  });

  describe('Timeline Visual Elements', () => {
    it('renders timeline dots for each entry', () => {
      const { container } = render(
        <OperatorHistoryPanel history={mockOperatorHistoryEntries} />
      );

      // Timeline dots should match entry count
      const timelineDots = container.querySelectorAll('.rounded-full.bg-muted');
      expect(timelineDots.length).toBe(mockOperatorHistoryEntries.length);
    });

    it('renders left border for timeline', () => {
      const { container } = render(
        <OperatorHistoryPanel history={mockOperatorHistoryEntries} />
      );

      // Timeline line (border-l-2)
      const timelineLines = container.querySelectorAll('.border-l-2');
      expect(timelineLines.length).toBe(mockOperatorHistoryEntries.length);
    });
  });
});
