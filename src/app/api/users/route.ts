import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractZodErrors } from '@/lib/validations/request-validation';

// Zod schema for query params validation
const usersQuerySchema = z.object({
  role: z
    .enum(['ADMIN', 'SELLER', 'ACCOUNTANT'], {
      message: 'Role không hợp lệ',
    })
    .optional(),
});

// GET /api/users - List users with optional role filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate with Zod schema
    const validation = usersQuerySchema.safeParse({
      role: searchParams.get('role') || undefined,
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

    const { role } = validation.data;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách người dùng: ${message}` },
      { status: 500 }
    );
  }
}
