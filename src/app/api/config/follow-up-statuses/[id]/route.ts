import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { followUpStatusSchema } from '@/lib/validations/config-validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/config/follow-up-statuses/[id] - Get single follow-up status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const status = await prisma.followUpStatus.findUnique({
      where: { id },
    });

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy trạng thái' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('Error fetching follow-up status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải trạng thái: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/config/follow-up-statuses/[id] - Update follow-up status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate with Zod
    const validation = followUpStatusSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if status exists
    const existing = await prisma.followUpStatus.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy trạng thái' },
        { status: 404 }
      );
    }

    // Check if status name is used by another entry
    if (data.status !== existing.status) {
      const existingStatus = await prisma.followUpStatus.findUnique({
        where: { status: data.status },
      });

      if (existingStatus && existingStatus.id !== id) {
        return NextResponse.json(
          { success: false, error: `Trạng thái "${data.status}" đã tồn tại` },
          { status: 400 }
        );
      }
    }

    // Update follow-up status
    const updatedStatus = await prisma.followUpStatus.update({
      where: { id },
      data: {
        status: data.status.trim(),
        aliases: data.aliases,
        daysToFollowup: data.daysToFollowup,
        sortOrder: data.sortOrder ?? existing.sortOrder,
        isActive: data.isActive ?? existing.isActive,
      },
    });

    return NextResponse.json({ success: true, data: updatedStatus });
  } catch (error) {
    console.error('Error updating follow-up status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi cập nhật trạng thái: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/config/follow-up-statuses/[id] - Delete follow-up status
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.followUpStatus.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy trạng thái' },
        { status: 404 }
      );
    }

    await prisma.followUpStatus.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa trạng thái thành công',
    });
  } catch (error) {
    console.error('Error deleting follow-up status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa trạng thái: ${message}` },
      { status: 500 }
    );
  }
}
