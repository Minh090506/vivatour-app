import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import { getDateRange } from '@/lib/report-utils';
import { PAYMENT_TYPES, PAYMENT_SOURCES, CURRENCIES } from '@/config/revenue-config';

// GET /api/reports/revenue-breakdown - Revenue analytics by type, source, currency
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
    const startDateParam = searchParams.get('startDate') || undefined;
    const endDateParam = searchParams.get('endDate') || undefined;

    const validation = reportQuerySchema.safeParse({
      range: rangeParam,
      startDate: startDateParam,
      endDate: endDateParam,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Khoang thoi gian khong hop le' },
        { status: 400 }
      );
    }

    const { range, startDate, endDate } = validation.data;
    const customDates = range === 'custom' && startDate && endDate
      ? { startDate, endDate }
      : undefined;
    const dateRange = getDateRange(range, customDates);

    // Fetch all revenues in date range
    const revenues = await prisma.revenue.findMany({
      where: {
        paymentDate: { gte: dateRange.startDate, lte: dateRange.endDate }
      },
      select: {
        paymentType: true,
        paymentSource: true,
        currency: true,
        foreignAmount: true,
        amountVND: true,
      }
    });

    // Calculate totals
    let totalRevenue = 0;
    const typeMap = new Map<string, { amount: number; count: number }>();
    const sourceMap = new Map<string, { amount: number; count: number }>();
    const currencyMap = new Map<string, { foreignAmount: number; amountVND: number; count: number }>();

    for (const rev of revenues) {
      const amount = Number(rev.amountVND);
      totalRevenue += amount;

      // By type
      const typeEntry = typeMap.get(rev.paymentType) || { amount: 0, count: 0 };
      typeEntry.amount += amount;
      typeEntry.count += 1;
      typeMap.set(rev.paymentType, typeEntry);

      // By source
      const sourceEntry = sourceMap.get(rev.paymentSource) || { amount: 0, count: 0 };
      sourceEntry.amount += amount;
      sourceEntry.count += 1;
      sourceMap.set(rev.paymentSource, sourceEntry);

      // By currency (only if foreign currency)
      const currency = rev.currency || 'VND';
      const currencyEntry = currencyMap.get(currency) || { foreignAmount: 0, amountVND: 0, count: 0 };
      currencyEntry.foreignAmount += Number(rev.foreignAmount || 0);
      currencyEntry.amountVND += amount;
      currencyEntry.count += 1;
      currencyMap.set(currency, currencyEntry);
    }

    // Format by type
    const byType = Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        label: PAYMENT_TYPES[type as keyof typeof PAYMENT_TYPES]?.label || type,
        amount: data.amount,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Format by source
    const bySource = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        label: PAYMENT_SOURCES[source as keyof typeof PAYMENT_SOURCES]?.label || source,
        amount: data.amount,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Format by currency
    const byCurrency = Array.from(currencyMap.entries())
      .map(([currency, data]) => ({
        currency,
        label: CURRENCIES[currency as keyof typeof CURRENCIES]?.label || currency,
        foreignAmount: data.foreignAmount,
        amountVND: data.amountVND,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.amountVND / totalRevenue) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.amountVND - a.amountVND);

    const data = {
      byType,
      bySource,
      byCurrency,
      summary: {
        totalRevenue,
        transactionCount: revenues.length,
        avgTransaction: revenues.length > 0 ? Math.round(totalRevenue / revenues.length) : 0,
      },
      dateRange,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error generating revenue breakdown:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao doanh thu: ${message}` },
      { status: 500 }
    );
  }
}
