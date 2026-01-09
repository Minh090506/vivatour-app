import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-utils';
import { generateServiceId } from '@/lib/id-utils';
import {
  createOperatorApiSchema,
  extractOperatorZodErrors,
} from '@/lib/validations/operator-validation';

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
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Default: exclude archived unless includeArchived=true
    if (!includeArchived) {
      where.isArchived = false;
    }

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

    // Add computed debt for each operator
    const operatorsWithDebt = operators.map((op) => ({
      ...op,
      debt: Number(op.totalCost) - Number(op.paidAmount),
    }));

    return NextResponse.json({
      success: true,
      data: operatorsWithDebt,
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

    // Validate with Zod schema
    const validation = createOperatorApiSchema.safeParse(body);
    if (!validation.success) {
      const errors = extractOperatorZodErrors(validation.error);
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Validate request exists and is F5
    const req = await prisma.request.findUnique({
      where: { id: validatedData.requestId },
      select: { id: true, status: true, bookingCode: true, code: true },
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

    // Check duplicate service (same booking + serviceType + serviceDate)
    const serviceDate = new Date(validatedData.serviceDate);
    const startOfDay = new Date(serviceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(serviceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingService = await prisma.operator.findFirst({
      where: {
        requestId: validatedData.requestId,
        serviceType: validatedData.serviceType,
        serviceDate: { gte: startOfDay, lte: endOfDay },
      },
      select: { id: true, serviceName: true },
    });

    if (existingService) {
      return NextResponse.json(
        {
          success: false,
          error: `Đã có dịch vụ ${validatedData.serviceType} vào ngày này: "${existingService.serviceName}"`,
          errors: { serviceType: 'Dịch vụ trùng lặp' },
        },
        { status: 400 }
      );
    }

    // Generate serviceId from bookingCode (or fallback to request code)
    let serviceId: string | null = null;
    const bookingCode = req.bookingCode || req.code;
    if (bookingCode) {
      serviceId = await generateServiceId(bookingCode);
    }

    // Validate supplier if linked
    let supplierName = validatedData.supplier?.trim() || null;
    if (validatedData.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: validatedData.supplierId },
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

    // Extract validated costs (already validated by Zod)
    const costBeforeTax = validatedData.costBeforeTax;
    const vat = validatedData.vat ?? null;
    const totalCost = validatedData.totalCost;
    const paidAmount = validatedData.paidAmount;

    // Determine payment status based on paidAmount
    let paymentStatus = 'PENDING';
    if (paidAmount > 0 && paidAmount < totalCost) {
      paymentStatus = 'PARTIAL';
    } else if (paidAmount >= totalCost) {
      paymentStatus = 'PAID';
    }

    // Create operator with serviceId and lock fields initialized
    const operator = await prisma.operator.create({
      data: {
        requestId: validatedData.requestId,
        supplierId: validatedData.supplierId || null,
        serviceId, // Auto-generated from bookingCode
        serviceDate,
        serviceType: validatedData.serviceType,
        serviceName: validatedData.serviceName.trim(),
        supplier: supplierName,
        costBeforeTax,
        vat,
        totalCost,
        paidAmount,
        paymentStatus,
        paymentDeadline: validatedData.paymentDeadline ? new Date(validatedData.paymentDeadline) : null,
        bankAccount: validatedData.bankAccount?.trim() || null,
        notes: validatedData.notes?.trim() || null,
        userId: user.id,
        // Lock tiers default to false (from schema)
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
