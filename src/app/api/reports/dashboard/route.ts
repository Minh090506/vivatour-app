import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import {
  getDateRange,
  getComparisonRange,
  calcChangePercent,
  type DashboardResponse
} from '@/lib/report-utils';

// GET /api/reports/dashboard - Main KPI dashboard
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
    const compRange = getComparisonRange(range);

    // Parallel queries for current period
    const [bookingCount, revenueSum, costSum, activeRequests, leadCount] = await Promise.all([
      // Total bookings (requests with bookingCode)
      prisma.request.count({
        where: {
          bookingCode: { not: null },
          startDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        }
      }),
      // Total revenue
      prisma.revenue.aggregate({
        where: {
          paymentDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        _sum: { amountVND: true }
      }),
      // Total cost (exclude archived)
      prisma.operator.aggregate({
        where: {
          isArchived: false,
          serviceDate: { gte: dateRange.startDate, lte: dateRange.endDate }
        },
        _sum: { totalCost: true }
      }),
      // Active requests (LEAD or QUOTE stage)
      prisma.request.count({
        where: {
          stage: { in: ['LEAD', 'QUOTE'] }
        }
      }),
      // Total leads for conversion rate
      prisma.request.count({
        where: {
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate }
        }
      })
    ]);

    // Comparison period queries
    const [prevBookings, prevRevenue] = await Promise.all([
      prisma.request.count({
        where: {
          bookingCode: { not: null },
          startDate: { gte: compRange.startDate, lte: compRange.endDate }
        }
      }),
      prisma.revenue.aggregate({
        where: {
          paymentDate: { gte: compRange.startDate, lte: compRange.endDate }
        },
        _sum: { amountVND: true }
      })
    ]);

    const totalRevenue = Number(revenueSum._sum.amountVND || 0);
    const totalCost = Number(costSum._sum.totalCost || 0);
    const prevRevenueVal = Number(prevRevenue._sum.amountVND || 0);
    const conversionRate = leadCount > 0
      ? Math.round((bookingCount / leadCount) * 10000) / 100
      : 0;

    const data: DashboardResponse = {
      kpiCards: {
        totalBookings: bookingCount,
        totalRevenue,
        totalProfit: totalRevenue - totalCost,
        activeRequests,
        conversionRate
      },
      comparison: {
        bookings: {
          current: bookingCount,
          previous: prevBookings,
          changePercent: calcChangePercent(bookingCount, prevBookings)
        },
        revenue: {
          current: totalRevenue,
          previous: prevRevenueVal,
          changePercent: calcChangePercent(totalRevenue, prevRevenueVal)
        }
      },
      dateRange
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error generating dashboard:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao: ${message}` },
      { status: 500 }
    );
  }
}
