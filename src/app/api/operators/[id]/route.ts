import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory, diffObjects } from '@/lib/operator-history';
import {
  updateOperatorApiSchema,
  extractOperatorZodErrors,
} from '@/lib/validations/operator-validation';

// GET /api/operators/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const operator = await prisma.operator.findUnique({
      where: { id },
      include: {
        request: { select: { code: true, customerName: true, status: true } },
        supplierRef: { select: { code: true, name: true, paymentModel: true, bankAccount: true } },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    // Compute debt = totalCost - paidAmount
    const totalCost = Number(operator.totalCost) || 0;
    const paidAmount = Number(operator.paidAmount) || 0;
    const debt = totalCost - paidAmount;

    return NextResponse.json({
      success: true,
      data: { ...operator, debt }
    });
  } catch (error) {
    console.error('Error fetching operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải dịch vụ: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/operators/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate with Zod schema
    const validation = updateOperatorApiSchema.safeParse(body);
    if (!validation.success) {
      const errors = extractOperatorZodErrors(validation.error);
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Get existing operator
    const existing = await prisma.operator.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã khóa, không thể chỉnh sửa' },
        { status: 403 }
      );
    }

    // Prepare update data from validated input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (validatedData.supplierId !== undefined) updateData.supplierId = validatedData.supplierId || null;
    if (validatedData.serviceDate !== undefined) updateData.serviceDate = new Date(validatedData.serviceDate);
    if (validatedData.serviceType !== undefined) updateData.serviceType = validatedData.serviceType;
    if (validatedData.serviceName !== undefined) updateData.serviceName = validatedData.serviceName.trim();
    if (validatedData.supplier !== undefined) updateData.supplier = validatedData.supplier?.trim() || null;
    if (validatedData.costBeforeTax !== undefined) updateData.costBeforeTax = validatedData.costBeforeTax;
    if (validatedData.vat !== undefined) updateData.vat = validatedData.vat ?? null;
    if (validatedData.totalCost !== undefined) updateData.totalCost = validatedData.totalCost;
    if (validatedData.paymentDeadline !== undefined) {
      updateData.paymentDeadline = validatedData.paymentDeadline ? new Date(validatedData.paymentDeadline) : null;
    }
    if (validatedData.bankAccount !== undefined) updateData.bankAccount = validatedData.bankAccount?.trim() || null;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes?.trim() || null;

    // Handle paidAmount with cross-field validation
    if (validatedData.paidAmount !== undefined) {
      const paidAmount = validatedData.paidAmount;
      const totalCost = validatedData.totalCost !== undefined
        ? validatedData.totalCost
        : Number(existing.totalCost);

      // Additional cross-field validation
      if (paidAmount > totalCost) {
        return NextResponse.json(
          { success: false, error: 'Số tiền thanh toán không được lớn hơn tổng chi phí', errors: { paidAmount: 'Vượt quá tổng chi phí' } },
          { status: 400 }
        );
      }
      updateData.paidAmount = paidAmount;

      // Auto-update paymentStatus based on paidAmount
      if (paidAmount === 0) {
        updateData.paymentStatus = 'PENDING';
      } else if (paidAmount >= totalCost) {
        updateData.paymentStatus = 'PAID';
      } else {
        updateData.paymentStatus = 'PARTIAL';
      }
    }

    // Update operator
    const operator = await prisma.operator.update({
      where: { id },
      data: updateData,
      include: {
        request: { select: { code: true, customerName: true } },
        supplierRef: { select: { code: true, name: true } },
      },
    });

    // Create history entry if there are changes
    const changes = diffObjects(
      JSON.parse(JSON.stringify(existing)),
      JSON.parse(JSON.stringify(operator))
    );

    if (Object.keys(changes).length > 0) {
      await createOperatorHistory({
        operatorId: id,
        action: 'UPDATE',
        changes,
        userId: validatedData.userId || 'system',
      });
    }

    return NextResponse.json({ success: true, data: operator });
  } catch (error) {
    console.error('Error updating operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi cập nhật: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/operators/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'system';

    // Get existing
    const existing = await prisma.operator.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã khóa, không thể xóa' },
        { status: 403 }
      );
    }

    // Create history before delete
    await createOperatorHistory({
      operatorId: id,
      action: 'DELETE',
      changes: { deleted: { before: { id: existing.id, serviceName: existing.serviceName }, after: null } },
      userId,
    });

    // Delete operator (history will cascade delete)
    await prisma.operator.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa: ${message}` },
      { status: 500 }
    );
  }
}
