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

// GET /api/operator/reports/revenue
// Returns revenue analysis: total cost, paid amount, outstanding debt by month
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
    if (serviceType && !SERVICE_TYPE_KEYS.includes(serviceType as never)) {
      return NextResponse.json(
        { success: false, error: 'Loại dịch vụ không hợp lệ' },
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

    // Get all matching operators
    const operators = await prisma.operator.findMany({
      where,
      select: {
        id: true,
        serviceType: true,
        supplierId: true,
        supplier: true,
        serviceDate: true,
        totalCost: true,
        paidAmount: true,
        paymentStatus: true,
        supplierRef: { select: { id: true, name: true } },
      },
    });

    // By month - stacked data for chart (totalCost, paidAmount, debt)
    const monthMap = new Map<string, { totalCost: number; paidAmount: number; debt: number; count: number }>();
    operators.forEach((op) => {
      const date = new Date(op.serviceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { totalCost: 0, paidAmount: 0, debt: 0, count: 0 });
      }
      const entry = monthMap.get(key)!;
      const cost = Number(op.totalCost);
      const paid = Number(op.paidAmount);
      entry.totalCost += cost;
      entry.paidAmount += paid;
      entry.debt += cost - paid;
      entry.count += 1;
    });

    const byMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        totalCost: data.totalCost,
        paidAmount: data.paidAmount,
        debt: data.debt,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // By service type
    const byServiceType = Object.keys(SERVICE_TYPES).map((type) => {
      const items = operators.filter((op) => op.serviceType === type);
      const totalCost = items.reduce((sum, op) => sum + Number(op.totalCost), 0);
      const paidAmount = items.reduce((sum, op) => sum + Number(op.paidAmount), 0);
      return {
        type,
        label: SERVICE_TYPES[type as keyof typeof SERVICE_TYPES].label,
        totalCost,
        paidAmount,
        debt: totalCost - paidAmount,
        count: items.length,
      };
    }).filter((t) => t.count > 0);

    // By supplier
    const supplierMap = new Map<string, { name: string; totalCost: number; paidAmount: number; count: number }>();
    operators.forEach((op) => {
      const key = op.supplierId || 'no-supplier';
      const name = op.supplierRef?.name || op.supplier || 'Không có NCC';

      if (!supplierMap.has(key)) {
        supplierMap.set(key, { name, totalCost: 0, paidAmount: 0, count: 0 });
      }
      const entry = supplierMap.get(key)!;
      entry.totalCost += Number(op.totalCost);
      entry.paidAmount += Number(op.paidAmount);
      entry.count += 1;
    });

    const bySupplier = Array.from(supplierMap.entries())
      .map(([supplierId, data]) => ({
        supplierId: supplierId === 'no-supplier' ? null : supplierId,
        supplierName: data.name,
        totalCost: data.totalCost,
        paidAmount: data.paidAmount,
        debt: data.totalCost - data.paidAmount,
        count: data.count,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Summary
    const totalCost = operators.reduce((sum, op) => sum + Number(op.totalCost), 0);
    const paidAmount = operators.reduce((sum, op) => sum + Number(op.paidAmount), 0);
    const summary = {
      totalCost,
      paidAmount,
      debt: totalCost - paidAmount,
      totalCount: operators.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        byMonth,
        byServiceType,
        bySupplier,
        summary,
      },
    });
  } catch (error) {
    console.error('Error generating operator revenue report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo báo cáo: ${message}` },
      { status: 500 }
    );
  }
}
