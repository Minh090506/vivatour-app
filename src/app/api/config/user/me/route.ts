import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-utils';

/**
 * GET /api/config/user/me
 * Get current user's configuration (permissions, settings)
 */
export async function GET(_request: NextRequest) {
  try {
    // Get current user from session
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Fetch user config from database
    const config = await prisma.configUser.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        canViewAll: config?.canViewAll ?? user.role !== 'SELLER',
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
