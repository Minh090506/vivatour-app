/**
 * @jest-environment node
 */

// Tests for report utility functions
// Covers: getDateRange, getComparisonRange, formatPeriodKey, calcChangePercent

import {
  getDateRange,
  getComparisonRange,
  formatPeriodKey,
  calcChangePercent,
  type DateRangeOption
} from '@/lib/report-utils';

describe('getDateRange', () => {
  it('should return thisMonth range with correct structure', () => {
    const result = getDateRange('thisMonth');

    expect(result).toHaveProperty('startDate');
    expect(result).toHaveProperty('endDate');
    expect(result).toHaveProperty('label');

    expect(result.startDate instanceof Date).toBe(true);
    expect(result.endDate instanceof Date).toBe(true);

    // Start date should be day 1 of month
    expect(result.startDate.getDate()).toBe(1);

    // End date should be after start date
    expect(result.endDate.getTime()).toBeGreaterThan(result.startDate.getTime());

    expect(result.label).toContain('Thang');
  });

  it('should return lastMonth range with correct structure', () => {
    const result = getDateRange('lastMonth');

    expect(result).toHaveProperty('startDate');
    expect(result).toHaveProperty('endDate');
    expect(result.label).toContain('Thang');

    expect(result.endDate.getTime()).toBeGreaterThan(result.startDate.getTime());
  });

  it('should return last3Months range', () => {
    const result = getDateRange('last3Months');

    expect(result.startDate instanceof Date).toBe(true);
    expect(result.endDate instanceof Date).toBe(true);
    expect(result.label).toBe('3 thang gan day');

    const duration = result.endDate.getTime() - result.startDate.getTime();
    const threeDaysInMs = 3 * 30 * 24 * 60 * 60 * 1000; // Approximate
    expect(duration).toBeGreaterThan(threeDaysInMs * 0.8); // Allow some variance
  });

  it('should return last6Months range', () => {
    const result = getDateRange('last6Months');

    expect(result.label).toBe('6 thang gan day');
    expect(result.startDate instanceof Date).toBe(true);
    expect(result.endDate instanceof Date).toBe(true);
  });

  it('should return thisYear range', () => {
    const result = getDateRange('thisYear');

    expect(result.label).toContain('Nam');
    expect(result.startDate.getDate()).toBe(1);
    expect(result.startDate.getMonth()).toBe(0); // January
  });

  it('should return consistent label for known ranges', () => {
    const thisMonth = getDateRange('thisMonth');
    const lastMonth = getDateRange('lastMonth');
    const last3 = getDateRange('last3Months');
    const last6 = getDateRange('last6Months');
    const year = getDateRange('thisYear');

    expect(thisMonth.label).toMatch(/Thang \d+\/\d+/);
    expect(lastMonth.label).toMatch(/Thang \d+\/\d+/);
    expect(last3.label).toBe('3 thang gan day');
    expect(last6.label).toBe('6 thang gan day');
    expect(year.label).toMatch(/Nam \d+/);
  });
});

describe('getComparisonRange', () => {
  it('should return previous period with same duration as current', () => {
    const current = getDateRange('thisMonth');
    const comparison = getComparisonRange('thisMonth');

    const currentDuration = current.endDate.getTime() - current.startDate.getTime();
    const comparisonDuration = comparison.endDate.getTime() - comparison.startDate.getTime();

    // Duration should be approximately equal (within 1 second)
    expect(Math.abs(currentDuration - comparisonDuration)).toBeLessThan(1000);
  });

  it('should have label "Ky truoc"', () => {
    const result = getComparisonRange('thisMonth');
    expect(result.label).toBe('Ky truoc');
  });

  it('should return dates before current range', () => {
    const current = getDateRange('last3Months');
    const comparison = getComparisonRange('last3Months');

    expect(comparison.endDate.getTime()).toBeLessThan(current.startDate.getTime());
  });

  it('should return valid DateRange objects for all range types', () => {
    const ranges = ['thisMonth', 'lastMonth', 'last3Months', 'last6Months', 'thisYear'] as const;

    for (const range of ranges) {
      const result = getComparisonRange(range);
      expect(result).toHaveProperty('startDate');
      expect(result).toHaveProperty('endDate');
      expect(result.label).toBe('Ky truoc');
      expect(result.startDate instanceof Date).toBe(true);
      expect(result.endDate instanceof Date).toBe(true);
    }
  });

  it('should return comparison period ending before current period starts', () => {
    const ranges = ['thisMonth', 'lastMonth', 'last3Months', 'last6Months', 'thisYear'] as const;

    for (const range of ranges) {
      const current = getDateRange(range);
      const comparison = getComparisonRange(range);
      expect(comparison.endDate.getTime()).toBeLessThan(current.startDate.getTime());
    }
  });
});

describe('formatPeriodKey', () => {
  it('should format date as YYYY-MM with zero-padded month', () => {
    const date = new Date('2026-01-15');
    const result = formatPeriodKey(date);
    expect(result).toBe('2026-01');
  });

  it('should handle double-digit months', () => {
    const date = new Date('2026-12-25');
    const result = formatPeriodKey(date);
    expect(result).toBe('2026-12');
  });

  it('should pad single-digit months with zero', () => {
    const date = new Date('2025-02-28');
    const result = formatPeriodKey(date);
    expect(result).toBe('2025-02');
  });

  it('should handle different years', () => {
    const date2024 = new Date('2024-05-01');
    const date2026 = new Date('2026-05-01');

    expect(formatPeriodKey(date2024)).toBe('2024-05');
    expect(formatPeriodKey(date2026)).toBe('2026-05');
  });
});

describe('calcChangePercent', () => {
  it('should calculate positive change correctly', () => {
    const result = calcChangePercent(200, 100);
    expect(result).toBe(100); // 100% increase
  });

  it('should calculate negative change correctly', () => {
    const result = calcChangePercent(50, 100);
    expect(result).toBe(-50); // 50% decrease
  });

  it('should handle zero previous value with positive current', () => {
    const result = calcChangePercent(100, 0);
    expect(result).toBe(100); // 100% when previous is 0
  });

  it('should handle zero previous value with zero current', () => {
    const result = calcChangePercent(0, 0);
    expect(result).toBe(0); // 0% when both are 0
  });

  it('should return 0 for identical values', () => {
    const result = calcChangePercent(100, 100);
    expect(result).toBe(0); // No change
  });

  it('should round to 2 decimal places', () => {
    const result = calcChangePercent(333, 100);
    expect(result).toBe(233); // (333-100)/100 * 100 = 233%
  });

  it('should handle decimal results with rounding', () => {
    // (150 - 100) / 100 = 0.5 = 50%
    const result = calcChangePercent(150, 100);
    expect(result).toBe(50);
  });

  it('should handle fractional percentages', () => {
    // (101 - 100) / 100 = 0.01 = 1%
    const result = calcChangePercent(101, 100);
    expect(result).toBe(1);
  });

  it('should handle large numbers', () => {
    const result = calcChangePercent(1000000, 500000);
    expect(result).toBe(100); // 100% increase
  });

  it('should handle very small percentages', () => {
    const result = calcChangePercent(1001, 1000);
    expect(result).toBe(0.1); // 0.1% increase
  });
});
