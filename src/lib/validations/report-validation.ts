import { z } from 'zod';

// Fixed date range options
export const DATE_RANGE_OPTIONS = [
  'thisMonth',
  'lastMonth',
  'last3Months',
  'last6Months',
  'thisYear',
  'custom'
] as const;

export type DateRangeOption = typeof DATE_RANGE_OPTIONS[number];

// Max custom range: 365 days
export const MAX_CUSTOM_RANGE_DAYS = 365;

// Date format validation regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Custom date range validation
export const customDateRangeSchema = z.object({
  startDate: z.string().regex(DATE_REGEX, 'Ngay bat dau khong hop le (YYYY-MM-DD)'),
  endDate: z.string().regex(DATE_REGEX, 'Ngay ket thuc khong hop le (YYYY-MM-DD)'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, { message: 'Ngay bat dau phai nho hon ngay ket thuc' })
.refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= MAX_CUSTOM_RANGE_DAYS;
}, { message: `Khoang thoi gian khong duoc vuot qua ${MAX_CUSTOM_RANGE_DAYS} ngay` });

// Query params schema - supports fixed range or custom dates
export const reportQuerySchema = z.object({
  range: z.enum(DATE_RANGE_OPTIONS, {
    message: 'Khoang thoi gian khong hop le'
  }).default('thisMonth'),
  startDate: z.string().regex(DATE_REGEX).optional(),
  endDate: z.string().regex(DATE_REGEX).optional(),
}).refine((data) => {
  // If custom, require startDate and endDate
  if (data.range === 'custom') {
    return data.startDate && data.endDate;
  }
  return true;
}, { message: 'Vui long chon ngay bat dau va ket thuc' });

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
