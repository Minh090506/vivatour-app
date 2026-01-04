import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SERVICE_TYPES, SERVICE_TYPE_KEYS } from '@/config/operator-config';

// Date format validation regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Validate date string format
function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// GET /api/reports/operator-costs
export async function GET(request: NextRequest) {
  try {
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
        supplierRef: { select: { name: true } },
        request: { select: { code: true } },
      },
    });

    // By service type
    const byServiceType = Object.keys(SERVICE_TYPES).map((type) => {
      const items = operators.filter((op) => op.serviceType === type);
      return {
        type,
        label: SERVICE_TYPES[type as keyof typeof SERVICE_TYPES].label,
        total: items.reduce((sum, op) => sum + Number(op.totalCost), 0),
        count: items.length,
      };
    }).filter((t) => t.count > 0);

    // By supplier
    const supplierMap = new Map<string, { name: string; total: number; count: number }>();
    operators.forEach((op) => {
      const key = op.supplierId || 'no-supplier';
      const name = op.supplierRef?.name || op.supplier || 'Không có NCC';

      if (!supplierMap.has(key)) {
        supplierMap.set(key, { name, total: 0, count: 0 });
      }
      const entry = supplierMap.get(key)!;
      entry.total += Number(op.totalCost);
      entry.count += 1;
    });

    const bySupplier = Array.from(supplierMap.entries())
      .map(([supplierId, data]) => ({
        supplierId: supplierId === 'no-supplier' ? null : supplierId,
        supplierName: data.name,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);

    // By month
    const monthMap = new Map<string, { total: number; count: number }>();
    operators.forEach((op) => {
      const date = new Date(op.serviceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { total: 0, count: 0 });
      }
      const entry = monthMap.get(key)!;
      entry.total += Number(op.totalCost);
      entry.count += 1;
    });

    const byMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Summary
    const totalCost = operators.reduce((sum, op) => sum + Number(op.totalCost), 0);
    const summary = {
      totalCost,
      totalCount: operators.length,
      avgCost: operators.length > 0 ? Math.round(totalCost / operators.length) : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        byServiceType,
        bySupplier,
        byMonth,
        summary,
      },
    });
  } catch (error) {
    console.error('Error generating cost report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo báo cáo: ${message}` },
      { status: 500 }
    );
  }
}
