import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sellerSchema, transformSellerData } from '@/lib/validations/seller-validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/config/sellers/[id] - Get single seller
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const seller = await prisma.seller.findUnique({
      where: { id },
    });

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy seller' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: seller });
  } catch (error) {
    console.error('Error fetching seller:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải seller: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/config/sellers/[id] - Update seller
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const result = sellerSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const data = transformSellerData(result.data);

    // Check if seller exists
    const existing = await prisma.seller.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy seller' },
        { status: 404 }
      );
    }

    // Check if telegramId is used by another seller
    if (data.telegramId !== existing.telegramId) {
      const existingTelegram = await prisma.seller.findUnique({
        where: { telegramId: data.telegramId },
      });

      if (existingTelegram && existingTelegram.id !== id) {
        return NextResponse.json(
          { success: false, error: `Telegram ID "${data.telegramId}" đã tồn tại` },
          { status: 400 }
        );
      }
    }

    // Check if sellerCode is used by another seller
    if (data.sellerCode !== existing.sellerCode) {
      const existingCode = await prisma.seller.findUnique({
        where: { sellerCode: data.sellerCode },
      });

      if (existingCode && existingCode.id !== id) {
        return NextResponse.json(
          { success: false, error: `Mã seller "${data.sellerCode}" đã được sử dụng` },
          { status: 400 }
        );
      }
    }

    const seller = await prisma.seller.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: seller });
  } catch (error) {
    console.error('Error updating seller:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi cập nhật seller: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/config/sellers/[id] - Delete seller
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.seller.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy seller' },
        { status: 404 }
      );
    }

    await prisma.seller.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa seller thành công',
    });
  } catch (error) {
    console.error('Error deleting seller:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa seller: ${message}` },
      { status: 500 }
    );
  }
}
