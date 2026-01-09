import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import {
  getDateRange,
  formatPeriodKey,
  type RevenueTrendResponse,
  type TrendDataPoint
} from '@/lib/report-utils';

// GET /api/reports/revenue-trend - Revenue over time
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

    // Fetch revenues and costs
    const [revenues, costs] = await Promise.all([
      prisma.revenue.findMany({
        where: {
          paymentDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        select: { paymentDate: true, amountVND: true }
      }),
      prisma.operator.findMany({
        where: {
          isArchived: false,
          serviceDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        select: { serviceDate: true, totalCost: true }
      })
    ]);

    // Group by month
    const revenueByMonth = new Map<string, number>();
    const costByMonth = new Map<string, number>();

    for (const rev of revenues) {
      const key = formatPeriodKey(rev.paymentDate);
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(rev.amountVND));
    }

    for (const op of costs) {
      const key = formatPeriodKey(op.serviceDate);
      costByMonth.set(key, (costByMonth.get(key) || 0) + Number(op.totalCost));
    }

    // Merge periods and sort
    const periods = new Set([...revenueByMonth.keys(), ...costByMonth.keys()]);
    const data: TrendDataPoint[] = Array.from(periods)
      .sort()
      .map(period => {
        const revenue = revenueByMonth.get(period) || 0;
        const cost = costByMonth.get(period) || 0;
        return {
          period,
          revenue,
          cost,
          profit: revenue - cost
        };
      });

    // Calculate summary
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalCost = data.reduce((sum, d) => sum + d.cost, 0);

    const response: RevenueTrendResponse = {
      data,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        avgMonthly: data.length > 0 ? Math.round(totalRevenue / data.length) : 0
      },
      dateRange
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error generating revenue trend:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao xu huong: ${message}` },
      { status: 500 }
    );
  }
}
