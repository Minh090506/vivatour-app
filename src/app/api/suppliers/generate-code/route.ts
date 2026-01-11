import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  generateSupplierCode,
  SUPPLIER_TYPES,
  type SupplierTypeKey,
  type SupplierLocationKey,
} from '@/config/supplier-config';
import { extractZodErrors } from '@/lib/validations/request-validation';

// Zod schema for query params validation
const generateCodeQuerySchema = z.object({
  type: z.enum(Object.keys(SUPPLIER_TYPES) as [string, ...string[]], {
    message: 'Loại NCC không hợp lệ',
  }),
  name: z.string().min(1, 'Tên NCC là bắt buộc'),
  location: z.string().optional().nullable(),
});

// GET /api/suppliers/generate-code?type=HOTEL&name=An Khanh&location=DA_NANG
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate with Zod schema
    const validation = generateCodeQuerySchema.safeParse({
      type: searchParams.get('type'),
      name: searchParams.get('name'),
      location: searchParams.get('location'),
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dữ liệu không hợp lệ',
          details: extractZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { type, name, location } = validation.data;
    const supplierType = type as SupplierTypeKey;
    const supplierLocation = location as SupplierLocationKey | null;

    // Generate base code with sequence 1
    const baseCode = generateSupplierCode(supplierType, name, supplierLocation, 1);
    const codePrefix = baseCode.substring(0, baseCode.lastIndexOf('-'));

    // Find existing suppliers with same prefix
    const existingSuppliers = await prisma.supplier.findMany({
      where: {
        code: { startsWith: codePrefix },
      },
      orderBy: { code: 'desc' },
      take: 1,
    });

    let nextSequence = 1;
    if (existingSuppliers.length > 0) {
      const lastCode = existingSuppliers[0].code;
      const lastSequence = parseInt(lastCode.split('-').pop() || '0', 10);
      nextSequence = lastSequence + 1;
    }

    const generatedCode = generateSupplierCode(supplierType, name, supplierLocation, nextSequence);

    return NextResponse.json({
      success: true,
      data: {
        code: generatedCode,
        prefix: codePrefix,
        sequence: nextSequence,
      },
    });
  } catch (error) {
    console.error('Error generating supplier code:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo mã NCC: ${message}` },
      { status: 500 }
    );
  }
}
