import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CURRENCY_KEYS } from '@/config/revenue-config';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { generateRevenueId } from '@/lib/id-utils';
import { createRevenueHistory, REVENUE_HISTORY_ACTIONS } from '@/lib/revenue-history';
import { createRevenueApiSchema, extractRevenueZodErrors } from '@/lib/validations/revenue-validation';

// GET /api/revenues - List with filters
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Verify permission
    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:view')) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền xem thu nhập' },
        { status: 403 }
      );
    }
    const { searchParams } = new URL(request.url);

    // Extract filters
    const requestId = searchParams.get('requestId') || '';
    const paymentType = searchParams.get('paymentType') || '';
    const paymentSource = searchParams.get('paymentSource') || '';
    const currency = searchParams.get('currency') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const isLocked = searchParams.get('isLocked');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (requestId) where.requestId = requestId;
    if (paymentType) where.paymentType = paymentType;
    if (paymentSource) where.paymentSource = paymentSource;
    if (currency) where.currency = currency;
    if (isLocked !== null && isLocked !== '') {
      where.isLocked = isLocked === 'true';
    }

    if (fromDate || toDate) {
      where.paymentDate = {};
      if (fromDate) where.paymentDate.gte = new Date(fromDate);
      if (toDate) where.paymentDate.lte = new Date(toDate);
    }

    const [revenues, total] = await Promise.all([
      prisma.revenue.findMany({
        where,
        include: {
          request: { select: { code: true, customerName: true, bookingCode: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.revenue.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: revenues,
      total,
      hasMore: offset + revenues.length < total,
    });
  } catch (error) {
    console.error('Error fetching revenues:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách thu nhập: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/revenues - Create revenue
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Verify permission
    const role = session.user.role as Role;
    if (!hasPermission(role, 'revenue:manage')) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền tạo thu nhập' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate with Zod schema
    const validationResult = createRevenueApiSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Du lieu khong hop le',
          errors: extractRevenueZodErrors(validationResult.error)
        },
        { status: 400 }
      );
    }
    const validatedData = validationResult.data;

    // Validate request exists and get bookingCode for revenueId generation
    const req = await prisma.request.findUnique({
      where: { id: validatedData.requestId },
      select: { id: true, bookingCode: true },
    });

    if (!req) {
      return NextResponse.json(
        { success: false, error: 'Yeu cau khong ton tai' },
        { status: 404 }
      );
    }

    // Generate revenueId using bookingCode or requestId fallback
    const revenueId = await generateRevenueId(req.bookingCode || validatedData.requestId);

    // Calculate amountVND from foreign currency if needed
    const currency = validatedData.currency;
    let amountVND: number;
    let foreignAmount: number | null = null;
    let exchangeRate: number | null = null;

    if (currency === 'VND') {
      amountVND = validatedData.amountVND || 0;
    } else {
      // Currency already validated by Zod
      foreignAmount = validatedData.foreignAmount || 0;
      exchangeRate = validatedData.exchangeRate || 0;
      amountVND = Math.round(foreignAmount * exchangeRate);
    }

    // Create revenue - use authenticated user ID from session
    const revenue = await prisma.revenue.create({
      data: {
        revenueId,
        requestId: validatedData.requestId,
        paymentDate: new Date(validatedData.paymentDate),
        paymentType: validatedData.paymentType,
        foreignAmount,
        currency,
        exchangeRate,
        amountVND,
        paymentSource: validatedData.paymentSource,
        notes: validatedData.notes?.trim() || null,
        userId: session.user.id,
      },
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Create history entry for CREATE action
    await createRevenueHistory({
      revenueId: revenue.id,
      action: REVENUE_HISTORY_ACTIONS.CREATE,
      changes: {
        revenueId: { after: revenueId },
        amountVND: { after: amountVND },
        paymentType: { after: validatedData.paymentType },
        paymentSource: { after: validatedData.paymentSource },
      },
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: revenue }, { status: 201 });
  } catch (error) {
    console.error('Error creating revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
