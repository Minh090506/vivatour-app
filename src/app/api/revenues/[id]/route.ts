import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CURRENCY_KEYS } from '@/config/revenue-config';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { updateRevenueApiSchema, extractRevenueZodErrors } from '@/lib/validations/revenue-validation';

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

    // Check if any lock tier is active (3-tier lock system)
    if (existing.lockKT || existing.lockAdmin || existing.lockFinal) {
      return NextResponse.json(
        { success: false, error: 'Thu nhap da khoa, khong the sua' },
        { status: 403 }
      );
    }

    // Validate with Zod schema
    const validationResult = updateRevenueApiSchema.safeParse(body);
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

    // Calculate amountVND if currency changed
    const currency = validatedData.currency || existing.currency || 'VND';
    let amountVND = Number(existing.amountVND);
    let foreignAmount = existing.foreignAmount ? Number(existing.foreignAmount) : null;
    let exchangeRate = existing.exchangeRate ? Number(existing.exchangeRate) : null;

    if (validatedData.currency !== undefined || validatedData.foreignAmount !== undefined || validatedData.exchangeRate !== undefined || validatedData.amountVND !== undefined) {
      if (currency === 'VND') {
        amountVND = (validatedData.amountVND ?? Number(existing.amountVND)) || 0;
        foreignAmount = null;
        exchangeRate = null;
      } else {
        // Currency already validated by Zod
        foreignAmount = validatedData.foreignAmount ?? (existing.foreignAmount ? Number(existing.foreignAmount) : 0);
        exchangeRate = validatedData.exchangeRate ?? (existing.exchangeRate ? Number(existing.exchangeRate) : 0);
        amountVND = Math.round((foreignAmount ?? 0) * (exchangeRate ?? 0));
      }

      if (amountVND <= 0) {
        return NextResponse.json(
          { success: false, error: 'So tien VND phai > 0' },
          { status: 400 }
        );
      }
    }

    // Update revenue
    const revenue = await prisma.revenue.update({
      where: { id },
      data: {
        paymentDate: validatedData.paymentDate ? new Date(validatedData.paymentDate) : undefined,
        paymentType: validatedData.paymentType,
        foreignAmount,
        currency,
        exchangeRate,
        amountVND,
        paymentSource: validatedData.paymentSource,
        notes: validatedData.notes?.trim(),
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

    // Check if any lock tier is active (3-tier lock system)
    if (existing.lockKT || existing.lockAdmin || existing.lockFinal) {
      return NextResponse.json(
        { success: false, error: 'Thu nhập đã khóa, không thể xóa' },
        { status: 403 }
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
