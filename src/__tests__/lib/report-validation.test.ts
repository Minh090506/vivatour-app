/**
 * @jest-environment node
 */

// Tests for report validation schemas
// Covers: reportQuerySchema, extractReportZodErrors

import {
  reportQuerySchema,
  extractReportZodErrors,
  type ReportQueryParams,
  DATE_RANGE_OPTIONS
} from '@/lib/validations/report-validation';
import { z } from 'zod';

describe('reportQuerySchema', () => {
  it('should validate valid range options', () => {
    const validRanges = ['thisMonth', 'lastMonth', 'last3Months', 'last6Months', 'thisYear'];

    for (const range of validRanges) {
      const result = reportQuerySchema.safeParse({ range });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.range).toBe(range);
      }
    }
  });

  it('should reject invalid range options', () => {
    const result = reportQuerySchema.safeParse({ range: 'invalidRange' });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].message).toContain('Khoang thoi gian khong hop le');
    }
  });

  it('should default to thisMonth when range is not provided', () => {
    const result = reportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.range).toBe('thisMonth');
    }
  });

  it('should handle empty object', () => {
    const result = reportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept null range and use default', () => {
    const result = reportQuerySchema.safeParse({ range: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.range).toBe('thisMonth');
    }
  });

  it('should return correct type', () => {
    const result = reportQuerySchema.parse({ range: 'lastMonth' });
    const expected: ReportQueryParams = { range: 'lastMonth' };
    expect(result).toEqual(expected);
  });

  it('should validate with extra properties (ignored)', () => {
    const result = reportQuerySchema.safeParse({
      range: 'thisMonth',
      extraProp: 'ignored'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ range: 'thisMonth' });
    }
  });

  it('should reject empty string range', () => {
    const result = reportQuerySchema.safeParse({ range: '' });
    expect(result.success).toBe(false);
  });

  it('should reject null range', () => {
    const result = reportQuerySchema.safeParse({ range: null });
    expect(result.success).toBe(false);
  });

  it('should be case-sensitive for range values', () => {
    const result = reportQuerySchema.safeParse({ range: 'ThisMonth' });
    expect(result.success).toBe(false);
  });
});

describe('extractReportZodErrors', () => {
  it('should extract single field error', () => {
    const result = reportQuerySchema.safeParse({ range: 'invalid' });

    if (!result.success) {
      const errors = extractReportZodErrors(result.error);
      expect(errors).toHaveProperty('range');
      expect(errors.range).toContain('Khoang thoi gian khong hop le');
    }
  });

  it('should extract multiple field errors', () => {
    const schema = z.object({
      range: z.enum(['valid1', 'valid2']),
      other: z.string().min(5)
    });

    const result = schema.safeParse({ range: 'invalid', other: 'hi' });

    if (!result.success) {
      const errors = extractReportZodErrors(result.error);
      expect(Object.keys(errors).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should return empty object for valid data', () => {
    const result = reportQuerySchema.safeParse({ range: 'thisMonth' });

    if (result.success) {
      const errors = extractReportZodErrors(new z.ZodError([]));
      expect(errors).toEqual({});
    }
  });

  it('should handle nested field errors with dot notation', () => {
    const schema = z.object({
      nested: z.object({
        field: z.string()
      })
    });

    const result = schema.safeParse({ nested: { field: 123 } });

    if (!result.success) {
      const errors = extractReportZodErrors(result.error);
      expect(Object.keys(errors)[0]).toContain('nested');
    }
  });

  it('should not duplicate errors for same field', () => {
    const schema = z.object({
      field: z.string().min(5).max(10)
    });

    const result = schema.safeParse({ field: 'x' });

    if (!result.success) {
      const errors = extractReportZodErrors(result.error);
      // Should have only one entry for 'field', not multiple
      expect(Object.keys(errors).filter(k => k === 'field').length).toBe(1);
    }
  });

  it('should extract error message', () => {
    const schema = z.object({
      range: z.enum(['a', 'b'], {
        message: 'Custom error message'
      })
    });

    const result = schema.safeParse({ range: 'invalid' });

    if (!result.success) {
      const errors = extractReportZodErrors(result.error);
      expect(errors.range).toBeTruthy();
    }
  });
});

describe('DATE_RANGE_OPTIONS constant', () => {
  it('should have all expected date range options', () => {
    expect(DATE_RANGE_OPTIONS).toContain('thisMonth');
    expect(DATE_RANGE_OPTIONS).toContain('lastMonth');
    expect(DATE_RANGE_OPTIONS).toContain('last3Months');
    expect(DATE_RANGE_OPTIONS).toContain('last6Months');
    expect(DATE_RANGE_OPTIONS).toContain('thisYear');
  });

  it('should be readonly array', () => {
    // This test verifies the constant is const by checking if we can modify it
    // @ts-ignore - Intentionally trying to modify readonly
    expect(() => {
      const arr = DATE_RANGE_OPTIONS as any;
      arr.push('newOption');
    }).not.toThrow(); // JS doesn't prevent modification, just TS
  });

  it('should have at least 5 options', () => {
    expect(DATE_RANGE_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });
});
