import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateSupplierCode,
  SUPPLIER_TYPES,
  type SupplierTypeKey,
  type SupplierLocationKey,
} from '@/config/supplier-config';

// GET /api/suppliers/generate-code?type=HOTEL&name=An Khanh&location=DA_NANG
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as SupplierTypeKey;
    const name = searchParams.get('name') || '';
    const location = searchParams.get('location') as SupplierLocationKey | null;

    // Validate required fields
    if (!type || !name) {
      return NextResponse.json(
        { success: false, error: 'Cần có loại NCC và tên để tạo mã' },
        { status: 400 }
      );
    }

    // Validate type is valid
    if (!(type in SUPPLIER_TYPES)) {
      return NextResponse.json(
        { success: false, error: `Loại NCC không hợp lệ: ${type}` },
        { status: 400 }
      );
    }

    // Generate base code with sequence 1
    const baseCode = generateSupplierCode(type, name, location, 1);
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

    const generatedCode = generateSupplierCode(type, name, location, nextSequence);

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
