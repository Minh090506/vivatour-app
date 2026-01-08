import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { type Role } from '@/lib/permissions';
import {
  canUnlock,
  canUnlockTier,
  getLockFields,
  type LockTier,
  LOCK_TIERS,
} from '@/lib/lock-utils';
import { createRevenueHistory } from '@/lib/revenue-history';

// POST /api/revenues/[id]/unlock - Unlock revenue with tier support
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const tier = body.tier as LockTier;

    // Validate tier parameter
    if (!tier || !LOCK_TIERS.includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Tier không hợp lệ. Phải là: KT, Admin, hoặc Final' },
        { status: 400 }
      );
    }

    // Permission check using role-based unlock permissions
    const role = session.user.role as Role;
    if (!canUnlock(role, tier)) {
      return NextResponse.json(
        { success: false, error: `Không có quyền mở khóa tier ${tier}` },
        { status: 403 }
      );
    }

    // Get current revenue state
    const revenue = await prisma.revenue.findUnique({
      where: { id },
      select: {
        id: true,
        lockKT: true,
        lockAdmin: true,
        lockFinal: true,
      },
    });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    // Validate reverse unlock order (Final -> Admin -> KT)
    const lockState = {
      lockKT: revenue.lockKT,
      lockAdmin: revenue.lockAdmin,
      lockFinal: revenue.lockFinal,
    };

    if (!canUnlockTier(lockState, tier)) {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể mở khóa tier ${tier}. Phải mở khóa theo thứ tự: Final → Admin → KT`,
          currentState: lockState,
        },
        { status: 400 }
      );
    }

    // Update with tier-specific fields (unlock = false)
    const unlockFields = getLockFields(tier, session.user.id, false);
    const updated = await prisma.revenue.update({
      where: { id },
      data: unlockFields,
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
      },
    });

    // Create history entry
    await createRevenueHistory({
      revenueId: id,
      action: `UNLOCK_${tier.toUpperCase()}` as 'UNLOCK_KT' | 'UNLOCK_ADMIN' | 'UNLOCK_FINAL',
      changes: { [tier]: { before: true, after: false } },
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, tier, data: updated });
  } catch (error) {
    console.error('Error unlocking revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi mở khóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
