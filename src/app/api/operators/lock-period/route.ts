import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-utils';

// POST /api/operators/lock-period - Lock all operators in a period (Accountant/Admin)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate month format YYYY-MM
    if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng tháng không hợp lệ (YYYY-MM)' },
        { status: 400 }
      );
    }

    // Parse month range
    const [year, month] = body.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Find all unlocked operators in the period
    const operators = await prisma.operator.findMany({
      where: {
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
        isLocked: false,
      },
      select: { id: true },
    });

    if (operators.length === 0) {
      return NextResponse.json({
        success: true,
        data: { count: 0, message: 'Không có dịch vụ cần khóa trong kỳ này' },
      });
    }

    // Lock all in transaction
    const lockedAt = new Date();

    await prisma.$transaction(async (tx) => {
      // Update operators
      await tx.operator.updateMany({
        where: {
          id: { in: operators.map((o) => o.id) },
        },
        data: {
          isLocked: true,
          lockedAt,
          lockedBy: user.id,
        },
      });

      // Create history entries
      await Promise.all(
        operators.map((op) =>
          tx.operatorHistory.create({
            data: {
              operatorId: op.id,
              action: 'LOCK',
              changes: {
                isLocked: { before: false, after: true },
                lockedAt: { before: null, after: lockedAt },
                lockedBy: { before: null, after: user.id },
              },
              userId: user.id,
            },
          })
        )
      );
    });

    return NextResponse.json({
      success: true,
      data: {
        count: operators.length,
        period: body.month,
        lockedAt,
      },
    });
  } catch (error) {
    console.error('Error locking period:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa kỳ: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/operators/lock-period - Get lock status by month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng tháng không hợp lệ' },
        { status: 400 }
      );
    }

    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const [total, locked, unlocked] = await Promise.all([
      prisma.operator.count({
        where: {
          serviceDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.operator.count({
        where: {
          serviceDate: { gte: startDate, lte: endDate },
          isLocked: true,
        },
      }),
      prisma.operator.count({
        where: {
          serviceDate: { gte: startDate, lte: endDate },
          isLocked: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        month,
        total,
        locked,
        unlocked,
        isFullyLocked: unlocked === 0 && total > 0,
      },
    });
  } catch (error) {
    console.error('Error getting lock status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
