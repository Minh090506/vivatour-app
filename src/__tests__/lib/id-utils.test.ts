import {
  removeDiacritics,
  formatTimestamp,
  formatDatePart,
  generateRequestId,
  generateServiceId,
  generateRevenueId,
} from '@/lib/id-utils';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    request: {
      findUnique: jest.fn(),
    },
    operator: {
      findUnique: jest.fn(),
    },
    revenue: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ID Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Test: removeDiacritics
  // ============================================
  describe('removeDiacritics - Remove Vietnamese diacritics', () => {
    it('removes A diacritics', () => {
      expect(removeDiacritics('À')).toBe('A');
      expect(removeDiacritics('Á')).toBe('A');
      expect(removeDiacritics('à')).toBe('a');
      expect(removeDiacritics('á')).toBe('a');
    });

    it('removes E diacritics', () => {
      expect(removeDiacritics('È')).toBe('E');
      expect(removeDiacritics('É')).toBe('E');
      expect(removeDiacritics('è')).toBe('e');
      expect(removeDiacritics('é')).toBe('e');
    });

    it('removes I diacritics', () => {
      expect(removeDiacritics('Ì')).toBe('I');
      expect(removeDiacritics('Í')).toBe('I');
      expect(removeDiacritics('ì')).toBe('i');
      expect(removeDiacritics('í')).toBe('i');
    });

    it('removes O diacritics', () => {
      expect(removeDiacritics('Ò')).toBe('O');
      expect(removeDiacritics('Ó')).toBe('O');
      expect(removeDiacritics('ò')).toBe('o');
      expect(removeDiacritics('ó')).toBe('o');
    });

    it('removes all U variants', () => {
      expect(removeDiacritics('ÙÚỦŨỤ')).toBe('UUUUU');
      expect(removeDiacritics('ƯỪỨỬỮỰ')).toBe('UUUUUU');
    });

    it('removes all Y variants', () => {
      expect(removeDiacritics('ỲÝỶỸỴ')).toBe('YYYYY');
      expect(removeDiacritics('ỳýỷỹỵ')).toBe('yyyyy');
    });

    it('converts D with stroke (Đ/đ)', () => {
      expect(removeDiacritics('Đ')).toBe('D');
      expect(removeDiacritics('đ')).toBe('d');
    });

    it('preserves non-diacritic characters', () => {
      expect(removeDiacritics('ABC')).toBe('ABC');
      expect(removeDiacritics('123')).toBe('123');
      expect(removeDiacritics('@#$')).toBe('@#$');
    });

    it('handles mixed strings with diacritics and plain text', () => {
      expect(removeDiacritics('Lý - Jenny')).toBe('Ly - Jenny');
      expect(removeDiacritics('Tú - Tony')).toBe('Tu - Tony');
      expect(removeDiacritics('Nguyễn Văn A')).toBe('Nguyen Van A');
    });

    it('handles empty string', () => {
      expect(removeDiacritics('')).toBe('');
    });

    it('handles whitespace', () => {
      expect(removeDiacritics('  hello  ')).toBe('  hello  ');
    });
  });

  // ============================================
  // Test: formatTimestamp
  // ============================================
  describe('formatTimestamp - Format as yyyyMMddHHmmssSSS', () => {
    it('formats date correctly (17 chars)', () => {
      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = formatTimestamp(date);
      expect(result).toHaveLength(17);
      expect(/^\d{17}$/.test(result)).toBe(true);
    });

    it('pads single digit month correctly', () => {
      const date = new Date(2026, 2, 8, 14, 30, 45, 123);
      const result = formatTimestamp(date);
      expect(result).toMatch(/^202603/);
    });

    it('pads single digit date correctly', () => {
      const date = new Date(2026, 0, 5, 14, 30, 45, 123);
      const result = formatTimestamp(date);
      expect(result).toMatch(/^20260105/);
    });

    it('pads single digit hours/minutes/seconds', () => {
      const date = new Date(2026, 0, 8, 9, 5, 3, 7);
      const result = formatTimestamp(date);
      expect(result).toMatch(/090503007$/);
    });

    it('handles midnight (00:00:00)', () => {
      const date = new Date(2026, 0, 8, 0, 0, 0, 0);
      const result = formatTimestamp(date);
      expect(result).toMatch(/000000000$/);
    });

    it('handles milliseconds with 3 digits padding', () => {
      const date1 = new Date(2026, 0, 8, 14, 30, 45, 1);
      expect(formatTimestamp(date1)).toMatch(/001$/);

      const date2 = new Date(2026, 0, 8, 14, 30, 45, 10);
      expect(formatTimestamp(date2)).toMatch(/010$/);

      const date3 = new Date(2026, 0, 8, 14, 30, 45, 999);
      expect(formatTimestamp(date3)).toMatch(/999$/);
    });

    it('uses current date/time when not provided', () => {
      const result = formatTimestamp();
      expect(result).toHaveLength(17);
      expect(/^\d{17}$/.test(result)).toBe(true);
    });
  });

  // ============================================
  // Test: formatDatePart
  // ============================================
  describe('formatDatePart - Format as yyyyMMdd', () => {
    it('formats date correctly', () => {
      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = formatDatePart(date);
      expect(result).toBe('20260108');
      expect(result).toHaveLength(8);
    });

    it('pads single digit month', () => {
      const date = new Date(2026, 2, 15, 12, 0, 0, 0);
      expect(formatDatePart(date)).toMatch(/^202603/);
    });

    it('pads single digit date', () => {
      const date = new Date(2026, 0, 5, 12, 0, 0, 0);
      expect(formatDatePart(date)).toMatch(/^20260105/);
    });

    it('ignores time component', () => {
      const date1 = new Date(2026, 0, 8, 0, 0, 0, 0);
      const date2 = new Date(2026, 0, 8, 23, 59, 59, 999);
      expect(formatDatePart(date1)).toBe(formatDatePart(date2));
    });

    it('uses current date when not provided', () => {
      const result = formatDatePart();
      expect(result).toHaveLength(8);
      expect(/^\d{8}$/.test(result)).toBe(true);
    });
  });

  // ============================================
  // Test: generateRequestId
  // ============================================
  describe('generateRequestId - Generate {SellerCode}{yyyyMMddHHmmssSSS}', () => {
    it('generates valid requestId format', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRequestId('LY', date);
      expect(result).toMatch(/^LY\d{17}$/);
    });

    it('converts seller code to uppercase', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRequestId('ly', date);
      expect(result).toMatch(/^LY/);
    });

    it('removes diacritics from seller code', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRequestId('Lý', date);
      expect(result).toMatch(/^LY/);
    });

    it('removes whitespace from seller code', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRequestId('L Y', date);
      expect(result).toMatch(/^LY/);
    });

    it('checks uniqueness in database', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      await generateRequestId('LY', date);
      expect(mockPrisma.request.findUnique).toHaveBeenCalled();
    });

    it('retries with new timestamp on collision', async () => {
      mockPrisma.request.findUnique
        .mockResolvedValueOnce({ id: 'some-id' }) // First call: collision
        .mockResolvedValueOnce(null); // Second call: available

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRequestId('LY', date);
      expect(mockPrisma.request.findUnique).toHaveBeenCalledTimes(2);
      expect(result).toMatch(/^LY\d{17}$/);
    });
  });

  // ============================================
  // Test: generateServiceId
  // ============================================
  describe('generateServiceId - Generate {bookingCode}-{yyyyMMddHHmmssSSS}', () => {
    it('generates valid serviceId format', async () => {
      mockPrisma.operator.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateServiceId('20260108L0001', date);
      expect(result).toMatch(/^20260108L0001-\d{17}$/);
    });

    it('includes booking code in serviceId', async () => {
      mockPrisma.operator.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateServiceId('ABC123', date);
      expect(result).toMatch(/^ABC123-/);
    });

    it('includes timestamp after hyphen', async () => {
      mockPrisma.operator.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateServiceId('BC', date);
      expect(result).toMatch(/-\d{17}$/);
    });

    it('checks uniqueness in database', async () => {
      mockPrisma.operator.findUnique.mockResolvedValue(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      await generateServiceId('BC', date);
      expect(mockPrisma.operator.findUnique).toHaveBeenCalled();
    });

    it('retries on collision', async () => {
      mockPrisma.operator.findUnique
        .mockResolvedValueOnce({ id: 'some-id' })
        .mockResolvedValueOnce(null);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateServiceId('BC', date);
      expect(mockPrisma.operator.findUnique).toHaveBeenCalledTimes(2);
      expect(result).toMatch(/^BC-\d{17}$/);
    });
  });

  // ============================================
  // Test: generateRevenueId
  // ============================================
  describe('generateRevenueId - Generate {bookingCode}-{yyyyMMddHHmmss}-{rowNum}', () => {
    it('generates valid revenueId format', async () => {
      mockPrisma.revenue.findMany.mockResolvedValue([]);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRevenueId('20260108L0001', date);
      expect(result).toMatch(/^20260108L0001-\d{14}-\d+$/);
    });

    it('includes booking code', async () => {
      mockPrisma.revenue.findMany.mockResolvedValue([]);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRevenueId('ABC123', date);
      expect(result).toMatch(/^ABC123-/);
    });

    it('formats timestamp without milliseconds', async () => {
      mockPrisma.revenue.findMany.mockResolvedValue([]);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRevenueId('BC', date);
      expect(result).toMatch(/-\d{14}-/);
    });

    it('increments row number for same prefix', async () => {
      const existingRevenue = [
        { revenueId: 'BC-20260108143045-1' },
        { revenueId: 'BC-20260108143045-2' },
      ];
      mockPrisma.revenue.findMany.mockResolvedValue(existingRevenue as any);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRevenueId('BC', date);
      expect(result).toMatch(/-3$/);
    });

    it('starts with row 1 for new prefix', async () => {
      mockPrisma.revenue.findMany.mockResolvedValue([]);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      const result = await generateRevenueId('BC', date);
      expect(result).toMatch(/-1$/);
    });

    it('filters by prefix correctly', async () => {
      mockPrisma.revenue.findMany.mockResolvedValue([]);

      const date = new Date(2026, 0, 8, 14, 30, 45, 123);
      await generateRevenueId('BC', date);
      expect(mockPrisma.revenue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            revenueId: expect.objectContaining({
              startsWith: expect.stringContaining('BC-202601081430'),
            }),
          }),
        })
      );
    });
  });

  // ============================================
  // Integration: ID generation flow
  // ============================================
  describe('ID generation flow', () => {
    it('generates unique IDs for multiple calls', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      const date1 = new Date(2026, 0, 8, 14, 30, 45, 100);
      const date2 = new Date(2026, 0, 8, 14, 30, 45, 200);

      const id1 = await generateRequestId('LY', date1);
      const id2 = await generateRequestId('LY', date2);

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^LY\d{17}$/);
      expect(id2).toMatch(/^LY\d{17}$/);
    });

    it('handles concurrent ID generation', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      const date1 = new Date(2026, 0, 8, 14, 30, 45, 100);
      const date2 = new Date(2026, 0, 8, 14, 30, 45, 200);
      const date3 = new Date(2026, 0, 8, 14, 30, 45, 300);

      const promises = [
        generateRequestId('LY', date1),
        generateRequestId('LY', date2),
        generateRequestId('LY', date3),
      ];

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results);

      expect(uniqueIds.size).toBe(3); // All should be unique
    });
  });
});
