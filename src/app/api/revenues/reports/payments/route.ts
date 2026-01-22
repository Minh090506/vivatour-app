import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { reportQuerySchema } from '@/lib/validations/report-validation';
import { getDateRange, formatPeriodKey } from '@/lib/report-utils';
import { CURRENCIES } from '@/config/revenue-config';

// Types for payment tracking response
interface BookingPayment {
  requestId: string;
  bookingCode: string | null;
  customerName: string;
  expectedRevenue: number;
  receivedAmount: number;
  remainingAmount: number;
  currency: string;
  paymentCount: number;
  lastPaymentDate: Date | null;
  isOverdue: boolean;
  daysOverdue: number;
}

interface CurrencyBreakdown {
  currency: string;
  label: string;
  symbol: string;
  expectedAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  bookingCount: number;
  percentage: number;
}

interface TimelineDataPoint {
  date: string;
  amount: number;
  count: number;
  cumulativeAmount: number;
}

interface OverdueAlert {
  requestId: string;
  bookingCode: string | null;
  customerName: string;
  expectedRevenue: number;
  receivedAmount: number;
  remainingAmount: number;
  daysOverdue: number;
  startDate: Date | null;
}

// GET /api/revenues/reports/payments - Payment tracking by booking
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
    const rangeParam = searchParams.get('range') || 'last6Months';
    const startDateParam = searchParams.get('startDate') || undefined;
    const endDateParam = searchParams.get('endDate') || undefined;
    const overdueOnly = searchParams.get('overdueOnly') === 'true';

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

    // Fetch requests with expected revenue and their payments
    const requests = await prisma.request.findMany({
      where: {
        OR: [
          { startDate: { gte: dateRange.startDate, lte: dateRange.endDate } },
          { requestDate: { gte: dateRange.startDate, lte: dateRange.endDate } },
        ],
        expectedRevenue: { not: null, gt: 0 },
      },
      select: {
        id: true,
        bookingCode: true,
        customerName: true,
        expectedRevenue: true,
        startDate: true,
        revenues: {
          select: {
            amountVND: true,
            foreignAmount: true,
            currency: true,
            paymentDate: true,
          },
        },
      },
    });

    // Fetch all revenues in date range for timeline
    const revenues = await prisma.revenue.findMany({
      where: {
        paymentDate: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: {
        amountVND: true,
        foreignAmount: true,
        currency: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    const today = new Date();
    const bookingPayments: BookingPayment[] = [];
    const overdueAlerts: OverdueAlert[] = [];
    const currencyMap = new Map<string, {
      expectedAmount: number;
      receivedAmount: number;
      bookingCount: number;
    }>();

    // Process each request
    for (const req of requests) {
      const expectedRevenue = Number(req.expectedRevenue || 0);
      const receivedAmount = req.revenues.reduce(
        (sum, rev) => sum + Number(rev.amountVND),
        0
      );
      const remainingAmount = expectedRevenue - receivedAmount;

      // Determine primary currency from payments
      const currencies = req.revenues.map(r => r.currency || 'VND');
      const primaryCurrency = currencies.length > 0
        ? currencies.sort((a, b) =>
            currencies.filter(c => c === b).length - currencies.filter(c => c === a).length
          )[0]
        : 'VND';

      // Calculate overdue status
      const tourStartDate = req.startDate;
      let isOverdue = false;
      let daysOverdue = 0;

      if (remainingAmount > 0 && tourStartDate) {
        // Payment should be received before tour start
        if (today > tourStartDate) {
          isOverdue = true;
          daysOverdue = Math.floor(
            (today.getTime() - tourStartDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      }

      const lastPaymentDate = req.revenues.length > 0
        ? req.revenues.reduce((latest, rev) =>
            rev.paymentDate > latest ? rev.paymentDate : latest,
            req.revenues[0].paymentDate
          )
        : null;

      const booking: BookingPayment = {
        requestId: req.id,
        bookingCode: req.bookingCode,
        customerName: req.customerName,
        expectedRevenue,
        receivedAmount,
        remainingAmount,
        currency: primaryCurrency,
        paymentCount: req.revenues.length,
        lastPaymentDate,
        isOverdue,
        daysOverdue,
      };

      // Only include if not filtering for overdue or if it's overdue
      if (!overdueOnly || isOverdue) {
        bookingPayments.push(booking);
      }

      // Track overdue alerts
      if (isOverdue && remainingAmount > 0) {
        overdueAlerts.push({
          requestId: req.id,
          bookingCode: req.bookingCode,
          customerName: req.customerName,
          expectedRevenue,
          receivedAmount,
          remainingAmount,
          daysOverdue,
          startDate: tourStartDate,
        });
      }

      // Currency breakdown - focus on VND, USD, EUR
      const currency = primaryCurrency;
      if (['VND', 'USD', 'EUR'].includes(currency)) {
        const entry = currencyMap.get(currency) || {
          expectedAmount: 0,
          receivedAmount: 0,
          bookingCount: 0,
        };
        entry.expectedAmount += expectedRevenue;
        entry.receivedAmount += receivedAmount;
        entry.bookingCount += 1;
        currencyMap.set(currency, entry);
      }
    }

    // Build currency breakdown
    const totalExpected = Array.from(currencyMap.values()).reduce(
      (sum, v) => sum + v.expectedAmount, 0
    );

    const byCurrency: CurrencyBreakdown[] = ['VND', 'USD', 'EUR']
      .map(currency => {
        const data = currencyMap.get(currency) || {
          expectedAmount: 0,
          receivedAmount: 0,
          bookingCount: 0,
        };
        const currencyConfig = CURRENCIES[currency as keyof typeof CURRENCIES];
        return {
          currency,
          label: currencyConfig?.label || currency,
          symbol: currencyConfig?.symbol || currency,
          expectedAmount: data.expectedAmount,
          receivedAmount: data.receivedAmount,
          remainingAmount: data.expectedAmount - data.receivedAmount,
          bookingCount: data.bookingCount,
          percentage: totalExpected > 0
            ? Math.round((data.expectedAmount / totalExpected) * 10000) / 100
            : 0,
        };
      })
      .filter(c => c.bookingCount > 0 || c.currency === 'VND');

    // Build payment timeline (daily for short ranges, weekly/monthly for longer)
    const timelineMap = new Map<string, { amount: number; count: number }>();

    for (const rev of revenues) {
      const key = formatPeriodKey(rev.paymentDate);
      const entry = timelineMap.get(key) || { amount: 0, count: 0 };
      entry.amount += Number(rev.amountVND);
      entry.count += 1;
      timelineMap.set(key, entry);
    }

    let cumulativeAmount = 0;
    const timeline: TimelineDataPoint[] = Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        cumulativeAmount += data.amount;
        return {
          date,
          amount: data.amount,
          count: data.count,
          cumulativeAmount,
        };
      });

    // Calculate summary
    const totalExpectedRevenue = bookingPayments.reduce(
      (sum, b) => sum + b.expectedRevenue, 0
    );
    const totalReceivedAmount = bookingPayments.reduce(
      (sum, b) => sum + b.receivedAmount, 0
    );
    const totalRemainingAmount = totalExpectedRevenue - totalReceivedAmount;
    const collectionRate = totalExpectedRevenue > 0
      ? Math.round((totalReceivedAmount / totalExpectedRevenue) * 10000) / 100
      : 0;

    // Sort overdue alerts by days overdue (most urgent first)
    overdueAlerts.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const data = {
      bookings: bookingPayments.slice(0, 100), // Limit to 100 bookings
      byCurrency,
      timeline,
      overdueAlerts: overdueAlerts.slice(0, 20), // Top 20 overdue
      summary: {
        totalExpectedRevenue,
        totalReceivedAmount,
        totalRemainingAmount,
        collectionRate,
        bookingCount: bookingPayments.length,
        overdueCount: overdueAlerts.length,
        paymentCount: revenues.length,
      },
      dateRange,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error generating payment tracking report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao thanh toan: ${message}` },
      { status: 500 }
    );
  }
}
