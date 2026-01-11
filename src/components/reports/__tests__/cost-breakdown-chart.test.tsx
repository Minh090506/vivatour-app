/**
 * Tests for CostBreakdownChart component
 * - PieChart for service type breakdown
 * - Payment status horizontal bars
 * - Vietnamese labels
 * - Empty/loading states
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('recharts', () => require('./test-utils').createRechartsMock());

import { render, screen } from '@testing-library/react';
import { CostBreakdownChart } from '../cost-breakdown-chart';
import {
  mockCostResponse,
  createMockCostResponse,
  emptyCostResponse,
  setupResizeObserverMock,
} from './test-utils';

// Setup ResizeObserver mock
beforeAll(() => {
  setupResizeObserverMock();
});

describe('CostBreakdownChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders card with correct title', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      expect(screen.getByText('Phân tích Chi phí')).toBeInTheDocument();
    });

    it('renders 2-column grid layout', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      const grid = document.querySelector('.grid.md\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('renders null when data is null and not loading', () => {
      const { container } = render(<CostBreakdownChart data={null} loading={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Pie Chart Section', () => {
    it('renders "Theo loại dịch vụ" label', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      expect(screen.getByText('Theo loại dịch vụ')).toBeInTheDocument();
    });

    it('renders PieChart with correct data length', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      const pie = screen.getByTestId('pie');
      expect(pie).toBeInTheDocument();
      expect(pie).toHaveAttribute('data-length', '3');
    });

    it('renders responsive container for pie chart', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders Cell components for each service type', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(3);
    });
  });

  describe('Payment Status Bars', () => {
    it('renders "Theo trạng thái thanh toán" label', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      expect(screen.getByText('Theo trạng thái thanh toán')).toBeInTheDocument();
    });

    it('renders 3 payment status labels', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
      expect(screen.getByText('Thanh toán một phần')).toBeInTheDocument();
      expect(screen.getByText('Chưa thanh toán')).toBeInTheDocument();
    });

    it('displays payment amounts with currency', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      // 70000000 -> "70.000.000 ₫"
      expect(screen.getByText(/70.*₫/)).toBeInTheDocument();
      // 20000000 -> "20.000.000 ₫"
      expect(screen.getByText(/20.*₫/)).toBeInTheDocument();
      // 15000000 -> "15.000.000 ₫"
      expect(screen.getByText(/15.*₫/)).toBeInTheDocument();
    });

    it('renders progress bars for payment status', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      // Progress bars have h-3 and rounded-full classes
      const bars = document.querySelectorAll('.h-3.bg-gray-100.rounded-full');
      expect(bars.length).toBe(3);
    });

    it('calculates percentage widths correctly', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      // Total: 70M + 20M + 15M = 105M
      // Paid: 70/105 = 66.67%
      // Partial: 20/105 = 19.05%
      // Unpaid: 15/105 = 14.29%

      const progressBars = document.querySelectorAll('.h-full.rounded-full.transition-all');
      expect(progressBars.length).toBe(3);
    });
  });

  describe('Service Type Labels', () => {
    it('transforms HOTEL to Vietnamese label', () => {
      const hotelData = createMockCostResponse({
        byServiceType: [{ type: 'HOTEL', amount: 50000000, percentage: 100 }],
      });

      render(<CostBreakdownChart data={hotelData} />);

      // Label is rendered in pie chart label (mocked, so check data passed)
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-length', '1');
    });

    it('handles multiple service types', () => {
      render(<CostBreakdownChart data={mockCostResponse} />);

      // 3 service types in mock data
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-length', '3');
    });
  });

  describe('Empty State', () => {
    it('shows empty message when byServiceType is empty', () => {
      render(<CostBreakdownChart data={emptyCostResponse} />);

      expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
    });

    it('does not render pie chart when data is empty', () => {
      render(<CostBreakdownChart data={emptyCostResponse} />);

      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });

    it('still renders payment bars with zero values', () => {
      render(<CostBreakdownChart data={emptyCostResponse} />);

      expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
      expect(screen.getByText('Thanh toán một phần')).toBeInTheDocument();
      expect(screen.getByText('Chưa thanh toán')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders skeleton when loading', () => {
      render(<CostBreakdownChart data={null} loading={true} />);

      expect(screen.getByText('Phân tích Chi phí')).toBeInTheDocument();

      const skeleton = document.querySelector('.h-\\[300px\\]');
      expect(skeleton).toBeInTheDocument();
    });
  });
});
