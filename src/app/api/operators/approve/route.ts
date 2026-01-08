import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth-utils';

// POST /api/operators/approve - Batch approve (Accountant/Admin)
export async function POST(request: NextRequest) {
  try {
    // Verify permission - only operator:approve can approve
    const { user, error } = await requirePermission('operator:approve');
    if (error) return error;

    const body = await request.json();

    // Validate
    if (!body.operatorIds || !Array.isArray(body.operatorIds) || body.operatorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn ít nhất 1 dịch vụ' },
        { status: 400 }
      );
    }

    if (!body.paymentDate) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn ngày thanh toán' },
        { status: 400 }
      );
    }

    const paymentDate = new Date(body.paymentDate);

    // Verify all operators exist and are not locked
    const operators = await prisma.operator.findMany({
      where: {
        id: { in: body.operatorIds },
      },
    });

    if (operators.length !== body.operatorIds.length) {
      return NextResponse.json(
        { success: false, error: 'Một số dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    const lockedOps = operators.filter((op) => op.isLocked);
    if (lockedOps.length > 0) {
      return NextResponse.json(
        { success: false, error: `Có ${lockedOps.length} dịch vụ đã khóa` },
        { status: 403 }
      );
    }

    // Update all in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updates = await Promise.all(
        body.operatorIds.map(async (id: string) => {
          const op = operators.find((o) => o.id === id);
          const updated = await tx.operator.update({
            where: { id },
            data: {
              paymentStatus: 'PAID',
              paymentDate,
            },
          });

          // Create history
          await tx.operatorHistory.create({
            data: {
              operatorId: id,
              action: 'APPROVE',
              changes: {
                paymentStatus: { before: op?.paymentStatus || 'PENDING', after: 'PAID' },
                paymentDate: { before: op?.paymentDate, after: paymentDate },
              },
              userId: user!.id,
            },
          });

          return updated;
        })
      );

      return updates;
    });

    return NextResponse.json({
      success: true,
      data: {
        count: result.length,
        totalApproved: result.reduce((sum, op) => sum + Number(op.totalCost), 0),
      },
    });
  } catch (error) {
    console.error('Error batch approving:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi duyệt thanh toán: ${message}` },
      { status: 500 }
    );
  }
}
