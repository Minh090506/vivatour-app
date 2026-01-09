import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import { getDateRange, type CostBreakdownResponse } from '@/lib/report-utils';

// GET /api/reports/cost-breakdown - Cost analysis by service type
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

    // Query operators grouped by service type (exclude archived)
    const operators = await prisma.operator.findMany({
      where: {
        isArchived: false,
        serviceDate: { gte: dateRange.startDate, lte: dateRange.endDate }
      },
      select: {
        serviceType: true,
        totalCost: true,
        paymentStatus: true
      }
    });

    // Group by service type
    const typeMap = new Map<string, number>();
    let totalCost = 0;
    let paid = 0;
    let partial = 0;
    let unpaid = 0;

    for (const op of operators) {
      const cost = Number(op.totalCost);
      totalCost += cost;
      typeMap.set(op.serviceType, (typeMap.get(op.serviceType) || 0) + cost);

      // Payment status aggregation
      switch (op.paymentStatus) {
        case 'PAID':
          paid += cost;
          break;
        case 'PARTIAL':
          partial += cost;
          break;
        default:
          unpaid += cost;
      }
    }

    // Format by service type with percentage
    const byServiceType = Array.from(typeMap.entries())
      .map(([type, amount]) => ({
        type,
        amount,
        percentage: totalCost > 0 ? Math.round((amount / totalCost) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const response: CostBreakdownResponse = {
      byServiceType,
      paymentStatus: { paid, partial, unpaid },
      dateRange
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error generating cost breakdown:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao chi phi: ${message}` },
      { status: 500 }
    );
  }
}
