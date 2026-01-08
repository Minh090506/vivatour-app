// ============================================
// ID Generation Utilities for VivaTour
// Centralized ID generators for Request, Operator, Revenue
// ============================================

import { prisma } from './db';

// Vietnamese diacritics removal map
const DIACRITICS_MAP: Record<string, string> = {
  // Uppercase
  'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
  'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
  'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
  'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
  'Đ': 'D',
  // Lowercase
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'đ': 'd',
};

/**
 * Remove Vietnamese diacritics from string
 */
export function removeDiacritics(str: string): string {
  return str
    .split('')
    .map((char) => DIACRITICS_MAP[char] || char)
    .join('');
}

/**
 * Format timestamp for ID generation
 * Format: yyyyMMddHHmmssSSS (17 chars)
 */
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds()) +
    pad(date.getMilliseconds(), 3)
  );
}

/**
 * Format date portion only
 * Format: yyyyMMdd (8 chars)
 */
export function formatDatePart(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate())
  );
}

/**
 * Generate RequestID
 * Format: {SellerCode}{yyyyMMddHHmmssSSS}
 * Example: LY20260108143045123
 */
export async function generateRequestId(
  sellerCode: string,
  timestamp: Date = new Date()
): Promise<string> {
  const cleanCode = removeDiacritics(sellerCode).toUpperCase().replace(/\s+/g, '');
  const ts = formatTimestamp(timestamp);
  const requestId = `${cleanCode}${ts}`;

  // Verify uniqueness
  const existing = await prisma.request.findUnique({
    where: { requestId },
    select: { id: true },
  });

  if (existing) {
    // Collision - retry with new timestamp
    await new Promise((r) => setTimeout(r, 1));
    return generateRequestId(sellerCode, new Date());
  }

  return requestId;
}

/**
 * Generate ServiceID for Operator
 * Format: {bookingCode}-{yyyyMMddHHmmssSSS}
 * Example: 20260108L0001-20260108143045123
 */
export async function generateServiceId(
  bookingCode: string,
  timestamp: Date = new Date()
): Promise<string> {
  const ts = formatTimestamp(timestamp);
  const serviceId = `${bookingCode}-${ts}`;

  // Verify uniqueness
  const existing = await prisma.operator.findUnique({
    where: { serviceId },
    select: { id: true },
  });

  if (existing) {
    await new Promise((r) => setTimeout(r, 1));
    return generateServiceId(bookingCode, new Date());
  }

  return serviceId;
}

/**
 * Generate RevenueID
 * Format: {bookingCode}-{yyyyMMddHHmmss}-{rowNum}
 * Example: 20260108L0001-20260108143045-1
 */
export async function generateRevenueId(
  bookingCode: string,
  timestamp: Date = new Date()
): Promise<string> {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateTime =
    timestamp.getFullYear().toString() +
    pad(timestamp.getMonth() + 1) +
    pad(timestamp.getDate()) +
    pad(timestamp.getHours()) +
    pad(timestamp.getMinutes()) +
    pad(timestamp.getSeconds());

  const prefix = `${bookingCode}-${dateTime}`;

  // Get max row number for this prefix
  const existing = await prisma.revenue.findMany({
    where: { revenueId: { startsWith: prefix } },
    select: { revenueId: true },
  });

  const rowNum = existing.length + 1;
  return `${prefix}-${rowNum}`;
}
