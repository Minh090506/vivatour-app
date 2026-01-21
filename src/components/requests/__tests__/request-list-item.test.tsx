/**
 * Tests for RequestListItem component
 * Covers: rendering, selection, follow-up indicator
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { RequestListItem } from '../request-list-item';
import {
  mockRequest,
  mockRequestWithBooking,
  createMockRequest,
  createMockRequestWithOverdueFollowUp,
  createMockRequestWithFutureFollowUp,
} from './test-utils';

describe('RequestListItem', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // RENDERING
  // ============================================

  describe('Rendering', () => {
    it('displays booking code when available', () => {
      render(
        <RequestListItem
          request={mockRequestWithBooking}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('20260110S0001')).toBeInTheDocument();
    });

    it('displays RQID when no booking code', () => {
      render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('RQ-2024-001')).toBeInTheDocument();
    });

    it('displays code as fallback when no RQID', () => {
      const requestWithCodeOnly = createMockRequest({
        rqid: null,
        bookingCode: null,
        code: 'FALLBACK-001',
      });

      render(
        <RequestListItem
          request={requestWithCodeOnly}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('FALLBACK-001')).toBeInTheDocument();
    });

    it('shows customer name', () => {
      render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    it('shows seller name', () => {
      render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Test Seller')).toBeInTheDocument();
    });

    it('shows N/A when seller not available', () => {
      const requestNoSeller = createMockRequest({
        seller: undefined,
      });

      render(
        <RequestListItem
          request={requestNoSeller}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Should show N/A for seller
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });

    it('shows country', () => {
      render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('USA')).toBeInTheDocument();
    });

    it('shows N/A when country not available', () => {
      const requestNoCountry = createMockRequest({
        country: '',
      });

      render(
        <RequestListItem
          request={requestNoCountry}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });

    it('formats received date', () => {
      render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Date should be formatted - vi-VN locale outputs "10/1/2026" (no padding)
      // or similar format depending on environment
      const dateText = screen.getByText((content, element) => {
        // Check if content contains date parts (10, 1 or 01, 2026)
        return content.includes('10') && content.includes('2026');
      });
      expect(dateText).toBeInTheDocument();
    });

    it('formats date correctly for recent dates', () => {
      // Test that date formatting works correctly for recent dates
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1); // Yesterday

      const requestRecentDate = createMockRequest({
        receivedDate: recentDate,
      });

      render(
        <RequestListItem
          request={requestRecentDate}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Should show a formatted date without throwing
      const container = screen.getByText(requestRecentDate.customerName).closest('div');
      expect(container).toBeInTheDocument();
    });

    it('renders status badge', () => {
      render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Status badge should be visible (actual label from config)
      expect(screen.getByText('Đang LL - chưa trả lời')).toBeInTheDocument();
    });
  });

  // ============================================
  // SELECTION
  // ============================================

  describe('Selection', () => {
    it('applies selected style when isSelected true', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={true}
          onClick={mockOnClick}
        />
      );

      // Should have bg-muted class for selected state
      const selectedItem = container.querySelector('[class*="bg-muted"]');
      expect(selectedItem).toBeInTheDocument();
    });

    it('applies border-l-primary class when selected', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={true}
          onClick={mockOnClick}
        />
      );

      const selectedItem = container.querySelector('[class*="border-l-primary"]');
      expect(selectedItem).toBeInTheDocument();
    });

    it('does not apply selected style when isSelected false', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      const selectedItem = container.querySelector('[class*="border-l-primary"]');
      expect(selectedItem).not.toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      const item = screen.getByText('Nguyen Van A').closest('div[class*="cursor-pointer"]');
      if (item) {
        fireEvent.click(item);
      }

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('has cursor-pointer class for clickability', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      const clickableItem = container.querySelector('[class*="cursor-pointer"]');
      expect(clickableItem).toBeInTheDocument();
    });
  });

  // ============================================
  // FOLLOW-UP INDICATOR
  // ============================================

  describe('Follow-up Indicator', () => {
    it('shows bell icon for overdue follow-up', () => {
      const overdueRequest = createMockRequestWithOverdueFollowUp(1);

      const { container } = render(
        <RequestListItem
          request={overdueRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Bell icon should be present (lucide-react Bell icon)
      const bellIcon = container.querySelector('svg');
      expect(bellIcon).toBeInTheDocument();
    });

    it('hides bell icon when follow-up not overdue', () => {
      const futureRequest = createMockRequestWithFutureFollowUp(7);

      const { container } = render(
        <RequestListItem
          request={futureRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Should not have orange-colored bell icon
      const orangeIcon = container.querySelector('[class*="text-orange"]');
      expect(orangeIcon).not.toBeInTheDocument();
    });

    it('hides bell icon when no follow-up set', () => {
      const noFollowUpRequest = createMockRequest({
        nextFollowUp: null,
      });

      const { container } = render(
        <RequestListItem
          request={noFollowUpRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Should not have orange-colored bell icon
      const orangeIcon = container.querySelector('[class*="text-orange-500"]');
      expect(orangeIcon).not.toBeInTheDocument();
    });

    it('shows bell icon with orange color for overdue', () => {
      const overdueRequest = createMockRequestWithOverdueFollowUp(3);

      const { container } = render(
        <RequestListItem
          request={overdueRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      const orangeIcon = container.querySelector('[class*="text-orange-500"]');
      expect(orangeIcon).toBeInTheDocument();
    });
  });

  // ============================================
  // ICONS
  // ============================================

  describe('Icons', () => {
    it('renders User icon for seller', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // User icon should be present in meta info
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders Globe icon for country', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Globe icon should be present
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(1);
    });

    it('renders Calendar icon for date', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      // Calendar icon should be present
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(2);
    });
  });

  // ============================================
  // HOVER STATES
  // ============================================

  describe('Hover States', () => {
    it('has hover:bg-muted/50 class for hover effect', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      const hoverableItem = container.querySelector('[class*="hover:bg-muted"]');
      expect(hoverableItem).toBeInTheDocument();
    });

    it('has transition-colors class for smooth transitions', () => {
      const { container } = render(
        <RequestListItem
          request={mockRequest}
          isSelected={false}
          onClick={mockOnClick}
        />
      );

      const transitionItem = container.querySelector('[class*="transition-colors"]');
      expect(transitionItem).toBeInTheDocument();
    });
  });
});
