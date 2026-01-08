// POST /api/operators/[id]/unlock - Unlock operator at specific tier
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-utils';
import {
  canUnlock,
  canUnlockTier,
  getLockFields,
  getLockHistoryAction,
  hasAnyLock,
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
        { success: false, error: `Tier không hợp lệ: ${tier}` },
        { status: 400 }
      );
    }

    // Check permission for this tier
    if (!canUnlock(user.role, tier)) {
      return forbiddenResponse(`Không có quyền mở khóa tier: ${tier}`);
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

    // Validate unlock order (reverse: Final → Admin → KT)
    const lockState = {
      lockKT: operator.lockKT,
      lockAdmin: operator.lockAdmin,
      lockFinal: operator.lockFinal,
    };

    if (!canUnlockTier(lockState, tier)) {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể mở khóa tier ${tier}. Phải theo thứ tự ngược: Final → Admin → KT`,
          currentState: lockState,
        },
        { status: 400 }
      );
    }

    // Apply unlock
    const unlockFields = getLockFields(tier, user.id, false);
    
    // Calculate new lock state after unlock
    const newLockState = {
      lockKT: tier === 'KT' ? false : lockState.lockKT,
      lockAdmin: tier === 'Admin' ? false : lockState.lockAdmin,
      lockFinal: tier === 'Final' ? false : lockState.lockFinal,
    };
    
    // Update legacy isLocked based on whether any locks remain
    const anyLockRemains = hasAnyLock(newLockState);
    
    const updated = await prisma.operator.update({
      where: { id },
      data: {
        ...unlockFields,
        isLocked: anyLockRemains, // Sync legacy field
        lockedAt: anyLockRemains ? undefined : null,
        lockedBy: anyLockRemains ? undefined : null,
      },
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: id,
      action: getLockHistoryAction(tier, false),
      changes: { tier, ...unlockFields },
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: { tier, operator: updated },
    });
  } catch (error) {
    console.error('Unlock operator error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi mở khóa dịch vụ: ${message}` },
      { status: 500 }
    );
  }
}
