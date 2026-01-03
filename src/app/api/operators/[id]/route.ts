import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory, diffObjects } from '@/lib/operator-history';

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

    return NextResponse.json({ success: true, data: operator });
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

    // Prepare update data - only update fields that are provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (body.supplierId !== undefined) updateData.supplierId = body.supplierId || null;
    if (body.serviceDate !== undefined) updateData.serviceDate = new Date(body.serviceDate);
    if (body.serviceType !== undefined) updateData.serviceType = body.serviceType;
    if (body.serviceName !== undefined) updateData.serviceName = body.serviceName.trim();
    if (body.supplier !== undefined) updateData.supplier = body.supplier?.trim() || null;
    if (body.costBeforeTax !== undefined) updateData.costBeforeTax = Number(body.costBeforeTax);
    if (body.vat !== undefined) updateData.vat = body.vat !== null ? Number(body.vat) : null;
    if (body.totalCost !== undefined) updateData.totalCost = Number(body.totalCost);
    if (body.paymentDeadline !== undefined) {
      updateData.paymentDeadline = body.paymentDeadline ? new Date(body.paymentDeadline) : null;
    }
    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount?.trim() || null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

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
        userId: body.userId || 'system',
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
