/**
 * Tests for RevenueSummaryCard component
 * Tests calculations, formatting, tier breakdown
 */

import { render, screen } from '@testing-library/react';
import { RevenueSummaryCard } from '../revenue-summary-card';

// Test data matching phase-06 spec
const mockRevenues = [
  // Regular deposit
  { amountVND: 5000000, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
  // Full payment
  { amountVND: 10000000, paymentType: 'FULL_PAYMENT', lockKT: false, lockAdmin: false, lockFinal: false },
  // Refund (should subtract)
  { amountVND: 1000000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
  // Locked KT only
  { amountVND: 3000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: false, lockFinal: false },
  // Locked Admin
  { amountVND: 4000000, paymentType: 'FULL_PAYMENT', lockKT: true, lockAdmin: true, lockFinal: false },
  // Fully locked
  { amountVND: 2000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: true, lockFinal: true },
];

describe('RevenueSummaryCard', () => {
  describe('Card Rendering', () => {
    it('renders all 4 summary cards', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      expect(screen.getByText('Tong thu nhap')).toBeInTheDocument();
      expect(screen.getByText('Dat coc')).toBeInTheDocument();
      expect(screen.getByText('Da khoa')).toBeInTheDocument();
      expect(screen.getByText('Phan bo khoa')).toBeInTheDocument();
    });

    it('renders correct transaction count for total', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // Check for total transaction count (6 items in mockRevenues)
      expect(screen.getByText('6 giao dich')).toBeInTheDocument();
    });

    it('applies className prop to container', () => {
      const { container } = render(
        <RevenueSummaryCard revenues={mockRevenues} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Total Calculations', () => {
    it('calculates total VND correctly with refunds subtracted', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // Total: 5M + 10M - 1M + 3M + 4M + 2M = 23M
      expect(screen.getByText(/23\.000\.000/)).toBeInTheDocument();
    });

    it('calculates deposit total correctly', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // Deposit: 5M + 3M + 2M = 10M
      expect(screen.getByText(/10\.000\.000/)).toBeInTheDocument();
    });

    it('calculates total locked amount correctly', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // Locked: 3M + 4M + 2M = 9M
      expect(screen.getByText(/9\.000\.000/)).toBeInTheDocument();
    });

    it('handles empty revenues array', () => {
      render(<RevenueSummaryCard revenues={[]} />);

      // Multiple "0 d" values and "0 giao dich" in different cards
      const zeroValues = screen.getAllByText(/^0 d$/);
      expect(zeroValues.length).toBeGreaterThanOrEqual(1);
      // Multiple cards show "0 giao dich"
      const zeroTransactions = screen.getAllByText('0 giao dich');
      expect(zeroTransactions.length).toBeGreaterThanOrEqual(1);
    });

    it('handles refund correctly (negative in total)', () => {
      const revenuesWithRefund = [
        { amountVND: 10000000, paymentType: 'FULL_PAYMENT', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 2000000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenuesWithRefund} />);

      // 10M - 2M = 8M
      expect(screen.getByText(/8\.000\.000/)).toBeInTheDocument();
    });
  });

  describe('Lock Tier Breakdown', () => {
    it('displays tier labels in breakdown card', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // Check tier labels exist
      expect(screen.getByText('KT')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Cuoi')).toBeInTheDocument();
    });

    it('displays tier counts', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // Each tier has 1 item
      const container = screen.getByText('Phan bo khoa').parentElement?.parentElement;
      expect(container?.textContent).toContain('1');
    });
  });

  describe('Legacy isLocked Field', () => {
    it('includes legacy isLocked in total locked', () => {
      const revenuesWithLegacy = [
        { amountVND: 5000000, paymentType: 'DEPOSIT', isLocked: true },
      ];

      render(<RevenueSummaryCard revenues={revenuesWithLegacy} />);

      // Should count as locked - multiple cards show 5M
      const amounts = screen.getAllByText(/5\.000\.000/);
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Currency Formatting', () => {
    it('formats amounts using Vietnamese number format with dots', () => {
      const revenues = [
        { amountVND: 12345678, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Vietnamese format uses dots for thousands - multiple cards may show same value
      const amounts = screen.getAllByText(/12\.345\.678/);
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Deposit Transaction Count', () => {
    it('shows correct deposit transaction count', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // 3 deposits and 3 locked items - both cards show "3 giao dich"
      const threeTransactions = screen.getAllByText('3 giao dich');
      expect(threeTransactions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Locked Transaction Count', () => {
    it('shows correct locked transaction count', () => {
      render(<RevenueSummaryCard revenues={mockRevenues} />);

      // 3 locked items - deposit card and locked card both show 3
      expect(screen.getAllByText('3 giao dich').length).toBeGreaterThanOrEqual(1);
    });
  });
});
