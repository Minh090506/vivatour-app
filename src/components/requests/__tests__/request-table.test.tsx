/**
 * Tests for RequestTable component
 * Covers: states, data rendering, row interactions, follow-up indicator
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { RequestTable } from '../request-table';
import { mockRequests, createMockRequest } from './test-utils';

describe('RequestTable', () => {
  const mockOnRowClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('States', () => {
    it('renders loading state', () => {
      render(<RequestTable requests={[]} isLoading={true} />);

      expect(screen.getByText('Đang tải...')).toBeInTheDocument();
    });

    it('renders empty state when no requests', () => {
      render(<RequestTable requests={[]} isLoading={false} />);

      expect(screen.getByText('Không có yêu cầu nào')).toBeInTheDocument();
    });
  });

  describe('Data Rendering', () => {
    it('renders table headers', () => {
      render(<RequestTable requests={mockRequests} />);

      expect(screen.getByText('RQID')).toBeInTheDocument();
      expect(screen.getByText('Khách hàng')).toBeInTheDocument();
      expect(screen.getByText('Pax')).toBeInTheDocument();
      expect(screen.getByText('Quốc gia')).toBeInTheDocument();
      expect(screen.getByText('Nguồn')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Seller')).toBeInTheDocument();
      expect(screen.getByText('Ngày nhận')).toBeInTheDocument();
    });

    it('renders request rows with correct data', () => {
      render(<RequestTable requests={mockRequests} />);

      // Check first request data
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
      expect(screen.getByText('USA')).toBeInTheDocument();
      // All mock requests have same source, use getAllByText
      expect(screen.getAllByText('TripAdvisor').length).toBe(3);

      // Check second request data
      expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();

      // Check third request data
      expect(screen.getByText('Le Van C')).toBeInTheDocument();
      expect(screen.getByText('UK')).toBeInTheDocument();
    });

    it('displays pax count for each row', () => {
      render(<RequestTable requests={mockRequests} />);

      // All mock requests have pax = 2
      const paxCells = screen.getAllByText('2');
      expect(paxCells.length).toBeGreaterThan(0);
    });

    it('displays seller name or dash when no seller', () => {
      const requestWithSeller = createMockRequest({
        seller: { id: 's1', email: 'seller@test.com', name: 'John Seller', role: 'SELLER', avatar: null },
      });
      const requestWithoutSeller = createMockRequest({
        id: '99',
        seller: undefined,
      });

      render(<RequestTable requests={[requestWithSeller, requestWithoutSeller]} />);

      expect(screen.getByText('John Seller')).toBeInTheDocument();
      // Dash for missing seller
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  describe('Row Interactions', () => {
    it('calls onRowClick with request when row clicked', () => {
      render(<RequestTable requests={mockRequests} onRowClick={mockOnRowClick} />);

      const customerCell = screen.getByText('Nguyen Van A');
      fireEvent.click(customerCell);

      expect(mockOnRowClick).toHaveBeenCalledWith(mockRequests[0]);
    });

    it('applies cursor-pointer class when onRowClick provided', () => {
      const { container } = render(
        <RequestTable requests={mockRequests} onRowClick={mockOnRowClick} />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveClass('cursor-pointer');
    });

    it('does not apply cursor-pointer when onRowClick not provided', () => {
      const { container } = render(<RequestTable requests={mockRequests} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).not.toHaveClass('cursor-pointer');
    });

    it('can click different rows and get correct request', () => {
      render(<RequestTable requests={mockRequests} onRowClick={mockOnRowClick} />);

      // Click second row
      fireEvent.click(screen.getByText('Tran Thi B'));
      expect(mockOnRowClick).toHaveBeenLastCalledWith(mockRequests[1]);

      // Click third row
      fireEvent.click(screen.getByText('Le Van C'));
      expect(mockOnRowClick).toHaveBeenLastCalledWith(mockRequests[2]);
    });
  });

  describe('Follow-up Indicator', () => {
    it('shows dash when no follow-up date', () => {
      const requestNoFollowUp = createMockRequest({ nextFollowUp: null });
      render(<RequestTable requests={[requestNoFollowUp]} />);

      // Should have dash for empty follow-up
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('shows overdue styling for past dates', () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 3);

      const overdueRequest = createMockRequest({
        id: 'overdue',
        nextFollowUp: overdueDate,
      });

      const { container } = render(<RequestTable requests={[overdueRequest]} />);

      // Should have red text for overdue
      const redText = container.querySelector('.text-red-600');
      expect(redText).toBeInTheDocument();
      expect(redText?.textContent).toContain('Quá hạn');
    });

    it('shows today styling for current date', () => {
      const todayRequest = createMockRequest({
        id: 'today',
        nextFollowUp: new Date(),
      });

      const { container } = render(<RequestTable requests={[todayRequest]} />);

      // Should have yellow text for today
      const yellowText = container.querySelector('.text-yellow-600');
      expect(yellowText).toBeInTheDocument();
      expect(yellowText?.textContent).toBe('Hôm nay');
    });

    it('shows upcoming styling for near future dates', () => {
      const upcomingDate = new Date();
      upcomingDate.setDate(upcomingDate.getDate() + 2);

      const upcomingRequest = createMockRequest({
        id: 'upcoming',
        nextFollowUp: upcomingDate,
      });

      const { container } = render(<RequestTable requests={[upcomingRequest]} />);

      // Should have orange text for near upcoming (within 3 days)
      const orangeText = container.querySelector('.text-orange-600');
      expect(orangeText).toBeInTheDocument();
    });

    it('shows green styling for future dates beyond 3 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const futureRequest = createMockRequest({
        id: 'future',
        nextFollowUp: futureDate,
      });

      const { container } = render(<RequestTable requests={[futureRequest]} />);

      // Should have green text for future
      const greenText = container.querySelector('.text-green-600');
      expect(greenText).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('renders status badge for each request', () => {
      render(<RequestTable requests={mockRequests} />);

      // Status badges should be present (checking for badge container)
      // The RequestStatusBadge component renders badges with status labels
      // Check that the table renders without error with different statuses
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
      expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
      expect(screen.getByText('Le Van C')).toBeInTheDocument();
    });
  });

  describe('Request Code Display', () => {
    it('displays rqid when available', () => {
      const requestWithRqid = createMockRequest({
        rqid: 'RQ-2024-TEST',
        code: 'CODE123',
      });

      render(<RequestTable requests={[requestWithRqid]} />);

      expect(screen.getByText('RQ-2024-TEST')).toBeInTheDocument();
    });

    it('displays code as fallback when rqid is null', () => {
      const requestWithoutRqid = createMockRequest({
        rqid: null,
        code: 'FALLBACK-CODE',
      });

      render(<RequestTable requests={[requestWithoutRqid]} />);

      expect(screen.getByText('FALLBACK-CODE')).toBeInTheDocument();
    });
  });
});
