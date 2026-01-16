import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { getSupplierBalanceSummary, getBalanceTrend } from '@/lib/supplier-balance';

// GET /api/reports/supplier-balance - Get balance summary for all suppliers
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chua dang nhap' },
        { status: 401 }
      );
    }
    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Khong co quyen xem bao cao' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;

    const [result, trend] = await Promise.all([
      getSupplierBalanceSummary(type),
      getBalanceTrend(),
    ]);

    return NextResponse.json({
      success: true,
      ...result,
      trend,
    });
  } catch (error) {
    console.error('Error fetching supplier balance report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch balance report' },
      { status: 500 }
    );
  }
}
