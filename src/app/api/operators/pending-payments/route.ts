import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/operators/pending-payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, today, week, overdue
    const serviceType = searchParams.get('serviceType') || '';
    const supplierId = searchParams.get('supplierId') || '';

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

    // Calculate overdue days for each
    const data = operators.map((op) => {
      let daysOverdue = 0;
      if (op.paymentDeadline) {
        const deadline = new Date(op.paymentDeadline);
        deadline.setHours(0, 0, 0, 0);
        daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (24 * 60 * 60 * 1000));
      }
      return {
        ...op,
        daysOverdue,
        requestCode: op.request?.code,
        customerName: op.request?.customerName,
        supplierName: op.supplierRef?.name || op.supplier,
      };
    });

    // Summary
    const summary = {
      total: data.length,
      totalAmount: data.reduce((sum, op) => sum + Number(op.totalCost), 0),
      overdue: data.filter((op) => op.daysOverdue > 0).length,
      overdueAmount: data
        .filter((op) => op.daysOverdue > 0)
        .reduce((sum, op) => sum + Number(op.totalCost), 0),
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
