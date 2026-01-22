import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import {
  getSupplierBalanceSummary,
  getBalanceTrend,
  getLowBalanceAlerts,
} from '@/lib/supplier-balance';

// GET /api/reports/supplier-balance - Get balance summary for all suppliers
// Query params:
//   - type: filter by supplier type
//   - includeAlerts: include low balance alerts (default: true)
//   - alertThreshold: custom threshold for alerts (optional)
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
    const includeAlerts = searchParams.get('includeAlerts') !== 'false';
    const alertThreshold = searchParams.get('alertThreshold');

    // Fetch data in parallel
    const promises: Promise<unknown>[] = [
      getSupplierBalanceSummary(type),
      getBalanceTrend(),
    ];

    // Only fetch alerts if requested
    if (includeAlerts) {
      const threshold = alertThreshold ? parseInt(alertThreshold, 10) : undefined;
      promises.push(getLowBalanceAlerts(threshold));
    }

    const [result, trend, alerts] = await Promise.all(promises);

    return NextResponse.json({
      success: true,
      ...(result as Record<string, unknown>),
      trend,
      alerts: includeAlerts ? alerts : [],
    });
  } catch (error) {
    console.error('Error fetching supplier balance report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch balance report' },
      { status: 500 }
    );
  }
}
