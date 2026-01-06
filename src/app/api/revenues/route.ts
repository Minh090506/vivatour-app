import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PAYMENT_TYPE_KEYS, CURRENCY_KEYS } from '@/config/revenue-config';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';

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

    // Validate required fields
    if (!body.requestId || !body.paymentDate || !body.paymentType || !body.paymentSource) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: requestId, paymentDate, paymentType, paymentSource' },
        { status: 400 }
      );
    }

    // Validate payment type
    if (!PAYMENT_TYPE_KEYS.includes(body.paymentType)) {
      return NextResponse.json(
        { success: false, error: `Loại thanh toán không hợp lệ: ${body.paymentType}` },
        { status: 400 }
      );
    }

    // Validate request exists
    const req = await prisma.request.findUnique({
      where: { id: body.requestId },
    });

    if (!req) {
      return NextResponse.json(
        { success: false, error: 'Yêu cầu không tồn tại' },
        { status: 404 }
      );
    }

    // Calculate amountVND from foreign currency if needed
    const currency = body.currency || 'VND';
    let amountVND: number;
    let foreignAmount: number | null = null;
    let exchangeRate: number | null = null;

    if (currency === 'VND') {
      amountVND = Number(body.amountVND) || 0;
    } else {
      // Validate currency
      if (!CURRENCY_KEYS.includes(currency)) {
        return NextResponse.json(
          { success: false, error: `Loại tiền tệ không hợp lệ: ${currency}` },
          { status: 400 }
        );
      }

      foreignAmount = Number(body.foreignAmount) || 0;
      exchangeRate = Number(body.exchangeRate) || 0;

      if (foreignAmount <= 0 || exchangeRate <= 0) {
        return NextResponse.json(
          { success: false, error: 'Số tiền ngoại tệ và tỷ giá phải > 0' },
          { status: 400 }
        );
      }

      amountVND = Math.round(foreignAmount * exchangeRate);
    }

    if (amountVND <= 0) {
      return NextResponse.json(
        { success: false, error: 'Số tiền VND phải > 0' },
        { status: 400 }
      );
    }

    // Create revenue - use authenticated user ID from session
    const revenue = await prisma.revenue.create({
      data: {
        requestId: body.requestId,
        paymentDate: new Date(body.paymentDate),
        paymentType: body.paymentType,
        foreignAmount,
        currency,
        exchangeRate,
        amountVND,
        paymentSource: body.paymentSource,
        notes: body.notes?.trim() || null,
        userId: session.user.id,
      },
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
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
