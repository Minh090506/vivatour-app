import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/supplier-transactions - List transactions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId') || '';
    const type = searchParams.get('type') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (supplierId) where.supplierId = supplierId;
    if (type) where.type = type;

    if (fromDate || toDate) {
      where.transactionDate = {};
      if (fromDate) (where.transactionDate as Record<string, Date>).gte = new Date(fromDate);
      if (toDate) (where.transactionDate as Record<string, Date>).lte = new Date(toDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.supplierTransaction.findMany({
        where,
        include: {
          supplier: {
            select: { code: true, name: true },
          },
        },
        orderBy: { transactionDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.supplierTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      total,
      hasMore: offset + transactions.length < total,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/supplier-transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.supplierId || !body.type || !body.amount || !body.transactionDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplierId, type, amount, transactionDate' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['DEPOSIT', 'REFUND', 'ADJUSTMENT', 'FEE'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: body.supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Create transaction
    const transaction = await prisma.supplierTransaction.create({
      data: {
        supplierId: body.supplierId,
        type: body.type,
        amount: Number(body.amount),
        transactionDate: new Date(body.transactionDate),
        description: body.description || null,
        proofLink: body.proofLink || null,
        relatedBookingCode: body.relatedBookingCode || null,
        createdBy: body.createdBy || 'system', // TODO: Get from auth
      },
      include: {
        supplier: {
          select: { code: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
