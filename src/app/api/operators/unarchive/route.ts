import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import { requireAdmin } from '@/lib/auth-utils';

/**
 * POST /api/operators/unarchive
 *
 * Restore archived operators (Admin only).
 *
 * Input: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    // Admin only
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return adminCheck.error;
    }
    const user = adminCheck.user!;

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Danh sách IDs không hợp lệ' },
        { status: 400 }
      );
    }

    // Unarchive operators
    const updateResult = await prisma.operator.updateMany({
      where: {
        id: { in: ids },
        isArchived: true, // Only unarchive archived ones
      },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    // Create history entries for each unarchived operator
    await Promise.all(
      ids.map((id) =>
        createOperatorHistory({
          operatorId: id,
          action: 'UNARCHIVE',
          changes: {
            isArchived: { before: true, after: false },
            archivedAt: { before: 'archived', after: null },
          },
          userId: user.id,
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        unarchivedCount: updateResult.count,
        ids,
      },
      message: `Đã khôi phục ${updateResult.count} dịch vụ`,
    });
  } catch (error) {
    console.error('Error unarchiving operators:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khôi phục: ${message}` },
      { status: 500 }
    );
  }
}
