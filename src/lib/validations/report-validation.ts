import { z } from 'zod';

// Fixed date range options
export const DATE_RANGE_OPTIONS = [
  'thisMonth',
  'lastMonth',
  'last3Months',
  'last6Months',
  'thisYear'
] as const;

export type DateRangeOption = typeof DATE_RANGE_OPTIONS[number];

// Query params schema
export const reportQuerySchema = z.object({
  range: z.enum(DATE_RANGE_OPTIONS, {
    message: 'Khoang thoi gian khong hop le'
  }).default('thisMonth'),
});

export type ReportQueryParams = z.infer<typeof reportQuerySchema>;

// Extract errors helper
export function extractReportZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
