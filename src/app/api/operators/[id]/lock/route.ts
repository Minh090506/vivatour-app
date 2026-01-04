import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';

// POST /api/operators/[id]/lock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = body.userId || 'system';

    const operator = await prisma.operator.findUnique({ where: { id } });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    if (operator.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ đã được khóa' },
        { status: 400 }
      );
    }

    const lockedAt = new Date();

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        isLocked: true,
        lockedAt,
        lockedBy: userId,
      },
    });

    await createOperatorHistory({
      operatorId: id,
      action: 'LOCK',
      changes: {
        isLocked: { before: false, after: true },
        lockedAt: { before: null, after: lockedAt },
        lockedBy: { before: null, after: userId },
      },
      userId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error locking operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa: ${message}` },
      { status: 500 }
    );
  }
}
