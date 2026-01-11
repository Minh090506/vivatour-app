# Phase 06: RevenueSummaryCard Tests

## Objective
Test RevenueSummaryCard component: calculations, formatting, tier breakdown.

## Output File
`src/components/revenues/__tests__/revenue-summary-card.test.tsx`

## Test Coverage (~10 tests)

### Card Rendering (3 tests)

1. **renders all 4 summary cards**
   - "Tong thu nhap"
   - "Dat coc"
   - "Da khoa"
   - "Phan bo khoa"

2. **renders icons for each card**
   - DollarSign, TrendingUp, Shield, ShieldAlert

3. **applies className prop to container**
   - Custom styling passed through

### Total Calculations (4 tests)

4. **calculates total VND correctly**
   - Sum of all amountVND
   - Refunds subtracted (negative)

5. **calculates deposit total correctly**
   - Filter: paymentType === 'DEPOSIT'
   - Sum of filtered amounts

6. **calculates total locked amount**
   - Any lock tier counts
   - Includes legacy isLocked
   - Refunds handled

7. **handles empty revenues array**
   - Total: 0
   - Transaction count: 0

### Lock Tier Breakdown (2 tests)

8. **calculates tier-specific counts correctly**
   - KT only (not Admin, not Final)
   - Admin (not Final)
   - Final

9. **displays tier breakdown with icons and colors**
   - KT: amber Shield
   - Admin: orange ShieldCheck
   - Final: red ShieldAlert

### Currency Formatting (1 test)

10. **formats amounts using formatCurrency()**
    - Vietnamese number formatting
    - "d" suffix for VND

## Test Data Setup

```typescript
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

// Expected calculations:
// Total: 5M + 10M - 1M + 3M + 4M + 2M = 23M
// Deposit: 5M + 3M + 2M = 10M
// Locked: 3M + 4M + 2M = 9M
// KT only: 1 (3M entry)
// Admin (not Final): 1 (4M entry)
// Final: 1 (2M entry)
```

## Key Test Patterns

### Total Calculation
```typescript
describe('Total Calculations', () => {
  it('calculates total VND with refunds subtracted', () => {
    render(<RevenueSummaryCard revenues={mockRevenues} />);

    // Total should be formatted
    expect(screen.getByText('23.000.000 d')).toBeInTheDocument();
    expect(screen.getByText('6 giao dich')).toBeInTheDocument();
  });

  it('handles refund correctly', () => {
    const revenuesWithRefund = [
      { amountVND: 10000000, paymentType: 'FULL_PAYMENT', lockKT: false, lockAdmin: false, lockFinal: false },
      { amountVND: 2000000, paymentType: 'REFUND', lockKT: false, lockAdmin: false, lockFinal: false },
    ];

    render(<RevenueSummaryCard revenues={revenuesWithRefund} />);

    // 10M - 2M = 8M
    expect(screen.getByText('8.000.000 d')).toBeInTheDocument();
  });
});
```

### Lock Tier Breakdown
```typescript
describe('Lock Tier Breakdown', () => {
  it('counts tiers correctly', () => {
    render(<RevenueSummaryCard revenues={mockRevenues} />);

    // Check tier counts in breakdown card
    const breakdownCard = screen.getByText('Phan bo khoa').closest('div');

    // KT count
    within(breakdownCard).getByText('1'); // for KT-only
    // Admin count
    within(breakdownCard).getByText('1'); // for Admin (not Final)
    // Final count
    within(breakdownCard).getByText('1'); // for Final
  });
});
```

### Empty State
```typescript
it('handles empty revenues array', () => {
  render(<RevenueSummaryCard revenues={[]} />);

  // Total should be 0
  expect(screen.getByText('0 d')).toBeInTheDocument();
  expect(screen.getByText('0 giao dich')).toBeInTheDocument();
});
```

### Legacy isLocked Field
```typescript
it('includes legacy isLocked in total locked', () => {
  const revenuesWithLegacy = [
    { amountVND: 5000000, paymentType: 'DEPOSIT', isLocked: true },
  ];

  render(<RevenueSummaryCard revenues={revenuesWithLegacy} />);

  // Should count as locked
  const lockedCard = screen.getByText('Da khoa').closest('div');
  expect(within(lockedCard).getByText('5.000.000 d')).toBeInTheDocument();
});
```

## Estimated Lines
~200 lines
