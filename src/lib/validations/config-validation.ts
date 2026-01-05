import { z } from 'zod';

// Seller validation schema
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

// FollowUpStatus validation schema
export const followUpStatusSchema = z.object({
  status: z.string().min(1, 'Tên trạng thái không được trống'),
  aliases: z.array(z.string()).default([]),
  daysToFollowup: z.number().int().min(0, 'Số ngày phải >= 0'),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true),
});

// Reorder schema for batch sortOrder update
export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1, 'Cần ít nhất 1 item'),
});

// Inferred types
export type SellerFormData = z.infer<typeof sellerSchema>;
export type FollowUpStatusFormData = z.infer<typeof followUpStatusSchema>;
export type ReorderData = z.infer<typeof reorderSchema>;

// Transform empty strings to null for optional fields
export function transformSellerData(data: SellerFormData) {
  return {
    ...data,
    metaName: data.metaName || null,
    email: data.email || null,
  };
}
