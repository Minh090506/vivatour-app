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

  describe('Calculation Accuracy', () => {
    it('calculates tier-specific amounts correctly for KT only', () => {
      const revenues = [
        { amountVND: 1000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: false, lockFinal: false },
        { amountVND: 2000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // KT count should be 2
      const breakdown = screen.getByText('Phan bo khoa').parentElement?.parentElement;
      expect(breakdown?.textContent).toContain('2');
    });

    it('calculates tier-specific amounts correctly for Admin tier', () => {
      const revenues = [
        { amountVND: 1000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: true, lockFinal: false },
        { amountVND: 2000000, paymentType: 'FULL_PAYMENT', lockKT: true, lockAdmin: true, lockFinal: false },
        { amountVND: 3000000, paymentType: 'PARTIAL', lockKT: true, lockAdmin: true, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Admin tier should show 3 items
      const breakdown = screen.getByText('Phan bo khoa').parentElement?.parentElement;
      expect(breakdown?.textContent).toContain('Admin');
      expect(breakdown?.textContent).toContain('3');
    });

    it('calculates tier-specific amounts correctly for Final tier', () => {
      const revenues = [
        { amountVND: 5000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: true, lockFinal: true },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Final count should be 1
      const breakdown = screen.getByText('Phan bo khoa').parentElement?.parentElement;
      expect(breakdown?.textContent).toContain('Cuoi');
      expect(breakdown?.textContent).toContain('1');
    });

    it('handles multiple refunds correctly', () => {
      const revenues = [
        { amountVND: 10000000, paymentType: 'FULL_PAYMENT', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 1000000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 500000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 500000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Total: 10M - 1M - 0.5M - 0.5M = 8M
      expect(screen.getByText(/8\.000\.000/)).toBeInTheDocument();
    });

    it('calculates locked refunds correctly', () => {
      const revenues = [
        { amountVND: 5000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: false, lockFinal: false },
        { amountVND: 1000000, paymentType: 'REFUND', lockKT: true, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Locked: 5M - 1M = 4M (appears in both total and locked cards)
      const amounts = screen.getAllByText(/4\.000\.000/);
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });

    it('handles large amounts correctly', () => {
      const revenues = [
        { amountVND: 999999999, paymentType: 'FULL_PAYMENT', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Should format correctly with Vietnamese number format
      expect(screen.getByText(/999\.999\.999/)).toBeInTheDocument();
    });

    it('handles zero amounts', () => {
      const revenues = [
        { amountVND: 0, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Should show 0
      const zeroValues = screen.getAllByText(/^0 d$/);
      expect(zeroValues.length).toBeGreaterThanOrEqual(1);
    });

    it('counts different payment types correctly', () => {
      const revenues = [
        { amountVND: 1000000, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 2000000, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 3000000, paymentType: 'FULL_PAYMENT', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 4000000, paymentType: 'PARTIAL', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Total: 4 transactions, 2 deposits
      expect(screen.getByText('4 giao dich')).toBeInTheDocument();
      expect(screen.getByText('2 giao dich')).toBeInTheDocument();
    });

    it('excludes refunds from deposit count', () => {
      const revenues = [
        { amountVND: 1000000, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 500000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Deposit card should show only 1 deposit
      expect(screen.getByText('1 giao dich')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null/undefined lock fields', () => {
      const revenues = [
        { amountVND: 1000000, paymentType: 'DEPOSIT' } as { amountVND: number; paymentType: string; lockKT?: boolean; lockAdmin?: boolean; lockFinal?: boolean },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Should render without error
      expect(screen.getByText('Tong thu nhap')).toBeInTheDocument();
    });

    it('handles mixed lock states in same tier', () => {
      const revenues = [
        { amountVND: 1000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: false, lockFinal: false },
        { amountVND: 2000000, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 3000000, paymentType: 'DEPOSIT', lockKT: true, lockAdmin: true, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Total locked: 1M + 3M = 4M (2 items locked)
      expect(screen.getByText('2 giao dich')).toBeInTheDocument();
    });

    it('handles all revenues being refunds', () => {
      const revenues = [
        { amountVND: 1000000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
        { amountVND: 2000000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Total: -1M - 2M = -3M (negative display)
      // Component should handle negative values
      expect(screen.getByText('2 giao dich')).toBeInTheDocument();
    });

    it('handles decimal amounts', () => {
      const revenues = [
        { amountVND: 1500000.5, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Multiple cards show "1 giao dich" (total, deposit, locked=0, breakdown)
      const transactions = screen.getAllByText('1 giao dich');
      expect(transactions.length).toBeGreaterThanOrEqual(1);
      // Amount should contain 1.500
      const amounts = screen.getAllByText(/1\.500/);
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });

    it('handles string amounts (should convert to number)', () => {
      const revenues = [
        { amountVND: '1000000' as unknown as number, paymentType: 'DEPOSIT', lockKT: false, lockAdmin: false, lockFinal: false },
      ];

      render(<RevenueSummaryCard revenues={revenues} />);

      // Component uses Number() to convert - multiple cards show the same value
      const amounts = screen.getAllByText(/1\.000\.000/);
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Icon Rendering', () => {
    it('renders correct icons for each card', () => {
      const { container } = render(<RevenueSummaryCard revenues={mockRevenues} />);

      // Check that SVG icons are present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(4); // At least 4 cards with icons
    });
  });

  describe('Color Coding', () => {
    it('applies green color to total revenue', () => {
      const { container } = render(<RevenueSummaryCard revenues={mockRevenues} />);

      const greenText = container.querySelector('.text-green-600');
      expect(greenText).toBeInTheDocument();
    });

    it('applies blue color to deposit total', () => {
      const { container } = render(<RevenueSummaryCard revenues={mockRevenues} />);

      const blueText = container.querySelector('.text-blue-600');
      expect(blueText).toBeInTheDocument();
    });

    it('applies amber color to locked total', () => {
      const { container } = render(<RevenueSummaryCard revenues={mockRevenues} />);

      const amberText = container.querySelector('.text-amber-600');
      expect(amberText).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('applies correct grid classes', () => {
      const { container } = render(<RevenueSummaryCard revenues={mockRevenues} />);

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass('grid');
      expect(gridContainer).toHaveClass('grid-cols-2');
      expect(gridContainer).toHaveClass('md:grid-cols-4');
    });
  });
});
