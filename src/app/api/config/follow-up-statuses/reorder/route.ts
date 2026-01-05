import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reorderSchema } from '@/lib/validations/config-validation';

// PUT /api/config/follow-up-statuses/reorder - Batch update sortOrder
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validation = reorderSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // Verify all IDs exist
    const ids = items.map((item) => item.id);
    const existingStatuses = await prisma.followUpStatus.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (existingStatuses.length !== ids.length) {
      return NextResponse.json(
        { success: false, error: 'Một hoặc nhiều trạng thái không tồn tại' },
        { status: 400 }
      );
    }

    // Use transaction to update all sortOrders atomically
    const updatedStatuses = await prisma.$transaction(
      items.map((item) =>
        prisma.followUpStatus.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true, data: updatedStatuses });
  } catch (error) {
    console.error('Error reordering follow-up statuses:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi sắp xếp lại trạng thái: ${message}` },
      { status: 500 }
    );
  }
}
