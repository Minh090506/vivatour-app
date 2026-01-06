import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PAYMENT_TYPE_KEYS, CURRENCY_KEYS } from '@/config/revenue-config';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';

// GET /api/revenues/[id] - Get single revenue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const revenue = await prisma.revenue.findUnique({
      where: { id },
      include: {
        request: { select: { id: true, code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!revenue) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: revenue });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải thu nhập: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/revenues/[id] - Update revenue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Không có quyền sửa thu nhập' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if revenue exists
    const existing = await prisma.revenue.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập đã khóa, không thể sửa' },
        { status: 400 }
      );
    }

    // Validate payment type if provided
    if (body.paymentType && !PAYMENT_TYPE_KEYS.includes(body.paymentType)) {
      return NextResponse.json(
        { success: false, error: `Loại thanh toán không hợp lệ: ${body.paymentType}` },
        { status: 400 }
      );
    }

    // Calculate amountVND if currency changed
    const currency = body.currency || existing.currency || 'VND';
    let amountVND = Number(existing.amountVND);
    let foreignAmount = existing.foreignAmount ? Number(existing.foreignAmount) : null;
    let exchangeRate = existing.exchangeRate ? Number(existing.exchangeRate) : null;

    if (body.currency !== undefined || body.foreignAmount !== undefined || body.exchangeRate !== undefined || body.amountVND !== undefined) {
      if (currency === 'VND') {
        amountVND = Number(body.amountVND ?? existing.amountVND) || 0;
        foreignAmount = null;
        exchangeRate = null;
      } else {
        if (!CURRENCY_KEYS.includes(currency)) {
          return NextResponse.json(
            { success: false, error: `Loại tiền tệ không hợp lệ: ${currency}` },
            { status: 400 }
          );
        }

        foreignAmount = Number(body.foreignAmount ?? existing.foreignAmount) || 0;
        exchangeRate = Number(body.exchangeRate ?? existing.exchangeRate) || 0;
        amountVND = Math.round(foreignAmount * exchangeRate);
      }

      if (amountVND <= 0) {
        return NextResponse.json(
          { success: false, error: 'Số tiền VND phải > 0' },
          { status: 400 }
        );
      }
    }

    // Update revenue
    const revenue = await prisma.revenue.update({
      where: { id },
      data: {
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        paymentType: body.paymentType,
        foreignAmount,
        currency,
        exchangeRate,
        amountVND,
        paymentSource: body.paymentSource,
        notes: body.notes?.trim(),
      },
      include: {
        request: { select: { code: true, customerName: true, bookingCode: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: revenue });
  } catch (error) {
    console.error('Error updating revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi cập nhật thu nhập: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/revenues/[id] - Delete revenue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Không có quyền xóa thu nhập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if exists
    const existing = await prisma.revenue.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thu nhập' },
        { status: 404 }
      );
    }

    // Check if locked
    if (existing.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập đã khóa, không thể xóa' },
        { status: 400 }
      );
    }

    await prisma.revenue.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa thu nhập' });
  } catch (error) {
    console.error('Error deleting revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa thu nhập: ${message}` },
      { status: 500 }
    );
  }
}
