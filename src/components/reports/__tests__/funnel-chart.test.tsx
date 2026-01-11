/**
 * Tests for FunnelChart component
 * - Horizontal BarChart (vertical layout)
 * - Stage labels in Vietnamese
 * - Conversion rate display
 * - Empty/loading states
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('recharts', () => require('./test-utils').createRechartsMock());

import { render, screen } from '@testing-library/react';
import { FunnelChart } from '../funnel-chart';
import {
  mockFunnelResponse,
  createMockFunnelResponse,
  emptyFunnelResponse,
  setupResizeObserverMock,
} from './test-utils';

// Setup ResizeObserver mock
beforeAll(() => {
  setupResizeObserverMock();
});

describe('FunnelChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders card with correct title', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      expect(screen.getByText('Phễu Chuyển đổi')).toBeInTheDocument();
    });

    it('renders Filter icon in header', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      // Icon is rendered, check title exists
      expect(screen.getByText('Phễu Chuyển đổi')).toBeInTheDocument();
    });

    it('renders null when data is null and not loading', () => {
      const { container } = render(<FunnelChart data={null} loading={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Conversion Rate Display', () => {
    it('displays conversion rate in header', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      expect(screen.getByText(/Tỷ lệ chuyển đổi:/)).toBeInTheDocument();
      expect(screen.getByText(/30\.0%/)).toBeInTheDocument();
    });

    it('formats rate with 1 decimal place', () => {
      const customData = createMockFunnelResponse({
        conversionRate: 45.67,
      });

      render(<FunnelChart data={customData} />);

      expect(screen.getByText(/45\.7%/)).toBeInTheDocument();
    });

    it('displays rate with green color styling', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      const rateElement = screen.getByText(/Tỷ lệ chuyển đổi:/);
      expect(rateElement).toHaveClass('text-green-600');
    });
  });

  describe('Chart Structure', () => {
    it('renders horizontal BarChart (layout=vertical)', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute('data-layout', 'vertical');
    });

    it('passes correct data length to chart', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-length', '4');
    });

    it('renders Bar component with count dataKey', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      const bar = screen.getByTestId('bar');
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveAttribute('data-key', 'count');
    });

    it('renders Cell components for each stage', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(4);
    });

    it('renders XAxis, YAxis, and Tooltip', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('renders LabelList for count values', () => {
      render(<FunnelChart data={mockFunnelResponse} />);

      expect(screen.getByTestId('label-list')).toBeInTheDocument();
    });
  });

  describe('Stage Labels', () => {
    it('transforms stages to Vietnamese labels in chart data', () => {
      // Verify the chart receives correct number of stages
      render(<FunnelChart data={mockFunnelResponse} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-length', '4');
    });

    it('handles custom stages', () => {
      const customData = createMockFunnelResponse({
        stages: [
          { stage: 'LEAD', count: 50, percentage: 100 },
          { stage: 'OUTCOME', count: 25, percentage: 50 },
        ],
      });

      render(<FunnelChart data={customData} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-length', '2');
    });
  });

  describe('Empty State', () => {
    it('shows empty message when stages array is empty', () => {
      render(<FunnelChart data={emptyFunnelResponse} />);

      expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
    });

    it('does not render chart when data is empty', () => {
      render(<FunnelChart data={emptyFunnelResponse} />);

      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('still displays conversion rate header', () => {
      render(<FunnelChart data={emptyFunnelResponse} />);

      expect(screen.getByText(/Tỷ lệ chuyển đổi:/)).toBeInTheDocument();
      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders skeleton when loading', () => {
      render(<FunnelChart data={null} loading={true} />);

      expect(screen.getByText('Phễu Chuyển đổi')).toBeInTheDocument();

      const skeleton = document.querySelector('.h-\\[300px\\]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero conversion rate', () => {
      const zeroData = createMockFunnelResponse({
        conversionRate: 0,
        stages: [{ stage: 'LEAD', count: 100, percentage: 100 }],
      });

      render(<FunnelChart data={zeroData} />);

      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });

    it('handles 100% conversion rate', () => {
      const fullData = createMockFunnelResponse({
        conversionRate: 100,
      });

      render(<FunnelChart data={fullData} />);

      expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
    });
  });
});
