/**
 * Tests for KPICards component
 * - Renders 5 KPI cards with correct labels
 * - Formats numbers with locale (Vietnamese)
 * - Shows trend indicators (up/down badges)
 * - Loading skeleton state
 */

import { render, screen } from '@testing-library/react';
import { KPICards } from '../kpi-cards';
import {
  mockDashboardResponse,
  createMockDashboardResponse,
} from './test-utils';

describe('KPICards', () => {
  describe('Rendering', () => {
    it('renders 5 KPI cards with correct labels', () => {
      render(<KPICards data={mockDashboardResponse} />);

      expect(screen.getByText('Tổng Booking')).toBeInTheDocument();
      expect(screen.getByText('Tổng Doanh thu')).toBeInTheDocument();
      expect(screen.getByText('Tổng Lợi nhuận')).toBeInTheDocument();
      expect(screen.getByText('Yêu cầu đang xử lý')).toBeInTheDocument();
      expect(screen.getByText('Tỷ lệ chuyển đổi')).toBeInTheDocument();
    });

    it('renders null when data is null and not loading', () => {
      const { container } = render(<KPICards data={null} loading={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('applies grid layout classes', () => {
      const { container } = render(<KPICards data={mockDashboardResponse} />);
      expect(container.firstChild).toHaveClass('grid', 'grid-cols-2');
    });

    it('renders all 5 cards as Card components', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // Each label appears once (5 unique labels)
      const cards = screen.getAllByText(/Tổng|Yêu cầu|Tỷ lệ/);
      expect(cards).toHaveLength(5);
    });
  });

  describe('Value Formatting', () => {
    it('formats booking count with Vietnamese locale', () => {
      render(
        <KPICards
          data={createMockDashboardResponse({
            kpiCards: { ...mockDashboardResponse.kpiCards, totalBookings: 1234 },
          })}
        />
      );

      // Vietnamese locale uses dots: 1.234
      expect(screen.getByText('1.234')).toBeInTheDocument();
    });

    it('formats revenue with currency symbol', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // 150000000 -> "150.000.000 ₫" (formatted)
      expect(screen.getByText(/150.*₫/)).toBeInTheDocument();
    });

    it('formats profit with currency symbol', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // 45000000 -> "45.000.000 ₫" (formatted)
      expect(screen.getByText(/45.*₫/)).toBeInTheDocument();
    });

    it('formats active requests with locale', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // 15 -> "15"
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('formats conversion rate as percentage', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // 28.5 -> "28.5%"
      expect(screen.getByText('28.5%')).toBeInTheDocument();
    });
  });

  describe('Trend Badges', () => {
    it('shows positive trend badge for bookings increase', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // +10.5%
      expect(screen.getByText(/\+10\.5%/)).toBeInTheDocument();
    });

    it('shows positive trend badge for revenue increase', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // +25.0%
      expect(screen.getByText(/\+25\.0%/)).toBeInTheDocument();
    });

    it('shows negative trend badge for decrease', () => {
      const negativeData = createMockDashboardResponse({
        comparison: {
          bookings: { current: 30, previous: 40, changePercent: -25 },
          revenue: { current: 100000000, previous: 150000000, changePercent: -33.3 },
        },
      });

      render(<KPICards data={negativeData} />);

      expect(screen.getByText(/-25\.0%/)).toBeInTheDocument();
      expect(screen.getByText(/-33\.3%/)).toBeInTheDocument();
    });

    it('renders exactly 2 trend badges (bookings + revenue)', () => {
      render(<KPICards data={mockDashboardResponse} />);

      // Only bookings and revenue have comparison data with +/- prefix
      const trendBadges = screen.getAllByText(/[+-]\d+\.\d+%/);
      expect(trendBadges).toHaveLength(2);
    });
  });

  describe('Loading State', () => {
    it('renders skeleton cards when loading', () => {
      render(<KPICards data={null} loading={true} />);

      // Grid container should exist
      const grid = document.querySelector('.grid');
      expect(grid).toBeInTheDocument();

      // Should have 5 Card elements with Skeletons
      const cards = grid?.querySelectorAll('.p-4');
      expect(cards?.length).toBe(5);
    });

    it('renders loading state even with data when loading=true', () => {
      render(<KPICards data={mockDashboardResponse} loading={true} />);

      // Should show skeleton, not actual data
      expect(screen.queryByText('Tổng Booking')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values correctly', () => {
      const zeroData = createMockDashboardResponse({
        kpiCards: {
          totalBookings: 0,
          totalRevenue: 0,
          totalProfit: 0,
          activeRequests: 0,
          conversionRate: 0,
        },
        comparison: {
          bookings: { current: 0, previous: 0, changePercent: 0 },
          revenue: { current: 0, previous: 0, changePercent: 0 },
        },
      });

      render(<KPICards data={zeroData} />);

      // Should render "0" values
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });

    it('handles large numbers with locale formatting', () => {
      const largeData = createMockDashboardResponse({
        kpiCards: {
          ...mockDashboardResponse.kpiCards,
          totalRevenue: 1234567890,
        },
      });

      render(<KPICards data={largeData} />);

      // Vietnamese format with dots
      expect(screen.getByText(/1\.234\.567\.890.*₫/)).toBeInTheDocument();
    });
  });
});
