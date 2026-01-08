import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import { requireAdmin } from '@/lib/auth-utils';

// POST /api/operators/[id]/unlock - Admin only
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin role - only admins can unlock operators
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const operator = await prisma.operator.findUnique({ where: { id } });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ không tồn tại' },
        { status: 404 }
      );
    }

    if (!operator.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Dịch vụ chưa được khóa' },
        { status: 400 }
      );
    }

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
    });

    await createOperatorHistory({
      operatorId: id,
      action: 'UNLOCK',
      changes: {
        isLocked: { before: true, after: false },
        lockedAt: { before: operator.lockedAt, after: null },
        lockedBy: { before: operator.lockedBy, after: null },
      },
      userId: user!.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error unlocking operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi mở khóa: ${message}` },
      { status: 500 }
    );
  }
}
