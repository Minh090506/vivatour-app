import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateSupplierBalance } from '@/lib/supplier-balance';

// GET /api/suppliers - List suppliers with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.code || !body.name || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: code, name, type' },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existing = await prisma.supplier.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier code already exists' },
        { status: 400 }
      );
    }

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        code: body.code,
        name: body.name,
        type: body.type,
        paymentModel: body.paymentModel || 'PREPAID',
        creditLimit: body.creditLimit ? Number(body.creditLimit) : null,
        paymentTermDays: body.paymentTermDays || null,
        contactName: body.contactName || null,
        contactPhone: body.contactPhone || null,
        contactEmail: body.contactEmail || null,
        bankAccount: body.bankAccount || null,
        isActive: body.isActive ?? true,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
