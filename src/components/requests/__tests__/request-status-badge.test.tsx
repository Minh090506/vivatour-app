/**
 * Tests for RequestStatusBadge component
 * Covers: status rendering, stage display, color mapping
 */

import { render, screen } from '@testing-library/react';
import { RequestStatusBadge } from '../request-status-badge';
import type { RequestStatus } from '@/types';

describe('RequestStatusBadge', () => {
  // ============================================
  // STATUS RENDERING
  // ============================================

  describe('Status Rendering', () => {
    it('renders badge for valid status DANG_LL_CHUA_TL', () => {
      render(<RequestStatusBadge status="DANG_LL_CHUA_TL" />);

      // Actual label from config
      expect(screen.getByText('Đang LL - chưa trả lời')).toBeInTheDocument();
    });

    it('renders badge for BOOKING status', () => {
      render(<RequestStatusBadge status="BOOKING" />);

      expect(screen.getByText('Booking')).toBeInTheDocument();
    });

    it('renders badge for DA_BAO_GIA status', () => {
      render(<RequestStatusBadge status="DA_BAO_GIA" />);

      expect(screen.getByText('Đã báo giá')).toBeInTheDocument();
    });

    it('renders fallback badge for unknown status', () => {
      // @ts-expect-error - Testing invalid status
      render(<RequestStatusBadge status="UNKNOWN_STATUS" />);

      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
    });

    it('renders badge with correct text for F1 status', () => {
      render(<RequestStatusBadge status="F1" />);

      expect(screen.getByText('Follow-up 1')).toBeInTheDocument();
    });

    it('renders badge for CANCEL status', () => {
      render(<RequestStatusBadge status="CANCEL" />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  // ============================================
  // STAGE DISPLAY
  // ============================================

  describe('Stage Display', () => {
    it('hides stage label when showStage is false', () => {
      render(<RequestStatusBadge status="DANG_LL_CHUA_TL" showStage={false} />);

      // Should not show LEAD stage label
      expect(screen.queryByText('Lead:')).not.toBeInTheDocument();
    });

    it('shows stage label when showStage is true', () => {
      render(<RequestStatusBadge status="DANG_LL_CHUA_TL" showStage={true} />);

      // Should show LEAD stage label (from config: 'Lead')
      expect(screen.getByText('Lead:')).toBeInTheDocument();
    });

    it('shows QUOTE stage label for DA_BAO_GIA status', () => {
      render(<RequestStatusBadge status="DA_BAO_GIA" showStage={true} />);

      expect(screen.getByText('Báo giá:')).toBeInTheDocument();
    });

    it('shows FOLLOWUP stage label for F1 status', () => {
      render(<RequestStatusBadge status="F1" showStage={true} />);

      // From config: 'Follow-up'
      expect(screen.getByText('Follow-up:')).toBeInTheDocument();
    });

    it('shows OUTCOME stage label for BOOKING status', () => {
      render(<RequestStatusBadge status="BOOKING" showStage={true} />);

      // From config: 'Kết quả'
      expect(screen.getByText('Kết quả:')).toBeInTheDocument();
    });
  });

  // ============================================
  // COLOR MAPPING
  // ============================================

  describe('Color Mapping', () => {
    it('applies blue color class for LEAD stage statuses', () => {
      const { container } = render(<RequestStatusBadge status="DANG_LL_CHUA_TL" />);

      // Badge should have blue-related classes
      const badge = container.querySelector('[class*="bg-blue"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies green color class for BOOKING status', () => {
      const { container } = render(<RequestStatusBadge status="BOOKING" />);

      const badge = container.querySelector('[class*="bg-green"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies red color class for CANCEL status', () => {
      const { container } = render(<RequestStatusBadge status="CANCEL" />);

      const badge = container.querySelector('[class*="bg-red"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies purple color class for QUOTE stage statuses', () => {
      const { container } = render(<RequestStatusBadge status="DA_BAO_GIA" />);

      const badge = container.querySelector('[class*="bg-purple"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies orange color class for FOLLOWUP stage statuses', () => {
      const { container } = render(<RequestStatusBadge status="F1" />);

      const badge = container.querySelector('[class*="bg-orange"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies gray fallback for unknown status', () => {
      // @ts-expect-error - Testing invalid status
      const { container } = render(<RequestStatusBadge status="INVALID" />);

      const badge = container.querySelector('[class*="bg-gray"]');
      expect(badge).toBeInTheDocument();
    });
  });

  // ============================================
  // STAGE COLOR CLASSES
  // ============================================

  describe('Stage Color Classes', () => {
    it('applies blue stage color for LEAD stage', () => {
      const { container } = render(<RequestStatusBadge status="DANG_LL_CHUA_TL" showStage={true} />);

      const stageLabel = container.querySelector('[class*="text-blue"]');
      expect(stageLabel).toBeInTheDocument();
    });

    it('applies gray stage color for OUTCOME stage', () => {
      const { container } = render(<RequestStatusBadge status="BOOKING" showStage={true} />);

      // OUTCOME stage has gray color per config
      const stageLabel = container.querySelector('[class*="text-gray"]');
      expect(stageLabel).toBeInTheDocument();
    });
  });

  // ============================================
  // ALL STATUS TYPES (from actual config)
  // ============================================

  describe('All Status Types', () => {
    const allStatuses: RequestStatus[] = [
      'DANG_LL_CHUA_TL',
      'DANG_LL_DA_TL',
      'DA_BAO_GIA',
      'DANG_XAY_TOUR',
      'F1',
      'F2',
      'F3',
      'F4',
      'BOOKING',
      'KHACH_HOAN',
      'KHACH_SUY_NGHI',
      'KHONG_DU_TC',
      'DA_KET_THUC',
      'CANCEL',
    ];

    it.each(allStatuses)('renders badge for status %s without error', (status) => {
      expect(() => {
        render(<RequestStatusBadge status={status} />);
      }).not.toThrow();
    });

    it.each(allStatuses)('renders badge with showStage for status %s', (status) => {
      expect(() => {
        render(<RequestStatusBadge status={status} showStage={true} />);
      }).not.toThrow();
    });
  });
});
