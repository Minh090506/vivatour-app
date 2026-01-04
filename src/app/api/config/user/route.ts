import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Note: In production, use proper auth middleware to get current user
// For now, we check role from query param or header (to be replaced with proper auth)

// GET /api/config/user - List all user configs (admin only)
export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with proper auth check when auth system is implemented
    // For now, allow access (will be secured later)
    const configs = await prisma.configUser.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error fetching user configs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải cấu hình người dùng: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/config/user - Create/update user config (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.sellerCode) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: userId, sellerCode' },
        { status: 400 }
      );
    }

    // Validate sellerCode format (single char A-Z)
    if (!/^[A-Z]$/.test(body.sellerCode)) {
      return NextResponse.json(
        { success: false, error: 'Mã seller phải là 1 ký tự chữ in hoa (A-Z)' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    // Check if sellerCode is already used by another user
    const existingCode = await prisma.configUser.findFirst({
      where: {
        sellerCode: body.sellerCode,
        userId: { not: body.userId },
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Mã seller "${body.sellerCode}" đã được sử dụng` },
        { status: 400 }
      );
    }

    const config = await prisma.configUser.upsert({
      where: { userId: body.userId },
      update: {
        sellerCode: body.sellerCode,
        canViewAll: body.canViewAll ?? false,
      },
      create: {
        userId: body.userId,
        sellerCode: body.sellerCode,
        canViewAll: body.canViewAll ?? false,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error upserting user config:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi lưu cấu hình người dùng: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/config/user - Delete user config
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu userId' },
        { status: 400 }
      );
    }

    const existing = await prisma.configUser.findUnique({
      where: { userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy cấu hình người dùng' },
        { status: 404 }
      );
    }

    await prisma.configUser.delete({ where: { userId } });

    return NextResponse.json({ success: true, message: 'Đã xóa cấu hình người dùng' });
  } catch (error) {
    console.error('Error deleting user config:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa cấu hình người dùng: ${message}` },
      { status: 500 }
    );
  }
}
