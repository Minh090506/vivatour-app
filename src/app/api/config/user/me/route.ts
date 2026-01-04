import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/config/user/me
 * Get current user's configuration (permissions, settings)
 *
 * For now, returns demo data since auth is not implemented yet.
 * In future, will check session and return actual user config.
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session when auth is implemented
    // const session = await getServerSession();
    // const userId = session?.user?.id;

    // For now, return demo config for testing
    // In production, fetch from ConfigUser table:
    // const config = await prisma.configUser.findUnique({
    //   where: { userId },
    //   include: { user: true },
    // });

    // For demo: Get first user from database as current user
    const demoUser = await prisma.user.findFirst({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!demoUser) {
      return NextResponse.json({
        success: true,
        data: {
          userId: null,
          canViewAll: true,
          sellerCode: null,
        },
      });
    }

    // Check if user has config
    const config = await prisma.configUser.findUnique({
      where: { userId: demoUser.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: demoUser.id,
        user: demoUser,
        canViewAll: config?.canViewAll ?? demoUser.role !== 'SELLER',
        sellerCode: config?.sellerCode ?? null,
      },
    });
  } catch (error) {
    console.error('Error fetching user config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user config' },
      { status: 500 }
    );
  }
}
