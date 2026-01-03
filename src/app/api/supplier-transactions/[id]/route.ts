import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/supplier-transactions/[id] - Get transaction detail
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const transaction = await prisma.supplierTransaction.findUnique({
      where: { id },
      include: {
        supplier: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

// PUT /api/supplier-transactions/[id] - Update transaction
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check transaction exists
    const existing = await prisma.supplierTransaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Validate amount if provided
    if (body.amount !== undefined && body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Validate type if provided
    if (body.type) {
      const validTypes = ['DEPOSIT', 'REFUND', 'ADJUSTMENT', 'FEE'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update transaction
    const transaction = await prisma.supplierTransaction.update({
      where: { id },
      data: {
        type: body.type ?? existing.type,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        transactionDate: body.transactionDate
          ? new Date(body.transactionDate)
          : existing.transactionDate,
        description: body.description ?? existing.description,
        proofLink: body.proofLink ?? existing.proofLink,
        relatedBookingCode: body.relatedBookingCode ?? existing.relatedBookingCode,
      },
      include: {
        supplier: {
          select: { code: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/supplier-transactions/[id] - Delete transaction
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check transaction exists
    const existing = await prisma.supplierTransaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Delete transaction
    await prisma.supplierTransaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
