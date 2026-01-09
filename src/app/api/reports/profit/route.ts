import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Date format validation regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Booking code format regex (e.g., 20250308KIK)
const BOOKING_CODE_REGEX = /^\d{8}[A-Z]{3}$/;

// Max bookings to return (performance limit)
const MAX_BOOKINGS = 500;

// Validate date string format
function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// Validate booking code format
function isValidBookingCode(code: string): boolean {
  return BOOKING_CODE_REGEX.test(code);
}

// GET /api/reports/profit
// Input: startDate, endDate, bookingCode (optional)
// Output: Array of profit per booking with summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const bookingCode = searchParams.get('bookingCode');

    // Validate date inputs
    if (startDate && !isValidDate(startDate)) {
      return NextResponse.json(
        { success: false, error: 'Ngày bắt đầu không hợp lệ (YYYY-MM-DD)' },
        { status: 400 }
      );
    }
    if (endDate && !isValidDate(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Ngày kết thúc không hợp lệ (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Build where clause for requests (bookings)
    const requestWhere: Record<string, unknown> = {
      bookingCode: { not: null }, // Only bookings with code
    };

    if (startDate || endDate) {
      requestWhere.startDate = {};
      if (startDate) (requestWhere.startDate as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (requestWhere.startDate as Record<string, Date>).lte = new Date(endDate);
    }

    if (bookingCode) {
      // Validate booking code format
      if (!isValidBookingCode(bookingCode)) {
        return NextResponse.json(
          { success: false, error: 'Mã booking không hợp lệ (yyyyMMddXXX)' },
          { status: 400 }
        );
      }
      requestWhere.bookingCode = bookingCode;
    }

    // Get requests with operators and revenues (limited for performance)
    const requests = await prisma.request.findMany({
      where: requestWhere,
      take: MAX_BOOKINGS,
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        bookingCode: true,
        customerName: true,
        operators: {
          select: {
            totalCost: true,
          },
        },
        revenues: {
          select: {
            amountVND: true,
          },
        },
      },
    });

    // Calculate profit per booking
    const bookings = requests
      .filter((req) => req.bookingCode) // Ensure bookingCode exists
      .map((req) => {
        const totalCost = req.operators.reduce(
          (sum, op) => sum + Number(op.totalCost),
          0
        );
        const totalRevenue = req.revenues.reduce(
          (sum, rev) => sum + Number(rev.amountVND),
          0
        );
        const profit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0
          ? Math.round((profit / totalRevenue) * 10000) / 100 // 2 decimal places
          : 0;

        return {
          bookingCode: req.bookingCode!,
          customerName: req.customerName,
          totalCost,
          totalRevenue,
          profit,
          profitMargin,
        };
      })
      .sort((a, b) => b.profit - a.profit); // Sort by profit descending

    // Calculate summary
    const totalCost = bookings.reduce((sum, b) => sum + b.totalCost, 0);
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalRevenue, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgProfitMargin = totalRevenue > 0
      ? Math.round((totalProfit / totalRevenue) * 10000) / 100
      : 0;

    const summary = {
      totalCost,
      totalRevenue,
      totalProfit,
      avgProfitMargin,
      bookingCount: bookings.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        summary,
      },
    });
  } catch (error) {
    console.error('Error generating profit report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo báo cáo lợi nhuận: ${message}` },
      { status: 500 }
    );
  }
}
