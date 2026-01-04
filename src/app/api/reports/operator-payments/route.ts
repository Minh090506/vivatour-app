import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Month format validation regex (YYYY-MM)
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// GET /api/reports/operator-payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM for filtering

    // Validate month format
    if (month && !MONTH_REGEX.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Định dạng tháng không hợp lệ (YYYY-MM)' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Month filter
    let monthStart: Date | undefined;
    let monthEnd: Date | undefined;
    if (month) {
      const [year, m] = month.split('-').map(Number);
      monthStart = new Date(year, m - 1, 1);
      monthEnd = new Date(year, m, 0, 23, 59, 59, 999);
    }

    // Current month for "paid this month"
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Pending payments
    const pendingWhere: Record<string, unknown> = {
      paymentStatus: { in: ['PENDING', 'PARTIAL'] },
    };
    if (monthStart && monthEnd) {
      pendingWhere.serviceDate = { gte: monthStart, lte: monthEnd };
    }

    const pending = await prisma.operator.aggregate({
      where: pendingWhere,
      _count: { id: true },
      _sum: { totalCost: true },
    });

    // Due this week
    const dueThisWeek = await prisma.operator.aggregate({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        paymentDeadline: { gte: today, lt: weekEnd },
      },
      _count: { id: true },
      _sum: { totalCost: true },
    });

    // Overdue
    const overdue = await prisma.operator.aggregate({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        paymentDeadline: { lt: today },
      },
      _count: { id: true },
      _sum: { totalCost: true },
    });

    // Paid this month
    const paidThisMonth = await prisma.operator.aggregate({
      where: {
        paymentStatus: 'PAID',
        paymentDate: { gte: currentMonthStart, lte: currentMonthEnd },
      },
      _count: { id: true },
      _sum: { totalCost: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        pending: {
          count: pending._count.id,
          total: Number(pending._sum.totalCost || 0),
        },
        dueThisWeek: {
          count: dueThisWeek._count.id,
          total: Number(dueThisWeek._sum.totalCost || 0),
        },
        overdue: {
          count: overdue._count.id,
          total: Number(overdue._sum.totalCost || 0),
        },
        paidThisMonth: {
          count: paidThisMonth._count.id,
          total: Number(paidThisMonth._sum.totalCost || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error generating payment report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo báo cáo: ${message}` },
      { status: 500 }
    );
  }
}
