import { z } from 'zod';

// Seller form validation schema
export const sellerSchema = z.object({
  telegramId: z.string().min(1, 'Telegram ID không được trống'),
  sellerName: z.string().min(1, 'Tên seller không được trống'),
  sheetName: z.string().min(1, 'Tên sheet không được trống'),
  metaName: z.string().optional().nullable(),
  email: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE'], { message: 'Giới tính không hợp lệ' }),
  sellerCode: z
    .string()
    .min(1, 'Mã seller không được trống')
    .max(2, 'Mã seller tối đa 2 ký tự')
    .regex(/^[A-Z]{1,2}$/, 'Mã seller phải là 1-2 ký tự in hoa (A-Z)'),
  isActive: z.boolean().optional().default(true),
});

export type SellerFormData = z.infer<typeof sellerSchema>;

// Transform empty strings to null for optional fields
export function transformSellerData(data: SellerFormData) {
  return {
    ...data,
    metaName: data.metaName || null,
    email: data.email || null,
  };
}
