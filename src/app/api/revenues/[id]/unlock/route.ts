import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// POST /api/revenues/[id]/unlock - ADMIN only
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Verify user is ADMIN
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Chỉ Admin được mở khóa thu nhập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const revenue = await prisma.revenue.findUnique({ where: { id } });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    if (!revenue.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập chưa được khóa' },
        { status: 400 }
      );
    }

    const updated = await prisma.revenue.update({
      where: { id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
      include: {
        request: { select: { code: true, customerName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error unlocking revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi mở khóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
