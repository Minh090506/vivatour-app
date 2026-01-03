import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateSupplierBalance } from '@/lib/supplier-balance';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/suppliers/[id] - Get supplier detail with balance
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 10, // Recent transactions
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Calculate balance
    const balance = await calculateSupplierBalance(id);

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        ...balance,
      },
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check supplier exists
    const existing = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Check for duplicate code if code is being changed
    if (body.code && body.code !== existing.code) {
      const duplicate = await prisma.supplier.findUnique({
        where: { code: body.code },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Supplier code already exists' },
          { status: 400 }
        );
      }
    }

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        code: body.code ?? existing.code,
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        paymentModel: body.paymentModel ?? existing.paymentModel,
        creditLimit: body.creditLimit !== undefined
          ? (body.creditLimit ? Number(body.creditLimit) : null)
          : undefined,
        paymentTermDays: body.paymentTermDays ?? existing.paymentTermDays,
        contactName: body.contactName ?? existing.contactName,
        contactPhone: body.contactPhone ?? existing.contactPhone,
        contactEmail: body.contactEmail ?? existing.contactEmail,
        bankAccount: body.bankAccount ?? existing.bankAccount,
        isActive: body.isActive ?? existing.isActive,
        notes: body.notes ?? existing.notes,
      },
    });

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers/[id] - Soft delete (deactivate) supplier
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check supplier exists
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { operators: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Warn if supplier has linked operators
    if (existing._count.operators > 0) {
      // Soft delete - just deactivate
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: `Supplier deactivated. Has ${existing._count.operators} linked operators.`,
      });
    }

    // Hard delete if no linked records
    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
