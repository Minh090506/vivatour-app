// ============================================
// Request Module Utilities
// ID generation, date calculations, follow-up logic
// ============================================

import { prisma } from '@/lib/db';

/**
 * Generate RQID: RQ-YYMMDD-0001
 * Sequential counter resets daily
 */
export async function generateRQID(): Promise<string> {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `RQ-${dateStr}-`;

  // Get today's count
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const count = await prisma.request.count({
    where: {
      createdAt: { gte: todayStart, lte: todayEnd },
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

/**
 * Generate Booking Code: YYYYMMDD + SellerCode + Seq
 * Example: 20260201L0005
 *
 * Fallback: If no sellerCode, use first letter of seller name
 */
export async function generateBookingCode(
  startDate: Date,
  sellerId: string
): Promise<string> {
  // Get seller code or fallback to name initial
  const config = await prisma.configUser.findUnique({
    where: { userId: sellerId },
    include: { user: { select: { name: true } } },
  });

  let code: string;

  if (config?.sellerCode) {
    code = config.sellerCode;
  } else if (config?.user?.name) {
    // Fallback: first letter of name, uppercase
    code = config.user.name.charAt(0).toUpperCase();
  } else {
    // Ultimate fallback
    code = 'X';
  }

  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const day = String(startDate.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `${dateStr}${code}`;

  // Get max sequence for this prefix
  const existing = await prisma.request.findMany({
    where: { bookingCode: { startsWith: prefix } },
    orderBy: { bookingCode: 'desc' },
    take: 1,
    select: { bookingCode: true },
  });

  let seq = 1;
  if (existing.length > 0 && existing[0].bookingCode) {
    // Extract sequence from existing code (last 4 digits)
    const lastSeq = parseInt(existing[0].bookingCode.slice(-4), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Calculate end date from start + tourDays
 * End date is inclusive (startDate + tourDays - 1)
 */
export function calculateEndDate(startDate: Date, tourDays: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + tourDays - 1);
  return end;
}

/**
 * Calculate next follow-up date based on ConfigFollowUp
 */
export async function calculateNextFollowUp(
  stage: string,
  lastContactDate: Date
): Promise<Date | null> {
  const config = await prisma.configFollowUp.findUnique({
    where: { stage },
  });

  if (!config || !config.isActive) return null;

  const next = new Date(lastContactDate);
  next.setDate(next.getDate() + config.daysToWait);
  return next;
}

/**
 * Get seller code from ConfigUser
 */
export async function getSellerCode(userId: string): Promise<string | null> {
  const config = await prisma.configUser.findUnique({
    where: { userId },
    select: { sellerCode: true },
  });
  return config?.sellerCode ?? null;
}

/**
 * Check if user can view all requests
 */
export async function canUserViewAll(userId: string): Promise<boolean> {
  const config = await prisma.configUser.findUnique({
    where: { userId },
    select: { canViewAll: true },
  });
  return config?.canViewAll ?? false;
}

/**
 * Get follow-up date boundaries for queries
 */
export function getFollowUpDateBoundaries(): {
  todayStart: Date;
  todayEnd: Date;
  threeDaysLater: Date;
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const threeDaysLater = new Date(todayStart);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  return { todayStart, todayEnd, threeDaysLater };
}
