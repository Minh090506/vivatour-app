import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/revenues/[id]/lock - ACCOUNTANT can lock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = body.userId || 'system';

    // TODO: Verify user has revenue:manage permission
    // const user = await getUser(userId);
    // if (!hasPermission(user.role, 'revenue:manage')) {
    //   return NextResponse.json(
    //     { success: false, error: 'Không có quyền khóa thu nhập' },
    //     { status: 403 }
    //   );
    // }

    const revenue = await prisma.revenue.findUnique({ where: { id } });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    if (revenue.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập đã được khóa' },
        { status: 400 }
      );
    }

    const lockedAt = new Date();

    const updated = await prisma.revenue.update({
      where: { id },
      data: {
        isLocked: true,
        lockedAt,
        lockedBy: userId,
      },
      include: {
        request: { select: { code: true, customerName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error locking revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
