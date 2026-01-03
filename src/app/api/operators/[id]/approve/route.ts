import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';

// POST /api/operators/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const operator = await prisma.operator.findUnique({ where: { id } });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    if (operator.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã khóa' },
        { status: 403 }
      );
    }

    if (operator.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã được thanh toán' },
        { status: 400 }
      );
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const userId = body.userId || 'system';

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        paymentDate,
      },
    });

    await createOperatorHistory({
      operatorId: id,
      action: 'APPROVE',
      changes: {
        paymentStatus: { before: operator.paymentStatus, after: 'PAID' },
        paymentDate: { before: operator.paymentDate, after: paymentDate },
      },
      userId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error approving operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi duyệt: ${message}` },
      { status: 500 }
    );
  }
}
