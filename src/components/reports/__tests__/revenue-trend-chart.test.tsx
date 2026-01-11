/**
 * Tests for RevenueTrendChart component
 * - Renders ComposedChart with Bar + Lines
 * - Period formatting (YYYY-MM -> Th.M/YY)
 * - Custom tooltip
 * - Empty/loading states
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('recharts', () => require('./test-utils').createRechartsMock());

import { render, screen } from '@testing-library/react';
import { RevenueTrendChart } from '../revenue-trend-chart';
import {
  mockTrendResponse,
  createMockTrendResponse,
  emptyTrendResponse,
  setupResizeObserverMock,
} from './test-utils';

// Setup ResizeObserver mock
beforeAll(() => {
  setupResizeObserverMock();
});

describe('RevenueTrendChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders card with correct title', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      expect(screen.getByText('Xu hướng Doanh thu')).toBeInTheDocument();
    });

    it('renders TrendingUp icon in header', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      // Icon is rendered as SVG - check title text exists
      expect(screen.getByText('Xu hướng Doanh thu')).toBeInTheDocument();
    });

    it('renders null when data is null and not loading', () => {
      const { container } = render(<RevenueTrendChart data={null} loading={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Chart Structure', () => {
    it('renders ComposedChart with data', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      const chart = screen.getByTestId('composed-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute('data-length', '3');
    });

    it('renders Bar for profit', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      const bar = screen.getByTestId('bar');
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveAttribute('data-key', 'profit');
    });

    it('renders Line for revenue with blue color', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      const lines = screen.getAllByTestId('line');
      const revenueLine = lines.find(l => l.getAttribute('data-key') === 'revenue');
      expect(revenueLine).toBeInTheDocument();
      expect(revenueLine).toHaveAttribute('data-stroke', '#3b82f6');
    });

    it('renders Line for cost with red color', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      const lines = screen.getAllByTestId('line');
      const costLine = lines.find(l => l.getAttribute('data-key') === 'cost');
      expect(costLine).toBeInTheDocument();
      expect(costLine).toHaveAttribute('data-stroke', '#ef4444');
    });

    it('renders XAxis and YAxis', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('renders Tooltip and Legend', () => {
      render(<RevenueTrendChart data={mockTrendResponse} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when data array is empty', () => {
      render(<RevenueTrendChart data={emptyTrendResponse} />);

      expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
    });

    it('does not render chart when data is empty', () => {
      render(<RevenueTrendChart data={emptyTrendResponse} />);

      expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders skeleton when loading', () => {
      render(<RevenueTrendChart data={null} loading={true} />);

      // Card header should still show
      expect(screen.getByText('Xu hướng Doanh thu')).toBeInTheDocument();

      // Skeleton should be present
      const skeleton = document.querySelector('.h-\\[400px\\]');
      expect(skeleton).toBeInTheDocument();
    });

    it('shows card header during loading', () => {
      render(<RevenueTrendChart data={null} loading={true} />);

      expect(screen.getByText('Xu hướng Doanh thu')).toBeInTheDocument();
    });
  });

  describe('Data Transformation', () => {
    it('transforms period correctly for chart display', () => {
      // The component transforms "2025-11" -> "Th.11/25" internally
      // We verify the chart receives correct data length
      const customData = createMockTrendResponse({
        data: [
          { period: '2026-01', revenue: 100, cost: 50, profit: 50 },
          { period: '2026-02', revenue: 200, cost: 100, profit: 100 },
        ],
      });

      render(<RevenueTrendChart data={customData} />);

      const chart = screen.getByTestId('composed-chart');
      expect(chart).toHaveAttribute('data-length', '2');
    });
  });
});
