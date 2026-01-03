// Operator validation schemas using Zod
import { z } from 'zod';

/**
 * Schema for creating/updating an operator
 */
export const operatorFormSchema = z.object({
  requestId: z.string().min(1, 'Vui lòng chọn Booking'),
  supplierId: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  serviceDate: z.string().min(1, 'Vui lòng chọn ngày dịch vụ'),
  serviceType: z.string().min(1, 'Vui lòng chọn loại dịch vụ'),
  serviceName: z.string().min(1, 'Vui lòng nhập tên dịch vụ'),
  costBeforeTax: z.number().min(0, 'Chi phí phải >= 0'),
  vat: z.number().min(0).optional().nullable(),
  totalCost: z.number().min(0, 'Tổng chi phí phải >= 0'),
  paymentDeadline: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => data.supplierId || data.supplier,
  { message: 'Vui lòng chọn NCC hoặc nhập tên NCC', path: ['supplier'] }
);

export type OperatorFormValues = z.infer<typeof operatorFormSchema>;

/**
 * Schema for batch payment approval (Phase 2)
 */
export const approvePaymentSchema = z.object({
  operatorIds: z.array(z.string()).min(1, 'Chọn ít nhất 1 dịch vụ'),
  paymentDate: z.string().min(1, 'Vui lòng chọn ngày thanh toán'),
});

/**
 * Schema for lock period (Phase 3)
 */
export const lockPeriodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Định dạng: YYYY-MM'),
});
