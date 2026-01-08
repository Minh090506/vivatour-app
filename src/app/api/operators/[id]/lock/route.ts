// POST /api/operators/[id]/lock - Lock operator at specific tier
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-utils';
import {
  canLock,
  canLockTier,
  getLockFields,
  getLockHistoryAction,
  type LockTier,
  LOCK_TIERS,
} from '@/lib/lock-utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const tier = (body.tier as LockTier) || 'KT';

    // Validate tier
    if (!LOCK_TIERS.includes(tier)) {
      return NextResponse.json(
        { success: false, error: `Tier khóa không hợp lệ: ${tier}` },
        { status: 400 }
      );
    }

    // Check permission for this tier
    if (!canLock(user.role, tier)) {
      return forbiddenResponse(`Không có quyền khóa tier: ${tier}`);
    }

    // Get current operator state
    const operator = await prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        lockKT: true,
        lockAdmin: true,
        lockFinal: true,
        serviceName: true,
      },
    });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy dịch vụ' },
        { status: 404 }
      );
    }

    // Validate tier progression
    const lockState = {
      lockKT: operator.lockKT,
      lockAdmin: operator.lockAdmin,
      lockFinal: operator.lockFinal,
    };

    if (!canLockTier(lockState, tier)) {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể khóa tier ${tier}. Phải theo thứ tự: KT → Admin → Final`,
          currentState: lockState,
        },
        { status: 400 }
      );
    }

    // Apply lock + sync legacy isLocked field
    const lockFields = getLockFields(tier, user.id, true);
    const updated = await prisma.operator.update({
      where: { id },
      data: {
        ...lockFields,
        isLocked: true, // Keep legacy field in sync
        lockedAt: new Date(),
        lockedBy: user.id,
      },
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: id,
      action: getLockHistoryAction(tier, true),
      changes: { tier, ...lockFields },
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: { tier, operator: updated },
    });
  } catch (error) {
    console.error('Lock operator error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa dịch vụ: ${message}` },
      { status: 500 }
    );
  }
}
