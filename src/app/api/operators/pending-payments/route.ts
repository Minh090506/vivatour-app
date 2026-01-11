import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractZodErrors } from '@/lib/validations/request-validation';

// Zod schema for query params validation
const pendingPaymentsQuerySchema = z.object({
  filter: z.enum(['all', 'today', 'week', 'overdue']).default('all'),
  serviceType: z.string().optional(),
  supplierId: z.string().uuid('ID NCC không hợp lệ').optional(),
});

// GET /api/operators/pending-payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate with Zod schema
    const validation = pendingPaymentsQuerySchema.safeParse({
      filter: searchParams.get('filter') || undefined,
      serviceType: searchParams.get('serviceType') || undefined,
      supplierId: searchParams.get('supplierId') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dữ liệu không hợp lệ',
          details: extractZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { filter, serviceType, supplierId } = validation.data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Build where clause
    const where: Record<string, unknown> = {
      paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      isLocked: false,
    };

    if (filter === 'today') {
      where.paymentDeadline = {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (filter === 'week') {
      where.paymentDeadline = {
        gte: today,
        lt: weekEnd,
      };
    } else if (filter === 'overdue') {
      where.paymentDeadline = { lt: today };
    }

    if (serviceType) where.serviceType = serviceType;
    if (supplierId) where.supplierId = supplierId;

    const operators = await prisma.operator.findMany({
      where,
      include: {
        request: { select: { code: true, customerName: true } },
        supplierRef: { select: { code: true, name: true } },
      },
      orderBy: [
        { paymentDeadline: 'asc' }, // Urgent first
        { serviceDate: 'asc' },
      ],
    });

    // Calculate overdue days and debt for each
    const data = operators.map((op) => {
      let daysOverdue = 0;
      if (op.paymentDeadline) {
        const deadline = new Date(op.paymentDeadline);
        deadline.setHours(0, 0, 0, 0);
        daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (24 * 60 * 60 * 1000));
      }
      const totalCost = Number(op.totalCost) || 0;
      const paidAmount = Number(op.paidAmount) || 0;
      const debt = totalCost - paidAmount;
      return {
        ...op,
        paidAmount,
        debt,
        daysOverdue,
        requestCode: op.request?.code,
        customerName: op.request?.customerName,
        supplierName: op.supplierRef?.name || op.supplier,
      };
    });

    // Summary with debt tracking
    const summary = {
      total: data.length,
      totalAmount: data.reduce((sum, op) => sum + Number(op.totalCost), 0),
      totalDebt: data.reduce((sum, op) => sum + op.debt, 0),
      totalPaid: data.reduce((sum, op) => sum + op.paidAmount, 0),
      overdue: data.filter((op) => op.daysOverdue > 0).length,
      overdueAmount: data
        .filter((op) => op.daysOverdue > 0)
        .reduce((sum, op) => sum + Number(op.totalCost), 0),
      overdueDebt: data
        .filter((op) => op.daysOverdue > 0)
        .reduce((sum, op) => sum + op.debt, 0),
      dueToday: data.filter((op) => op.daysOverdue === 0).length,
      dueThisWeek: data.filter((op) => op.daysOverdue <= 0 && op.daysOverdue > -7).length,
    };

    return NextResponse.json({ success: true, data, summary });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách: ${message}` },
      { status: 500 }
    );
  }
}
