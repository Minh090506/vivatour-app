import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';

// Max bookings to return (performance limit)
const MAX_BOOKINGS = 500;

// Regex patterns for input validation
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/; // YYYY-MM format
const YEAR_REGEX = /^(20[0-9]{2})$/; // Years 2000-2099

// GET /api/revenues/sales - Aggregate Revenue by bookingCode
// Query params: month (YYYY-MM), year (YYYY)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chua dang nhap' },
        { status: 401 }
      );
    }

    // Verify permission
    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Khong co quyen xem doanh thu' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format
    const year = searchParams.get('year');   // YYYY format

    // Validate month format if provided
    if (month && !MONTH_REGEX.test(month)) {
      return NextResponse.json(
        { success: false, error: 'Thang khong hop le (YYYY-MM)' },
        { status: 400 }
      );
    }

    // Validate year format if provided
    if (year && !YEAR_REGEX.test(year)) {
      return NextResponse.json(
        { success: false, error: 'Nam khong hop le (2000-2099)' },
        { status: 400 }
      );
    }

    // Build date filter for requests
    const requestWhere: Record<string, unknown> = {
      bookingCode: { not: null },
    };

    // Apply date filters based on startDate
    if (month) {
      // Parse YYYY-MM to get date range
      const [yearPart, monthPart] = month.split('-').map(Number);
      const startOfMonth = new Date(yearPart, monthPart - 1, 1);
      const endOfMonth = new Date(yearPart, monthPart, 0, 23, 59, 59, 999);
      requestWhere.startDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (year) {
      // Filter by year only
      const yearNum = parseInt(year);
      const startOfYear = new Date(yearNum, 0, 1);
      const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59, 999);
      requestWhere.startDate = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    // Get requests with aggregated revenues and operators
    const requests = await prisma.request.findMany({
      where: requestWhere,
      take: MAX_BOOKINGS,
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        bookingCode: true,
        customerName: true,
        startDate: true,
        endDate: true,
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

    // Calculate aggregated sales per booking
    const sales = requests
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
        const revenueCount = req.revenues.length;

        return {
          bookingCode: req.bookingCode!,
          customerName: req.customerName,
          totalRevenue,
          totalCost,
          profit,
          revenueCount,
          startDate: req.startDate,
          endDate: req.endDate,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue descending

    // Calculate summary statistics
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = sales.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;

    const summary = {
      totalRevenue,
      totalCost,
      totalProfit,
      bookingCount: sales.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        sales,
        summary,
      },
      hasMore: requests.length >= MAX_BOOKINGS,
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Loi tao bao cao tong hop: ${message}` },
      { status: 500 }
    );
  }
}
