import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-utils';
import {
  canLock,
  getLockFields,
  getLockHistoryAction,
  type LockTier,
  LOCK_TIERS,
} from '@/lib/lock-utils';

// POST /api/operators/lock-period - Lock operators in a period at specific tier
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const tier = (body.tier as LockTier) || 'KT';

    // Validate month format YYYY-MM
    if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng tháng không hợp lệ (YYYY-MM)' },
        { status: 400 }
      );
    }

    // Validate tier
    if (!LOCK_TIERS.includes(tier)) {
      return NextResponse.json(
        { success: false, error: `Tier không hợp lệ: ${tier}` },
        { status: 400 }
      );
    }

    // Check permission for this tier
    if (!canLock(user.role, tier)) {
      return forbiddenResponse(`Không có quyền khóa tier: ${tier}`);
    }

    // Parse month range
    const [year, month] = body.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Build where clause based on tier progression
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: Record<string, any> = {
      serviceDate: { gte: startDate, lte: endDate },
    };

    // KT: not yet locked at KT
    // Admin: locked at KT but not Admin
    // Final: locked at Admin but not Final
    if (tier === 'KT') {
      whereClause.lockKT = false;
    } else if (tier === 'Admin') {
      whereClause.lockKT = true;
      whereClause.lockAdmin = false;
    } else if (tier === 'Final') {
      whereClause.lockAdmin = true;
      whereClause.lockFinal = false;
    }

    // Find operators eligible for this tier lock
    const operators = await prisma.operator.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (operators.length === 0) {
      return NextResponse.json({
        success: true,
        data: { count: 0, tier, message: 'Không có dịch vụ cần khóa tier này' },
      });
    }

    // Apply lock in transaction
    const lockFields = getLockFields(tier, user.id, true);
    const lockedAt = new Date();

    await prisma.$transaction(async (tx) => {
      // Update all operators with tier lock + legacy sync
      await tx.operator.updateMany({
        where: { id: { in: operators.map((o) => o.id) } },
        data: {
          ...lockFields,
          isLocked: true, // Sync legacy field
          lockedAt,
          lockedBy: user.id,
        },
      });

      // Create history entries
      await tx.operatorHistory.createMany({
        data: operators.map((op) => ({
          operatorId: op.id,
          action: getLockHistoryAction(tier, true),
          changes: { tier, batch: true, month: body.month },
          userId: user.id,
        })),
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        count: operators.length,
        tier,
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

// GET /api/operators/lock-period - Get lock status by month with tier breakdown
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const tier = searchParams.get('tier') as LockTier | null;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng tháng không hợp lệ' },
        { status: 400 }
      );
    }

    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const baseWhere = { serviceDate: { gte: startDate, lte: endDate } };

    // If specific tier requested, return operators eligible for that tier
    if (tier && LOCK_TIERS.includes(tier)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: Record<string, any> = { ...baseWhere };

      if (tier === 'KT') {
        whereClause.lockKT = false;
      } else if (tier === 'Admin') {
        whereClause.lockKT = true;
        whereClause.lockAdmin = false;
      } else if (tier === 'Final') {
        whereClause.lockAdmin = true;
        whereClause.lockFinal = false;
      }

      const operators = await prisma.operator.findMany({
        where: whereClause,
        select: {
          id: true,
          serviceName: true,
          serviceDate: true,
          totalCost: true,
          lockKT: true,
          lockAdmin: true,
          lockFinal: true,
        },
        orderBy: { serviceDate: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: { month, tier, count: operators.length, operators },
      });
    }

    // Return full tier breakdown
    const [total, lockedKT, lockedAdmin, lockedFinal, unlocked] = await Promise.all([
      prisma.operator.count({ where: baseWhere }),
      prisma.operator.count({ where: { ...baseWhere, lockKT: true } }),
      prisma.operator.count({ where: { ...baseWhere, lockAdmin: true } }),
      prisma.operator.count({ where: { ...baseWhere, lockFinal: true } }),
      prisma.operator.count({ where: { ...baseWhere, lockKT: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        month,
        total,
        tiers: {
          KT: lockedKT,
          Admin: lockedAdmin,
          Final: lockedFinal,
        },
        unlocked,
        isFullyLocked: lockedFinal === total && total > 0,
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
