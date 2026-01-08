import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { type Role } from '@/lib/permissions';
import {
  canLock,
  canLockTier,
  getLockFields,
  type LockTier,
  LOCK_TIERS,
} from '@/lib/lock-utils';
import { createRevenueHistory } from '@/lib/revenue-history';

// POST /api/revenues/[id]/lock - Lock revenue with tier support
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

    // Permission check using role-based lock permissions
    const role = session.user.role as Role;
    if (!canLock(role, tier)) {
      return NextResponse.json(
        { success: false, error: `Không có quyền khóa tier ${tier}` },
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

    // Validate tier progression (KT -> Admin -> Final)
    const lockState = {
      lockKT: revenue.lockKT,
      lockAdmin: revenue.lockAdmin,
      lockFinal: revenue.lockFinal,
    };

    if (!canLockTier(lockState, tier)) {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể khóa tier ${tier}. Phải khóa theo thứ tự: KT → Admin → Final`,
          currentState: lockState,
        },
        { status: 400 }
      );
    }

    // Update with tier-specific fields
    const lockFields = getLockFields(tier, session.user.id, true);
    const updated = await prisma.revenue.update({
      where: { id },
      data: lockFields,
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
      },
    });

    // Create history entry
    await createRevenueHistory({
      revenueId: id,
      action: `LOCK_${tier.toUpperCase()}` as 'LOCK_KT' | 'LOCK_ADMIN' | 'LOCK_FINAL',
      changes: { [tier]: { before: false, after: true } },
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, tier, data: updated });
  } catch (error) {
    console.error('Error locking revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi khóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
