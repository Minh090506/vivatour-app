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
  message: 'Loai thanh toan khong hop le',
});

const paymentSourceEnum = z.enum(PAYMENT_SOURCE_KEYS as [PaymentSourceKey, ...PaymentSourceKey[]], {
  message: 'Nguon thanh toan khong hop le',
});

const currencyEnum = z.enum(CURRENCY_KEYS as [CurrencyKey, ...CurrencyKey[]], {
  message: 'Loai tien te khong hop le',
});

// Date string validator
const dateStringRequired = z
  .string({ message: 'Ngay la bat buoc' })
  .refine((val) => val && !isNaN(Date.parse(val)), { message: 'Ngay khong hop le' });

// ============================================
// API Schemas
// ============================================

// Create Revenue API Schema
export const createRevenueApiSchema = z
  .object({
    requestId: z
      .string({ message: 'Booking la bat buoc' })
      .min(1, 'Vui long chon Booking'),
    paymentDate: dateStringRequired,
    paymentType: paymentTypeEnum,
    paymentSource: paymentSourceEnum,
    currency: currencyEnum.default('VND'),
    foreignAmount: z
      .number({ message: 'So tien ngoai te phai la so' })
      .positive('So tien ngoai te phai > 0')
      .optional()
      .nullable(),
    exchangeRate: z
      .number({ message: 'Ty gia phai la so' })
      .positive('Ty gia phai > 0')
      .optional()
      .nullable(),
    amountVND: z
      .number({ message: 'So tien VND phai la so' })
      .positive('So tien VND phai > 0')
      .optional(),
    notes: z
      .string()
      .max(1000, 'Ghi chu khong duoc qua 1000 ky tu')
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
      message: 'So tien ngoai te la bat buoc khi dung ngoai te',
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
      message: 'Ty gia la bat buoc khi dung ngoai te',
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
      message: 'So tien VND phai > 0',
      path: ['amountVND'],
    }
  );

// Update Revenue API Schema (partial - all fields optional)
export const updateRevenueApiSchema = z
  .object({
    paymentDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Ngay khong hop le' })
      .optional(),
    paymentType: paymentTypeEnum.optional(),
    paymentSource: paymentSourceEnum.optional(),
    currency: currencyEnum.optional(),
    foreignAmount: z
      .number()
      .positive('So tien ngoai te phai > 0')
      .optional()
      .nullable(),
    exchangeRate: z
      .number()
      .positive('Ty gia phai > 0')
      .optional()
      .nullable(),
    amountVND: z
      .number()
      .positive('So tien VND phai > 0')
      .optional(),
    notes: z
      .string()
      .max(1000, 'Ghi chu khong duoc qua 1000 ky tu')
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
