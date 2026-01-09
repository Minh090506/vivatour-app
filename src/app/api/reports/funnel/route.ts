import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import { getDateRange, type FunnelResponse } from '@/lib/report-utils';

// Stage order for funnel display
const STAGE_ORDER = ['LEAD', 'QUOTE', 'FOLLOWUP', 'OUTCOME'];

// GET /api/reports/funnel - Sales funnel analysis
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') || 'thisMonth';
    const validation = reportQuerySchema.safeParse({ range: rangeParam });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Khoang thoi gian khong hop le' },
        { status: 400 }
      );
    }

    const { range } = validation.data;
    const dateRange = getDateRange(range);

    // Count by stage using groupBy
    const stageCounts = await prisma.request.groupBy({
      by: ['stage'],
      where: {
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate }
      },
      _count: { id: true }
    });

    // Also count converted bookings (requests with bookingCode)
    const convertedCount = await prisma.request.count({
      where: {
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        bookingCode: { not: null }
      }
    });

    // Build stage map
    const stageMap = new Map<string, number>();
    let totalRequests = 0;

    for (const item of stageCounts) {
      stageMap.set(item.stage, item._count.id);
      totalRequests += item._count.id;
    }

    // Format stages in order
    const stages = STAGE_ORDER.map(stage => ({
      stage,
      count: stageMap.get(stage) || 0,
      percentage: totalRequests > 0
        ? Math.round(((stageMap.get(stage) || 0) / totalRequests) * 10000) / 100
        : 0
    }));

    // Conversion rate: bookings / total requests
    const conversionRate = totalRequests > 0
      ? Math.round((convertedCount / totalRequests) * 10000) / 100
      : 0;

    const response: FunnelResponse = {
      stages,
      conversionRate,
      dateRange
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error generating funnel report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao pheu ban hang: ${message}` },
      { status: 500 }
    );
  }
}
