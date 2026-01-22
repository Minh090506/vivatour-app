import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { SERVICE_TYPES, SERVICE_TYPE_KEYS } from '@/config/operator-config';

// Date format validation regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// GET /api/operator/reports/cost-breakdown
// Returns cost breakdown grouped by service type, supplier, and booking code
// with planned vs actual variance analysis
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }
    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền xem báo cáo' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const serviceType = searchParams.get('serviceType');
    const supplierId = searchParams.get('supplierId');

    // Validate date inputs
    if (fromDate && !isValidDate(fromDate)) {
      return NextResponse.json(
        { success: false, error: 'Ngày bắt đầu không hợp lệ (YYYY-MM-DD)' },
        { status: 400 }
      );
    }
    if (toDate && !isValidDate(toDate)) {
      return NextResponse.json(
        { success: false, error: 'Ngày kết thúc không hợp lệ (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate serviceType against enum
    if (serviceType && !SERVICE_TYPE_KEYS.includes(serviceType as typeof SERVICE_TYPE_KEYS[number])) {
      return NextResponse.json(
        { success: false, error: 'Loại dịch vụ không hợp lệ' },
        { status: 400 }
      );
    }

    // Validate supplierId format (should be a CUID string)
    if (supplierId && (typeof supplierId !== 'string' || supplierId.length < 10)) {
      return NextResponse.json(
        { success: false, error: 'ID nhà cung cấp không hợp lệ' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (fromDate || toDate) {
      where.serviceDate = {};
      if (fromDate) (where.serviceDate as Record<string, Date>).gte = new Date(fromDate);
      if (toDate) (where.serviceDate as Record<string, Date>).lte = new Date(toDate);
    }

    if (serviceType) where.serviceType = serviceType;
    if (supplierId) where.supplierId = supplierId;

    // Get all matching operators with request data for variance calculation
    const operators = await prisma.operator.findMany({
      where,
      select: {
        id: true,
        serviceType: true,
        serviceName: true,
        supplierId: true,
        supplier: true,
        serviceDate: true,
        totalCost: true,
        costBeforeTax: true,
        vat: true,
        paidAmount: true,
        paymentStatus: true,
        supplierRef: { select: { id: true, name: true } },
        request: {
          select: {
            code: true,
            bookingCode: true,
            customerName: true,
            expectedCost: true,
          }
        },
      },
    });

    // Pre-compute operator counts per booking code for O(1) lookup (optimization)
    const bookingOperatorCounts = new Map<string, number>();
    operators.forEach(op => {
      const code = op.request.code;
      bookingOperatorCounts.set(code, (bookingOperatorCounts.get(code) || 0) + 1);
    });

    // By service type (for pie chart)
    const byServiceType = Object.keys(SERVICE_TYPES).map((type) => {
      const items = operators.filter((op) => op.serviceType === type);
      const total = items.reduce((sum, op) => sum + Number(op.totalCost), 0);
      const expectedTotal = items.reduce((sum, op) => {
        // Each operator contributes proportionally to expectedCost
        const operatorCount = bookingOperatorCounts.get(op.request.code) || 1;
        return sum + (Number(op.request.expectedCost) || 0) / operatorCount;
      }, 0);

      return {
        type,
        label: SERVICE_TYPES[type as keyof typeof SERVICE_TYPES].label,
        total,
        expectedTotal: Math.round(expectedTotal),
        variance: Math.round(total - expectedTotal),
        variancePercent: expectedTotal > 0 ? Math.round((total - expectedTotal) / expectedTotal * 100) : 0,
        count: items.length,
      };
    }).filter((t) => t.count > 0);

    // By supplier
    const supplierMap = new Map<string, {
      name: string;
      total: number;
      count: number;
      paidAmount: number;
    }>();

    operators.forEach((op) => {
      const key = op.supplierId || 'no-supplier';
      const name = op.supplierRef?.name || op.supplier || 'Không có NCC';

      if (!supplierMap.has(key)) {
        supplierMap.set(key, { name, total: 0, count: 0, paidAmount: 0 });
      }
      const entry = supplierMap.get(key)!;
      entry.total += Number(op.totalCost);
      entry.paidAmount += Number(op.paidAmount);
      entry.count += 1;
    });

    const bySupplier = Array.from(supplierMap.entries())
      .map(([id, data]) => ({
        supplierId: id === 'no-supplier' ? null : id,
        supplierName: data.name,
        total: data.total,
        paidAmount: data.paidAmount,
        debt: data.total - data.paidAmount,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);

    // By booking code (with variance)
    const bookingMap = new Map<string, {
      bookingCode: string;
      customerName: string;
      expectedCost: number;
      actualCost: number;
      services: Array<{ type: string; name: string; cost: number }>;
    }>();

    operators.forEach((op) => {
      const bookingCode = op.request.bookingCode || op.request.code;

      if (!bookingMap.has(bookingCode)) {
        bookingMap.set(bookingCode, {
          bookingCode,
          customerName: op.request.customerName,
          expectedCost: Number(op.request.expectedCost) || 0,
          actualCost: 0,
          services: [],
        });
      }
      const entry = bookingMap.get(bookingCode)!;
      entry.actualCost += Number(op.totalCost);
      entry.services.push({
        type: op.serviceType,
        name: op.serviceName,
        cost: Number(op.totalCost),
      });
    });

    const byBooking = Array.from(bookingMap.values())
      .map((data) => ({
        ...data,
        variance: data.actualCost - data.expectedCost,
        variancePercent: data.expectedCost > 0
          ? Math.round((data.actualCost - data.expectedCost) / data.expectedCost * 100)
          : 0,
        status: data.actualCost <= data.expectedCost
          ? 'on-budget'
          : data.actualCost <= data.expectedCost * 1.1
            ? 'slight-over'
            : 'over-budget',
      }))
      .sort((a, b) => b.actualCost - a.actualCost);

    // Summary with variance
    const totalActualCost = operators.reduce((sum, op) => sum + Number(op.totalCost), 0);
    const totalPaidAmount = operators.reduce((sum, op) => sum + Number(op.paidAmount), 0);

    // Calculate unique expected costs per booking
    const uniqueBookings = new Map<string, number>();
    operators.forEach((op) => {
      const code = op.request.bookingCode || op.request.code;
      if (!uniqueBookings.has(code)) {
        uniqueBookings.set(code, Number(op.request.expectedCost) || 0);
      }
    });
    const totalExpectedCost = Array.from(uniqueBookings.values()).reduce((a, b) => a + b, 0);

    const summary = {
      totalActualCost,
      totalExpectedCost,
      totalVariance: totalActualCost - totalExpectedCost,
      variancePercent: totalExpectedCost > 0
        ? Math.round((totalActualCost - totalExpectedCost) / totalExpectedCost * 100)
        : 0,
      totalPaidAmount,
      totalDebt: totalActualCost - totalPaidAmount,
      totalCount: operators.length,
      bookingCount: uniqueBookings.size,
    };

    return NextResponse.json({
      success: true,
      data: {
        byServiceType,
        bySupplier,
        byBooking,
        summary,
      },
    });
  } catch (error) {
    console.error('Error generating cost breakdown report:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo báo cáo. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }
}
