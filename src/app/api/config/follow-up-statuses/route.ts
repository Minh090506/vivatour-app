import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { followUpStatusSchema } from '@/lib/validations/config-validation';

// GET /api/config/follow-up-statuses - List follow-up statuses ordered by sortOrder
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    // Get statuses ordered by sortOrder
    const statuses = await prisma.followUpStatus.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error('Error fetching follow-up statuses:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách trạng thái: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/config/follow-up-statuses - Create new follow-up status
export async function POST(request: NextRequest) {
  try {
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

    // Check for duplicate status name
    const existingStatus = await prisma.followUpStatus.findUnique({
      where: { status: data.status },
    });

    if (existingStatus) {
      return NextResponse.json(
        { success: false, error: `Trạng thái "${data.status}" đã tồn tại` },
        { status: 400 }
      );
    }

    // Auto-assign sortOrder if not provided (max + 1)
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const maxSortOrder = await prisma.followUpStatus.aggregate({
        _max: { sortOrder: true },
      });
      sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
    }

    // Create follow-up status
    const followUpStatus = await prisma.followUpStatus.create({
      data: {
        status: data.status.trim(),
        aliases: data.aliases,
        daysToFollowup: data.daysToFollowup,
        sortOrder,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: followUpStatus }, { status: 201 });
  } catch (error) {
    console.error('Error creating follow-up status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo trạng thái: ${message}` },
      { status: 500 }
    );
  }
}
