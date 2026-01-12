import { z } from 'zod';
import {
  PAYMENT_TYPE_KEYS,
  PAYMENT_SOURCE_KEYS,
  CURRENCY_KEYS,
  type PaymentTypeKey,
  type PaymentSourceKey,
  type CurrencyKey,
} from '@/config/revenue-config';

// ============================================
// Revenue Form Validation Schema
// Vietnamese error messages for user-facing forms
// ============================================

// Enum validators from config
const paymentTypeEnum = z.enum(PAYMENT_TYPE_KEYS as [PaymentTypeKey, ...PaymentTypeKey[]], {
  message: 'Loại thanh toán không hợp lệ',
});

const paymentSourceEnum = z.enum(PAYMENT_SOURCE_KEYS as [PaymentSourceKey, ...PaymentSourceKey[]], {
  message: 'Nguồn thanh toán không hợp lệ',
});

const currencyEnum = z.enum(CURRENCY_KEYS as [CurrencyKey, ...CurrencyKey[]], {
  message: 'Loại tiền tệ không hợp lệ',
});

// Date string validator
const dateStringRequired = z
  .string({ message: 'Ngày là bắt buộc' })
  .refine((val) => val && !isNaN(Date.parse(val)), { message: 'Ngày không hợp lệ' });

// ============================================
// API Schemas
// ============================================

// Create Revenue API Schema
export const createRevenueApiSchema = z
  .object({
    requestId: z
      .string({ message: 'Booking là bắt buộc' })
      .min(1, 'Vui lòng chọn Booking'),
    paymentDate: dateStringRequired,
    paymentType: paymentTypeEnum,
    paymentSource: paymentSourceEnum,
    currency: currencyEnum.default('VND'),
    foreignAmount: z
      .number({ message: 'Số tiền ngoại tệ phải là số' })
      .positive('Số tiền ngoại tệ phải > 0')
      .optional()
      .nullable(),
    exchangeRate: z
      .number({ message: 'Tỷ giá phải là số' })
      .positive('Tỷ giá phải > 0')
      .optional()
      .nullable(),
    amountVND: z
      .number({ message: 'Số tiền VND phải là số' })
      .positive('Số tiền VND phải > 0')
      .optional(),
    notes: z
      .string()
      .max(1000, 'Ghi chú không được quá 1000 ký tự')
      .optional()
      .nullable(),
  })
  // Foreign currency validation: foreignAmount and exchangeRate required when not VND
  .refine(
    (data) => {
      if (data.currency !== 'VND') {
        return data.foreignAmount && data.foreignAmount > 0;
      }
      return true;
    },
    {
      message: 'Số tiền ngoại tệ là bắt buộc khi dùng ngoại tệ',
      path: ['foreignAmount'],
    }
  )
  .refine(
    (data) => {
      if (data.currency !== 'VND') {
        return data.exchangeRate && data.exchangeRate > 0;
      }
      return true;
    },
    {
      message: 'Tỷ giá là bắt buộc khi dùng ngoại tệ',
      path: ['exchangeRate'],
    }
  )
  // VND amount validation: required when currency is VND
  .refine(
    (data) => {
      if (data.currency === 'VND') {
        return data.amountVND && data.amountVND > 0;
      }
      return true;
    },
    {
      message: 'Số tiền VND phải > 0',
      path: ['amountVND'],
    }
  );

// Update Revenue API Schema (partial - all fields optional)
export const updateRevenueApiSchema = z
  .object({
    paymentDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Ngày không hợp lệ' })
      .optional(),
    paymentType: paymentTypeEnum.optional(),
    paymentSource: paymentSourceEnum.optional(),
    currency: currencyEnum.optional(),
    foreignAmount: z
      .number()
      .positive('Số tiền ngoại tệ phải > 0')
      .optional()
      .nullable(),
    exchangeRate: z
      .number()
      .positive('Tỷ giá phải > 0')
      .optional()
      .nullable(),
    amountVND: z
      .number()
      .positive('Số tiền VND phải > 0')
      .optional(),
    notes: z
      .string()
      .max(1000, 'Ghi chú không được quá 1000 ký tự')
      .optional()
      .nullable(),
  });

// ============================================
// Type Exports
// ============================================

export type CreateRevenueApiData = z.infer<typeof createRevenueApiSchema>;
export type UpdateRevenueApiData = z.infer<typeof updateRevenueApiSchema>;

// Error type for form validation
export interface RevenueFormErrors {
  requestId?: string;
  paymentDate?: string;
  paymentType?: string;
  paymentSource?: string;
  currency?: string;
  foreignAmount?: string;
  exchangeRate?: string;
  amountVND?: string;
  notes?: string;
  _form?: string;
}

// ============================================
// Validation Functions
// ============================================

/**
 * Extract field errors from Zod error for API response
 */
export function extractRevenueZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/**
 * Validate create revenue data
 */
export function validateCreateRevenue(data: unknown): {
  success: boolean;
  data?: CreateRevenueApiData;
  errors?: Record<string, string>;
} {
  const result = createRevenueApiSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: extractRevenueZodErrors(result.error) };
}

/**
 * Validate update revenue data
 */
export function validateUpdateRevenue(data: unknown): {
  success: boolean;
  data?: UpdateRevenueApiData;
  errors?: Record<string, string>;
} {
  const result = updateRevenueApiSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: extractRevenueZodErrors(result.error) };
}
