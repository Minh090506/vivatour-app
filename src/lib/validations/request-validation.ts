import { z } from 'zod';
import {
  REQUEST_STATUS_KEYS,
  REQUEST_STAGE_KEYS,
  type RequestStatus,
  type RequestStage,
} from '@/config/request-config';

// ============================================
// Request Form Validation Schema
// Vietnamese error messages for user-facing forms
// ============================================

// Status enum from config (type-safe)
const requestStatusEnum = z.enum(REQUEST_STATUS_KEYS as [RequestStatus, ...RequestStatus[]], {
  message: 'Trạng thái không hợp lệ',
});

// Stage enum from config (type-safe)
const requestStageEnum = z.enum(REQUEST_STAGE_KEYS as [RequestStage, ...RequestStage[]], {
  message: 'Giai đoạn không hợp lệ',
});

// Phone regex: international format or Vietnamese format
const phoneRegex = /^(\+?[0-9]{8,15}|0[0-9]{9,10})$/;

// Base schema for request form data
export const requestFormSchema = z
  .object({
    // Required fields
    customerName: z
      .string()
      .min(2, 'Tên khách hàng phải có ít nhất 2 ký tự')
      .max(100, 'Tên khách hàng không được quá 100 ký tự')
      .transform((val) => val.trim()),

    contact: z
      .string()
      .min(1, 'Thông tin liên hệ không được trống')
      .max(255, 'Thông tin liên hệ không được quá 255 ký tự')
      .transform((val) => val.trim()),

    country: z
      .string()
      .min(1, 'Quốc gia không được trống')
      .max(100, 'Quốc gia không được quá 100 ký tự')
      .transform((val) => val.trim()),

    source: z
      .string()
      .min(1, 'Nguồn không được trống')
      .max(100, 'Nguồn không được quá 100 ký tự')
      .transform((val) => val.trim()),

    pax: z
      .number({ message: 'Số khách phải là số' })
      .int('Số khách phải là số nguyên')
      .min(1, 'Số khách phải ít nhất 1')
      .max(100, 'Số khách không được quá 100'),

    status: requestStatusEnum,

    // Optional fields
    whatsapp: z
      .string()
      .regex(phoneRegex, 'Số WhatsApp không hợp lệ (8-15 số)')
      .optional()
      .nullable()
      .or(z.literal('')),

    stage: requestStageEnum.optional(),

    tourDays: z
      .number({ message: 'Số ngày tour phải là số' })
      .int('Số ngày tour phải là số nguyên')
      .min(1, 'Số ngày tour phải ít nhất 1')
      .max(365, 'Số ngày tour không được quá 365')
      .optional()
      .nullable(),

    startDate: z
      .string()
      .datetime({ message: 'Ngày bắt đầu không hợp lệ' })
      .optional()
      .nullable()
      .or(z.literal('')),

    endDate: z
      .string()
      .datetime({ message: 'Ngày kết thúc không hợp lệ' })
      .optional()
      .nullable()
      .or(z.literal('')),

    expectedDate: z
      .string()
      .datetime({ message: 'Ngày dự kiến không hợp lệ' })
      .optional()
      .nullable()
      .or(z.literal('')),

    expectedRevenue: z
      .number({ message: 'Doanh thu dự kiến phải là số' })
      .min(0, 'Doanh thu dự kiến không được âm')
      .optional()
      .nullable(),

    expectedCost: z
      .number({ message: 'Chi phí dự kiến phải là số' })
      .min(0, 'Chi phí dự kiến không được âm')
      .optional()
      .nullable(),

    lastContactDate: z
      .string()
      .datetime({ message: 'Ngày liên hệ cuối không hợp lệ' })
      .optional()
      .nullable()
      .or(z.literal('')),

    notes: z
      .string()
      .max(1000, 'Ghi chú không được quá 1000 ký tự')
      .optional()
      .nullable()
      .or(z.literal('')),

    // Seller assignment (for ADMIN creating on behalf)
    sellerId: z.string().uuid('ID seller không hợp lệ').optional().nullable(),
  })
  .refine(
    (data) => {
      // If both startDate and endDate are provided, endDate must be >= startDate
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
      path: ['endDate'],
    }
  );

// Schema for creating new request (stricter - requires status)
export const createRequestSchema = requestFormSchema;

// Schema for updating request (all fields optional except id)
export const updateRequestSchema = requestFormSchema.partial().extend({
  id: z.string().uuid('ID yêu cầu không hợp lệ'),
});

// Schema for request filters (search/list page)
export const requestFiltersSchema = z.object({
  search: z.string().optional(),
  sellerId: z.string().uuid().optional().nullable(),
  status: requestStatusEnum.optional(),
  stage: requestStageEnum.optional(),
  source: z.string().optional(),
  country: z.string().optional(),
  fromDate: z.string().datetime().optional().nullable(),
  toDate: z.string().datetime().optional().nullable(),
  followup: z.enum(['overdue', 'today', 'upcoming']).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

// ============================================
// Type Exports
// ============================================

export type RequestFormData = z.infer<typeof requestFormSchema>;
export type CreateRequestData = z.infer<typeof createRequestSchema>;
export type UpdateRequestData = z.infer<typeof updateRequestSchema>;
export type RequestFilters = z.infer<typeof requestFiltersSchema>;

// Error type for form validation
export interface RequestFormErrors {
  customerName?: string;
  contact?: string;
  whatsapp?: string;
  pax?: string;
  country?: string;
  source?: string;
  status?: string;
  stage?: string;
  tourDays?: string;
  startDate?: string;
  endDate?: string;
  expectedDate?: string;
  expectedRevenue?: string;
  expectedCost?: string;
  lastContactDate?: string;
  notes?: string;
  sellerId?: string;
  _form?: string; // General form error
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate request form data
 * @param data - Form data to validate
 * @returns Object with success status, validated data or errors
 */
export function validateRequestForm(data: unknown): {
  success: boolean;
  data?: RequestFormData;
  errors?: RequestFormErrors;
} {
  const result = requestFormSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to field-level errors
  const errors: RequestFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RequestFormErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Validate create request data
 * @param data - Data to validate for creating new request
 */
export function validateCreateRequest(data: unknown): {
  success: boolean;
  data?: CreateRequestData;
  errors?: RequestFormErrors;
} {
  const result = createRequestSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: RequestFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RequestFormErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Validate update request data
 * @param data - Data to validate for updating request
 */
export function validateUpdateRequest(data: unknown): {
  success: boolean;
  data?: UpdateRequestData;
  errors?: RequestFormErrors & { id?: string };
} {
  const result = updateRequestSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: RequestFormErrors & { id?: string } = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof (RequestFormErrors & { id?: string });
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Validate request filters
 * @param params - Filter parameters from URL or form
 */
export function validateRequestFilters(params: unknown): {
  success: boolean;
  data?: RequestFilters;
  errors?: Record<string, string>;
} {
  const result = requestFiltersSchema.safeParse(params);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}

// ============================================
// Transform Helpers
// ============================================

/**
 * Transform form data - convert empty strings to null
 * Use before API submission
 */
export function transformRequestFormData(data: RequestFormData) {
  return {
    ...data,
    whatsapp: data.whatsapp || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    expectedDate: data.expectedDate || null,
    lastContactDate: data.lastContactDate || null,
    notes: data.notes || null,
    sellerId: data.sellerId || null,
    tourDays: data.tourDays ?? null,
    expectedRevenue: data.expectedRevenue ?? null,
    expectedCost: data.expectedCost ?? null,
  };
}

/**
 * Parse numeric input from form (handles empty string, NaN)
 * @param value - Input value from form
 * @param defaultValue - Default if parsing fails (null for optional fields)
 */
export function parseNumericInput(
  value: string | number | undefined | null,
  defaultValue: number | null = null
): number | null {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse integer input from form
 */
export function parseIntegerInput(
  value: string | number | undefined | null,
  defaultValue: number | null = null
): number | null {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = typeof value === 'number' ? Math.floor(value) : parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ============================================
// API Schema (for server-side validation)
// Dates as strings (ISO or YYYY-MM-DD), looser than form schema
// ============================================

// Date string validator - accepts ISO, YYYY-MM-DD, or empty
const dateStringOptional = z
  .string()
  .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Ngày không hợp lệ' })
  .optional()
  .nullable();

// API Create Request Schema
export const createRequestApiSchema = z.object({
  customerName: z
    .string({ message: 'Tên khách hàng là bắt buộc' })
    .min(2, 'Tên khách hàng phải có ít nhất 2 ký tự')
    .max(100, 'Tên khách hàng không được quá 100 ký tự'),

  contact: z
    .string({ message: 'Thông tin liên hệ là bắt buộc' })
    .min(1, 'Thông tin liên hệ không được trống')
    .max(255, 'Thông tin liên hệ không được quá 255 ký tự'),

  country: z
    .string({ message: 'Quốc gia là bắt buộc' })
    .min(1, 'Quốc gia không được trống')
    .max(100, 'Quốc gia không được quá 100 ký tự'),

  source: z
    .string({ message: 'Nguồn là bắt buộc' })
    .min(1, 'Nguồn không được trống')
    .max(100, 'Nguồn không được quá 100 ký tự'),

  status: requestStatusEnum.optional().default('DANG_LL_CHUA_TL'),

  whatsapp: z.string().max(50).optional().nullable(),
  pax: z.number().int().min(1).max(100).optional().default(1),
  tourDays: z.number().int().min(1).max(365).optional().nullable(),
  startDate: dateStringOptional,
  expectedDate: dateStringOptional,
  expectedRevenue: z.number().min(0).optional().nullable(),
  expectedCost: z.number().min(0).optional().nullable(),
  lastContactDate: dateStringOptional,
  notes: z.string().max(1000).optional().nullable(),
  sellerId: z.string().uuid().optional().nullable(),
});

// API Update Request Schema (all fields optional)
export const updateRequestApiSchema = createRequestApiSchema.partial().extend({
  // Additional fields for updates
  statusChangedBy: z.string().optional(),
  nextFollowUp: dateStringOptional,
});

export type CreateRequestApiData = z.infer<typeof createRequestApiSchema>;
export type UpdateRequestApiData = z.infer<typeof updateRequestApiSchema>;

/**
 * Extract field errors from Zod error for API response
 */
export function extractZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
