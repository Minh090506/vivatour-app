import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sellerSchema, transformSellerData } from '@/lib/validations/config-validation';

// GET /api/config/sellers - List all sellers with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    // Validate search length to prevent performance issues
    if (search.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Từ khóa tìm kiếm quá dài (tối đa 100 ký tự)' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { telegramId: { contains: search, mode: 'insensitive' } },
        { sellerName: { contains: search, mode: 'insensitive' } },
        { sheetName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { sellerCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.seller.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: sellers,
      total,
      page,
      limit,
      hasMore: skip + sellers.length < total,
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách seller: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/config/sellers - Create new seller
export async function POST(request: NextRequest) {
  try {
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

    // Check if telegramId already exists
    const existingTelegram = await prisma.seller.findUnique({
      where: { telegramId: data.telegramId },
    });

    if (existingTelegram) {
      return NextResponse.json(
        { success: false, error: `Telegram ID "${data.telegramId}" đã tồn tại` },
        { status: 400 }
      );
    }

    // Check if sellerCode already exists
    const existingCode = await prisma.seller.findUnique({
      where: { sellerCode: data.sellerCode },
    });

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Mã seller "${data.sellerCode}" đã được sử dụng` },
        { status: 400 }
      );
    }

    const seller = await prisma.seller.create({
      data,
    });

    return NextResponse.json(
      { success: true, data: seller },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating seller:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo seller: ${message}` },
      { status: 500 }
    );
  }
}
