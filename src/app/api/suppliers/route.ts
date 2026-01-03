import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateSupplierBalance } from '@/lib/supplier-balance';
import {
  generateSupplierCode,
  SUPPLIER_TYPES,
  type SupplierTypeKey,
  type SupplierLocationKey,
} from '@/config/supplier-config';

// GET /api/suppliers - List suppliers with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const location = searchParams.get('location') || '';
    const paymentModel = searchParams.get('paymentModel') || '';
    const isActive = searchParams.get('isActive');
    const includeBalance = searchParams.get('includeBalance') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (location) where.location = location;
    if (paymentModel) where.paymentModel = paymentModel;
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    // Include balance if requested
    let result = suppliers;
    if (includeBalance) {
      result = await Promise.all(
        suppliers.map(async (supplier) => {
          const balance = await calculateSupplierBalance(supplier.id);
          return { ...supplier, balance: balance.balance };
        })
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch suppliers: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: Tên NCC và Loại NCC' },
        { status: 400 }
      );
    }

    // Validate type is valid
    if (!(body.type in SUPPLIER_TYPES)) {
      return NextResponse.json(
        { success: false, error: `Loại NCC không hợp lệ: ${body.type}` },
        { status: 400 }
      );
    }

    // Generate code if not provided or generate next sequence
    let code = body.code;
    if (!code) {
      // Find existing suppliers with similar prefix to get next sequence
      const typeKey = body.type as SupplierTypeKey;
      const locationKey = body.location as SupplierLocationKey | null;

      // Generate base code with sequence 1
      const baseCode = generateSupplierCode(typeKey, body.name, locationKey, 1);
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

      code = generateSupplierCode(typeKey, body.name, locationKey, nextSequence);
    }

    // Check for duplicate code
    const existing = await prisma.supplier.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Mã NCC đã tồn tại: ${code}` },
        { status: 400 }
      );
    }

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        code,
        name: body.name.trim(),
        type: body.type,
        location: body.location || null,
        paymentModel: body.paymentModel || 'PREPAID',
        creditLimit: body.creditLimit ? Number(body.creditLimit) : null,
        paymentTermDays: body.paymentTermDays ? Number(body.paymentTermDays) : null,
        contactName: body.contactName?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        bankAccount: body.bankAccount?.trim() || null,
        isActive: body.isActive ?? true,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo NCC: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/suppliers/generate-code - Generate supplier code preview
export async function generateCodePreview(
  type: SupplierTypeKey,
  name: string,
  location?: SupplierLocationKey | null
): Promise<string> {
  const baseCode = generateSupplierCode(type, name, location, 1);
  const codePrefix = baseCode.substring(0, baseCode.lastIndexOf('-'));

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

  return generateSupplierCode(type, name, location, nextSequence);
}
