import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import { SERVICE_TYPE_KEYS } from '@/config/operator-config';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-utils';

// GET /api/operators - List with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract filters
    const search = searchParams.get('search') || '';
    const requestId = searchParams.get('requestId') || '';
    const supplierId = searchParams.get('supplierId') || '';
    const serviceType = searchParams.get('serviceType') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const isLocked = searchParams.get('isLocked');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (search) {
      where.OR = [
        { serviceName: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { request: { code: { contains: search, mode: 'insensitive' } } },
        { request: { customerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (requestId) where.requestId = requestId;
    if (supplierId) where.supplierId = supplierId;
    if (serviceType) where.serviceType = serviceType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (isLocked !== null && isLocked !== '') {
      where.isLocked = isLocked === 'true';
    }

    if (fromDate || toDate) {
      where.serviceDate = {};
      if (fromDate) where.serviceDate.gte = new Date(fromDate);
      if (toDate) where.serviceDate.lte = new Date(toDate);
    }

    const [operators, total] = await Promise.all([
      prisma.operator.findMany({
        where,
        include: {
          request: { select: { code: true, customerName: true } },
          supplierRef: { select: { code: true, name: true } },
        },
        orderBy: { serviceDate: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.operator.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: operators,
      total,
      hasMore: offset + operators.length < total,
    });
  } catch (error) {
    console.error('Error fetching operators:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/operators - Create operator
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.requestId || !body.serviceDate || !body.serviceType || !body.serviceName) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: requestId, serviceDate, serviceType, serviceName' },
        { status: 400 }
      );
    }

    // Validate service type
    if (!SERVICE_TYPE_KEYS.includes(body.serviceType)) {
      return NextResponse.json(
        { success: false, error: `Loại dịch vụ không hợp lệ: ${body.serviceType}` },
        { status: 400 }
      );
    }

    // Validate request exists and is F5
    const req = await prisma.request.findUnique({
      where: { id: body.requestId },
    });

    if (!req) {
      return NextResponse.json(
        { success: false, error: 'Booking không tồn tại' },
        { status: 404 }
      );
    }

    if (req.status !== 'F5') {
      return NextResponse.json(
        { success: false, error: 'Chỉ có thể thêm dịch vụ cho Booking đã xác nhận (F5)' },
        { status: 400 }
      );
    }

    // Validate supplier if linked
    let supplierName = body.supplier?.trim() || null;
    if (body.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: body.supplierId },
      });
      if (!supplier) {
        return NextResponse.json(
          { success: false, error: 'NCC không tồn tại' },
          { status: 404 }
        );
      }
      // Auto-fill supplier name if not provided
      if (!supplierName) {
        supplierName = supplier.name;
      }
    }

    // Validate costs
    const costBeforeTax = Number(body.costBeforeTax) || 0;
    const vat = body.vat !== undefined && body.vat !== null ? Number(body.vat) : null;
    const totalCost = Number(body.totalCost) || costBeforeTax + (vat || 0);

    // Create operator
    const operator = await prisma.operator.create({
      data: {
        requestId: body.requestId,
        supplierId: body.supplierId || null,
        serviceDate: new Date(body.serviceDate),
        serviceType: body.serviceType,
        serviceName: body.serviceName.trim(),
        supplier: supplierName,
        costBeforeTax,
        vat,
        totalCost,
        paymentDeadline: body.paymentDeadline ? new Date(body.paymentDeadline) : null,
        bankAccount: body.bankAccount?.trim() || null,
        notes: body.notes?.trim() || null,
        userId: user.id,
      },
      include: {
        request: { select: { code: true, customerName: true } },
        supplierRef: { select: { code: true, name: true } },
      },
    });

    // Create history entry
    await createOperatorHistory({
      operatorId: operator.id,
      action: 'CREATE',
      changes: { created: { before: null, after: { id: operator.id, serviceName: operator.serviceName } } },
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: operator }, { status: 201 });
  } catch (error) {
    console.error('Error creating operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo dịch vụ: ${message}` },
      { status: 500 }
    );
  }
}
