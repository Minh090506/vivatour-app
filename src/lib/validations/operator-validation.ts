import { z } from 'zod';
import {
  SERVICE_TYPE_KEYS,
  PAYMENT_STATUS_KEYS,
  type ServiceTypeKey,
  type PaymentStatusKey,
} from '@/config/operator-config';

// ============================================
// Operator Form Validation Schema
// Vietnamese error messages for user-facing forms
// ============================================

// Service type enum from config (type-safe)
const serviceTypeEnum = z.enum(SERVICE_TYPE_KEYS as [ServiceTypeKey, ...ServiceTypeKey[]], {
  message: 'Loại dịch vụ không hợp lệ',
});

// Payment status enum from config (type-safe)
const paymentStatusEnum = z.enum(PAYMENT_STATUS_KEYS as [PaymentStatusKey, ...PaymentStatusKey[]], {
  message: 'Trạng thái thanh toán không hợp lệ',
});

// Date string validator - accepts ISO, YYYY-MM-DD, or empty
const dateStringRequired = z
  .string({ message: 'Ngày là bắt buộc' })
  .refine((val) => val && !isNaN(Date.parse(val)), { message: 'Ngày không hợp lệ' });

const dateStringOptional = z
  .string()
  .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Ngày không hợp lệ' })
  .optional()
  .nullable()
  .or(z.literal(''));

// Currency amount validator - auto-rounds to 2 decimal places
// VND typically uses 0 decimals, but we allow 2 for flexibility with foreign currencies
const currencyAmount = (errorMsg: string) =>
  z
    .number({ message: errorMsg })
    .transform((val) => Math.round(val * 100) / 100); // Auto-round to 2 decimals

// Base object schema for operator form data (without refinements)
const operatorFormBaseSchema = z.object({
  // Required fields
  requestId: z
    .string({ message: 'Vui lòng chọn Booking' })
    .min(1, 'Vui lòng chọn Booking'),

  serviceDate: dateStringRequired,

  serviceType: serviceTypeEnum,

  serviceName: z
    .string({ message: 'Tên dịch vụ là bắt buộc' })
    .min(1, 'Vui lòng nhập tên dịch vụ')
    .max(255, 'Tên dịch vụ không được quá 255 ký tự')
    .transform((val) => val.trim()),

  // Supplier - either supplierId or supplier name required
  supplierId: z.string().optional().nullable().or(z.literal('')),
  supplier: z
    .string()
    .max(255, 'Tên NCC không được quá 255 ký tự')
    .optional()
    .nullable()
    .or(z.literal('')),

  // Cost fields - must be positive (no zero-cost services), auto-rounded to 2 decimals
  costBeforeTax: currencyAmount('Chi phí trước thuế phải là số').pipe(
    z.number().positive('Chi phí trước thuế phải lớn hơn 0')
  ),

  vat: currencyAmount('Thuế VAT phải là số')
    .pipe(z.number().min(0, 'Thuế VAT không được âm'))
    .optional()
    .nullable(),

  totalCost: currencyAmount('Tổng chi phí phải là số').pipe(
    z.number().positive('Tổng chi phí phải lớn hơn 0')
  ),

  // Payment fields - auto-rounded to 2 decimals
  paidAmount: currencyAmount('Số tiền thanh toán phải là số')
    .pipe(z.number().min(0, 'Số tiền thanh toán không được âm'))
    .default(0),

  paymentDeadline: dateStringOptional,

  bankAccount: z
    .string()
    .max(255, 'Thông tin tài khoản không được quá 255 ký tự')
    .optional()
    .nullable()
    .or(z.literal('')),

  notes: z
    .string()
    .max(1000, 'Ghi chú không được quá 1000 ký tự')
    .optional()
    .nullable()
    .or(z.literal('')),
});

// Full form schema with refinements (for create)
export const operatorFormSchema = operatorFormBaseSchema
  // Supplier validation: either supplierId or supplier name required
  .refine(
    (data) => data.supplierId || data.supplier,
    {
      message: 'Vui lòng chọn NCC hoặc nhập tên NCC',
      path: ['supplier'],
    }
  )
  // totalCost must >= costBeforeTax
  .refine(
    (data) => data.totalCost >= data.costBeforeTax,
    {
      message: 'Tổng chi phí phải >= chi phí trước thuế',
      path: ['totalCost'],
    }
  )
  // paidAmount must <= totalCost
  .refine(
    (data) => data.paidAmount <= data.totalCost,
    {
      message: 'Số tiền thanh toán không được vượt quá tổng chi phí',
      path: ['paidAmount'],
    }
  )
  // paymentDeadline must >= serviceDate (if both provided)
  .refine(
    (data) => {
      if (data.paymentDeadline && data.serviceDate) {
        return new Date(data.paymentDeadline) >= new Date(data.serviceDate);
      }
      return true;
    },
    {
      message: 'Hạn thanh toán phải từ ngày dịch vụ trở đi',
      path: ['paymentDeadline'],
    }
  );

// Schema for creating new operator (same as form)
export const createOperatorSchema = operatorFormSchema;

// Schema for updating operator (all fields optional - use base schema to allow partial)
export const updateOperatorSchema = operatorFormBaseSchema.partial().extend({
  id: z.string().uuid('ID dịch vụ không hợp lệ').optional(),
});

// Schema for operator filters
export const operatorFiltersSchema = z.object({
  search: z.string().optional(),
  requestId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  serviceType: serviceTypeEnum.optional(),
  paymentStatus: paymentStatusEnum.optional(),
  fromDate: dateStringOptional,
  toDate: dateStringOptional,
  isLocked: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

// ============================================
// Type Exports
// ============================================

export type OperatorFormSchemaData = z.infer<typeof operatorFormSchema>;
export type CreateOperatorData = z.infer<typeof createOperatorSchema>;
export type UpdateOperatorData = z.infer<typeof updateOperatorSchema>;
export type OperatorFiltersData = z.infer<typeof operatorFiltersSchema>;

// Error type for form validation
export interface OperatorFormErrors {
  requestId?: string;
  serviceDate?: string;
  serviceType?: string;
  serviceName?: string;
  supplierId?: string;
  supplier?: string;
  costBeforeTax?: string;
  vat?: string;
  totalCost?: string;
  paidAmount?: string;
  paymentDeadline?: string;
  bankAccount?: string;
  notes?: string;
  _form?: string; // General form error
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate operator form data
 * @param data - Form data to validate
 * @returns Object with success status, validated data or errors
 */
export function validateOperatorForm(data: unknown): {
  success: boolean;
  data?: OperatorFormSchemaData;
  errors?: OperatorFormErrors;
} {
  const result = operatorFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to field-level errors
  const errors: OperatorFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof OperatorFormErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Validate single field (for onBlur validation)
 */
export function validateOperatorField(
  field: keyof OperatorFormSchemaData,
  value: unknown,
  formData?: Partial<OperatorFormSchemaData>
): string | null {
  // For refinements that depend on other fields, we need full form data
  if (formData) {
    const result = operatorFormSchema.safeParse({ ...formData, [field]: value });
    if (!result.success) {
      const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
      return fieldError?.message || null;
    }
    return null;
  }

  // For simple field validation, extract the field schema
  const fieldSchemas: Record<string, z.ZodTypeAny> = {
    requestId: z.string().min(1, 'Vui lòng chọn Booking'),
    serviceDate: dateStringRequired,
    serviceType: serviceTypeEnum,
    serviceName: z.string().min(1, 'Vui lòng nhập tên dịch vụ').max(255),
    costBeforeTax: z.number().positive('Chi phí trước thuế phải lớn hơn 0'),
    vat: z.number().min(0).optional().nullable(),
    totalCost: z.number().positive('Tổng chi phí phải lớn hơn 0'),
    paidAmount: z.number().min(0, 'Số tiền thanh toán không được âm'),
  };

  const schema = fieldSchemas[field];
  if (!schema) return null;

  const result = schema.safeParse(value);
  if (!result.success) {
    return result.error.issues[0]?.message || 'Giá trị không hợp lệ';
  }
  return null;
}

// ============================================
// API Schema (for server-side validation)
// ============================================

// API Create Operator Schema
export const createOperatorApiSchema = z
  .object({
    requestId: z.string({ message: 'Booking là bắt buộc' }).min(1, 'Vui lòng chọn Booking'),
    serviceDate: z
      .string({ message: 'Ngày dịch vụ là bắt buộc' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Ngày dịch vụ không hợp lệ' }),
    serviceType: serviceTypeEnum,
    serviceName: z
      .string({ message: 'Tên dịch vụ là bắt buộc' })
      .min(1, 'Vui lòng nhập tên dịch vụ')
      .max(255),
    supplierId: z.string().uuid().optional().nullable(),
    supplier: z.string().max(255).optional().nullable(),
    costBeforeTax: z.number().positive('Chi phí trước thuế phải lớn hơn 0'),
    vat: z.number().min(0).optional().nullable(),
    totalCost: z.number().positive('Tổng chi phí phải lớn hơn 0'),
    paidAmount: z.number().min(0, 'Số tiền thanh toán không được âm').default(0),
    paymentDeadline: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Hạn thanh toán không hợp lệ' })
      .optional()
      .nullable(),
    bankAccount: z.string().max(255).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) => data.supplierId || data.supplier,
    {
      message: 'Vui lòng chọn NCC hoặc nhập tên NCC',
      path: ['supplier'],
    }
  )
  .refine(
    (data) => data.totalCost >= data.costBeforeTax,
    {
      message: 'Tổng chi phí phải >= chi phí trước thuế',
      path: ['totalCost'],
    }
  )
  .refine(
    (data) => data.paidAmount <= data.totalCost,
    {
      message: 'Số tiền thanh toán không được vượt quá tổng chi phí',
      path: ['paidAmount'],
    }
  );

// API Update Operator Schema (all fields optional)
export const updateOperatorApiSchema = z
  .object({
    supplierId: z.string().uuid().optional().nullable(),
    supplier: z.string().max(255).optional().nullable(),
    serviceDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Ngày dịch vụ không hợp lệ' })
      .optional(),
    serviceType: serviceTypeEnum.optional(),
    serviceName: z.string().min(1).max(255).optional(),
    costBeforeTax: z.number().positive('Chi phí trước thuế phải lớn hơn 0').optional(),
    vat: z.number().min(0).optional().nullable(),
    totalCost: z.number().positive('Tổng chi phí phải lớn hơn 0').optional(),
    paidAmount: z.number().min(0, 'Số tiền thanh toán không được âm').optional(),
    paymentDeadline: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Hạn thanh toán không hợp lệ' })
      .optional()
      .nullable(),
    bankAccount: z.string().max(255).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    userId: z.string().optional(), // For history tracking
  });

export type CreateOperatorApiData = z.infer<typeof createOperatorApiSchema>;
export type UpdateOperatorApiData = z.infer<typeof updateOperatorApiSchema>;

/**
 * Extract field errors from Zod error for API response
 */
export function extractOperatorZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

// ============================================
// Transform Helpers
// ============================================

/**
 * Transform form data - convert empty strings to null
 * Use before API submission
 */
export function transformOperatorFormData(data: OperatorFormSchemaData) {
  return {
    ...data,
    supplierId: data.supplierId || null,
    supplier: data.supplier || null,
    vat: data.vat ?? null,
    paymentDeadline: data.paymentDeadline || null,
    bankAccount: data.bankAccount || null,
    notes: data.notes || null,
  };
}

/**
 * Parse numeric input from form (handles empty string, NaN)
 */
export function parseOperatorNumericInput(
  value: string | number | undefined | null,
  defaultValue: number = 0
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ============================================
// Lock Validation Helpers
// ============================================

/**
 * Lock tier information for operator
 */
export interface OperatorLockInfo {
  lockKT?: boolean;
  lockAdmin?: boolean;
  lockFinal?: boolean;
}

/**
 * Check if operator can be edited based on lock status
 * Uses 3-tier lock system: KT (accountant) < Admin < Final
 * @param operator - Operator lock information
 * @returns Object with canEdit boolean and reason if not editable
 */
export function canEditOperator(operator: OperatorLockInfo): {
  canEdit: boolean;
  reason?: string;
} {
  if (operator.lockFinal) {
    return { canEdit: false, reason: 'Dịch vụ đã khóa cuối cùng - không thể chỉnh sửa' };
  }
  if (operator.lockAdmin) {
    return { canEdit: false, reason: 'Dịch vụ đã khóa bởi Admin - không thể chỉnh sửa' };
  }
  if (operator.lockKT) {
    return { canEdit: false, reason: 'Dịch vụ đã khóa bởi Kế toán - không thể chỉnh sửa' };
  }
  return { canEdit: true };
}

/**
 * Check if operator is locked at any tier
 */
export function isOperatorLocked(operator: OperatorLockInfo): boolean {
  return !!(operator.lockKT || operator.lockAdmin || operator.lockFinal);
}

// ============================================
// Date Range Validation
// ============================================

/**
 * Request date range for service date validation
 */
export interface RequestDateRange {
  startDate: Date | string | null;
  endDate: Date | string | null;
}

/**
 * Validate serviceDate is within booking date range
 * @param serviceDate - Service date to validate (string or Date)
 * @param request - Request with startDate and endDate
 * @returns Object with valid boolean and error message if invalid
 */
export function validateServiceDateInRange(
  serviceDate: string | Date,
  request: RequestDateRange
): { valid: boolean; error?: string } {
  // If no date range defined, allow any date
  if (!request.startDate || !request.endDate) {
    return { valid: true };
  }

  const service = new Date(serviceDate);
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  // Normalize times for comparison (ignore time part)
  service.setHours(12, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (service < start || service > end) {
    const startStr = start.toLocaleDateString('vi-VN');
    const endStr = end.toLocaleDateString('vi-VN');
    return {
      valid: false,
      error: `Ngày dịch vụ phải trong khoảng ${startStr} - ${endStr}`,
    };
  }

  return { valid: true };
}

/**
 * Create operator form schema with request context for date range validation
 * Use this for frontend validation when request data is available
 */
export function createOperatorSchemaWithRequest(request: RequestDateRange) {
  return operatorFormSchema.refine(
    (data) => {
      const result = validateServiceDateInRange(data.serviceDate, request);
      return result.valid;
    },
    {
      message: 'Ngày dịch vụ phải trong khoảng ngày tour của booking',
      path: ['serviceDate'],
    }
  );
}
