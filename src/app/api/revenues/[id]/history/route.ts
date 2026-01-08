import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { getRevenueHistory } from '@/lib/revenue-history';
import { prisma } from '@/lib/db';

// GET /api/revenues/[id]/history - Get revenue history with user names
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Permission check
    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền xem lịch sử' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify revenue exists
    const revenue = await prisma.revenue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    // Get history with user names
    const history = await getRevenueHistory(id);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching revenue history:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải lịch sử: ${message}` },
      { status: 500 }
    );
  }
}
