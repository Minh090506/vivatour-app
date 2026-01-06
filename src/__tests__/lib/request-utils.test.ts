/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Tests for request module utilities
// Covers: generateRQID, generateBookingCode, calculateEndDate, calculateNextFollowUp, etc.

import { prismaMock } from '@/lib/__mocks__/db';

// Mock the db module before importing the module under test
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

import {
  generateRQID,
  generateBookingCode,
  calculateEndDate,
  calculateNextFollowUp,
  getSellerCode,
  canUserViewAll,
  getFollowUpDateBoundaries,
} from '@/lib/request-utils';

describe('generateRQID', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate RQID with correct format RQ-YYMMDD-XXXX', async () => {
    // Mock today's count as 5
    prismaMock.request.count.mockResolvedValue(5);

    const result = await generateRQID();

    // Result should match RQ-YYMMDD-0006 format (5 + 1 = 6)
    expect(result).toMatch(/^RQ-\d{6}-\d{4}$/);
    expect(result.endsWith('-0006')).toBe(true);
  });

  it('should pad sequence number with zeros', async () => {
    prismaMock.request.count.mockResolvedValue(0);

    const result = await generateRQID();

    expect(result).toMatch(/-0001$/);
  });

  it('should pad sequence to 4 digits for count 999', async () => {
    prismaMock.request.count.mockResolvedValue(999);

    const result = await generateRQID();

    expect(result).toMatch(/-1000$/);
  });

  it('should query requests created today', async () => {
    prismaMock.request.count.mockResolvedValue(0);

    await generateRQID();

    const callArgs = prismaMock.request.count.mock.calls[0][0];
    expect(callArgs.where?.createdAt?.gte).toBeDefined();
    expect(callArgs.where?.createdAt?.lte).toBeDefined();
  });
});

describe('generateBookingCode - Phase 1 Schema Changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with explicit sellerCode', () => {
    it('should use sellerCode when available', async () => {
      const startDate = new Date('2026-02-15');
      const sellerId = 'seller-1';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-1',
        userId: sellerId,
        sellerCode: 'L',
        sellerName: 'Le Quoc Anh',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Le Quoc Anh' },
      } as any);

      // Mock no existing booking codes
      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      // Format: YYYYMMDD + Code + Seq = 20260215L0001
      expect(result).toBe('20260215L0001');
    });

    it('should accept single char sellerCode', async () => {
      const startDate = new Date('2026-03-01');
      const sellerId = 'seller-2';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-2',
        userId: sellerId,
        sellerCode: 'N',
        sellerName: 'Nguyen Van B',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Nguyen Van B' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toBe('20260301N0001');
    });

    it('should handle multi-char sellerCode (edge case)', async () => {
      const startDate = new Date('2026-01-10');
      const sellerId = 'seller-3';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-3',
        userId: sellerId,
        sellerCode: 'LN', // Multi-char edge case
        sellerName: 'Le Nguyen',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Le Nguyen' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toBe('20260110LN0001');
    });
  });

  describe('fallback to sellerName first letter', () => {
    it('should use first letter of name when sellerCode is null', async () => {
      const startDate = new Date('2026-02-20');
      const sellerId = 'seller-4';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-4',
        userId: sellerId,
        sellerCode: null, // No explicit code
        sellerName: null,
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Tran Duc Hung' }, // Fallback to user.name
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      // Uses first letter 'T' from 'Tran Duc Hung'
      expect(result).toBe('20260220T0001');
    });

    it('should uppercase first letter of name', async () => {
      const startDate = new Date('2026-02-25');
      const sellerId = 'seller-5';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-5',
        userId: sellerId,
        sellerCode: null,
        sellerName: null,
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'pham van a' }, // lowercase
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      // First letter 'p' becomes 'P'
      expect(result).toBe('20260225P0001');
    });

    it('should handle single character name', async () => {
      const startDate = new Date('2026-03-05');
      const sellerId = 'seller-6';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-6',
        userId: sellerId,
        sellerCode: null,
        sellerName: null,
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'V' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toBe('20260305V0001');
    });
  });

  describe('ultimate fallback to X', () => {
    it('should use X when no sellerCode and no name', async () => {
      const startDate = new Date('2026-02-10');
      const sellerId = 'seller-7';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-7',
        userId: sellerId,
        sellerCode: null,
        sellerName: null,
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: null }, // No name
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toBe('20260210X0001');
    });

    it('should use X when config user not found', async () => {
      const startDate = new Date('2026-02-12');
      const sellerId = 'seller-8';

      prismaMock.configUser.findUnique.mockResolvedValue(null);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toBe('20260212X0001');
    });

    it('should use X when user object is missing', async () => {
      const startDate = new Date('2026-02-14');
      const sellerId = 'seller-9';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-9',
        userId: sellerId,
        sellerCode: null,
        sellerName: null,
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: undefined, // Missing user object
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toBe('20260214X0001');
    });
  });

  describe('sequence numbering', () => {
    it('should increment sequence for same date and code', async () => {
      const startDate = new Date('2026-02-01');
      const sellerId = 'seller-10';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-10',
        userId: sellerId,
        sellerCode: 'L',
        sellerName: 'Le Anh',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Le Anh' },
      } as any);

      // Mock existing booking codes
      prismaMock.request.findMany.mockResolvedValue([
        { bookingCode: '20260201L0005' },
      ] as any);

      const result = await generateBookingCode(startDate, sellerId);

      // Next sequence is 5 + 1 = 6
      expect(result).toBe('20260201L0006');
    });

    it('should start at 0001 when no existing codes', async () => {
      const startDate = new Date('2026-02-16');
      const sellerId = 'seller-11';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-11',
        userId: sellerId,
        sellerCode: 'T',
        sellerName: 'Tran A',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Tran A' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toBe('20260216T0001');
    });

    it('should pad sequence with zeros', async () => {
      const startDate = new Date('2026-02-17');
      const sellerId = 'seller-12';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-12',
        userId: sellerId,
        sellerCode: 'N',
        sellerName: 'Nguyen B',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Nguyen B' },
      } as any);

      // Existing code with sequence 99
      prismaMock.request.findMany.mockResolvedValue([
        { bookingCode: '20260217N0099' },
      ] as any);

      const result = await generateBookingCode(startDate, sellerId);

      // Next is 99 + 1 = 100
      expect(result).toBe('20260217N0100');
    });

    it('should handle max 4-digit sequence (9999)', async () => {
      const startDate = new Date('2026-02-18');
      const sellerId = 'seller-13';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-13',
        userId: sellerId,
        sellerCode: 'V',
        sellerName: 'Vu C',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Vu C' },
      } as any);

      // Existing code with sequence 9999
      prismaMock.request.findMany.mockResolvedValue([
        { bookingCode: '20260218V9999' },
      ] as any);

      const result = await generateBookingCode(startDate, sellerId);

      // Next is 9999 + 1 = 10000 (overflow to 5 digits)
      expect(result).toBe('20260218V10000');
    });
  });

  describe('date formatting', () => {
    it('should format date as YYYYMMDD', async () => {
      const startDate = new Date('2026-01-05');
      const sellerId = 'seller-14';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-14',
        userId: sellerId,
        sellerCode: 'L',
        sellerName: 'Le D',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Le D' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result).toMatch(/^20260105L\d+$/);
    });

    it('should pad month and day with zeros', async () => {
      const startDate = new Date('2026-03-09'); // March 9th
      const sellerId = 'seller-15';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-15',
        userId: sellerId,
        sellerCode: 'N',
        sellerName: 'Nguyen C',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Nguyen C' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result.startsWith('20260309')).toBe(true);
    });

    it('should handle December dates', async () => {
      const startDate = new Date('2026-12-31');
      const sellerId = 'seller-16';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-16',
        userId: sellerId,
        sellerCode: 'X',
        sellerName: 'Xe D',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Xe D' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      const result = await generateBookingCode(startDate, sellerId);

      expect(result.startsWith('20261231')).toBe(true);
    });
  });

  describe('existing booking codes preservation', () => {
    it('should not modify existing booking codes', async () => {
      const startDate = new Date('2026-02-19');
      const sellerId = 'seller-17';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-17',
        userId: sellerId,
        sellerCode: 'L',
        sellerName: 'Le E',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Le E' },
      } as any);

      // Mock existing codes - findMany returns results ordered by bookingCode DESC, take: 1
      // So it only returns the highest sequence for the given prefix
      prismaMock.request.findMany.mockResolvedValue([
        { bookingCode: '20260219L0003' }, // Highest sequence for this prefix
      ] as any);

      const result = await generateBookingCode(startDate, sellerId);

      // Should increment from 3 to 4
      expect(result).toBe('20260219L0004');
    });

    it('should query correctly with startsWith filter', async () => {
      const startDate = new Date('2026-02-20');
      const sellerId = 'seller-18';

      prismaMock.configUser.findUnique.mockResolvedValue({
        id: 'config-18',
        userId: sellerId,
        sellerCode: 'T',
        sellerName: 'Tran E',
        canViewAll: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Tran E' },
      } as any);

      prismaMock.request.findMany.mockResolvedValue([]);

      await generateBookingCode(startDate, sellerId);

      const findManyCall = prismaMock.request.findMany.mock.calls[0][0];
      expect(findManyCall.where?.bookingCode?.startsWith).toBe('20260220T');
    });
  });
});

describe('calculateEndDate', () => {
  it('should calculate end date as startDate + tourDays - 1', () => {
    const startDate = new Date('2026-02-01');
    const tourDays = 5;

    const result = calculateEndDate(startDate, tourDays);

    const expectedEnd = new Date('2026-02-05');
    expect(result).toEqual(expectedEnd);
  });

  it('should handle single day tour', () => {
    const startDate = new Date('2026-02-10');
    const tourDays = 1;

    const result = calculateEndDate(startDate, tourDays);

    expect(result).toEqual(startDate);
  });

  it('should handle two day tour', () => {
    const startDate = new Date('2026-02-15');
    const tourDays = 2;

    const result = calculateEndDate(startDate, tourDays);

    const expectedEnd = new Date('2026-02-16');
    expect(result).toEqual(expectedEnd);
  });

  it('should handle long tour (cross month)', () => {
    const startDate = new Date('2026-02-25');
    const tourDays = 10;

    const result = calculateEndDate(startDate, tourDays);

    const expectedEnd = new Date('2026-03-06');
    expect(result).toEqual(expectedEnd);
  });

  it('should not mutate original date', () => {
    const startDate = new Date('2026-02-20');
    const originalTime = startDate.getTime();
    const tourDays = 5;

    calculateEndDate(startDate, tourDays);

    expect(startDate.getTime()).toBe(originalTime);
  });
});

describe('calculateNextFollowUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate next follow-up date based on config', async () => {
    const stage = 'F1';
    const lastContactDate = new Date('2026-02-01');

    prismaMock.configFollowUp.findUnique.mockResolvedValue({
      id: 'config-f1',
      stage: 'F1',
      daysToWait: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await calculateNextFollowUp(stage, lastContactDate);

    const expectedDate = new Date('2026-02-04');
    expect(result).toEqual(expectedDate);
  });

  it('should return null when config is not found', async () => {
    const stage = 'F2';
    const lastContactDate = new Date('2026-02-01');

    prismaMock.configFollowUp.findUnique.mockResolvedValue(null);

    const result = await calculateNextFollowUp(stage, lastContactDate);

    expect(result).toBeNull();
  });

  it('should return null when config is inactive', async () => {
    const stage = 'F3';
    const lastContactDate = new Date('2026-02-01');

    prismaMock.configFollowUp.findUnique.mockResolvedValue({
      id: 'config-f3',
      stage: 'F3',
      daysToWait: 5,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await calculateNextFollowUp(stage, lastContactDate);

    expect(result).toBeNull();
  });

  it('should handle 0 days to wait', async () => {
    const stage = 'F4';
    const lastContactDate = new Date('2026-02-01');

    prismaMock.configFollowUp.findUnique.mockResolvedValue({
      id: 'config-f4',
      stage: 'F4',
      daysToWait: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await calculateNextFollowUp(stage, lastContactDate);

    expect(result).toEqual(lastContactDate);
  });

  it('should handle large days to wait', async () => {
    const stage = 'F1';
    const lastContactDate = new Date('2026-02-01');

    prismaMock.configFollowUp.findUnique.mockResolvedValue({
      id: 'config-f1',
      stage: 'F1',
      daysToWait: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await calculateNextFollowUp(stage, lastContactDate);

    const expectedDate = new Date('2026-03-03');
    expect(result).toEqual(expectedDate);
  });
});

describe('getSellerCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return seller code when available', async () => {
    const userId = 'user-1';

    prismaMock.configUser.findUnique.mockResolvedValue({
      sellerCode: 'L',
    } as any);

    const result = await getSellerCode(userId);

    expect(result).toBe('L');
  });

  it('should return null when seller code is null', async () => {
    const userId = 'user-2';

    prismaMock.configUser.findUnique.mockResolvedValue({
      sellerCode: null,
    } as any);

    const result = await getSellerCode(userId);

    expect(result).toBeNull();
  });

  it('should return null when config not found', async () => {
    const userId = 'user-3';

    prismaMock.configUser.findUnique.mockResolvedValue(null);

    const result = await getSellerCode(userId);

    expect(result).toBeNull();
  });

  it('should call findUnique with correct userId', async () => {
    const userId = 'user-4';

    prismaMock.configUser.findUnique.mockResolvedValue({
      sellerCode: 'N',
    } as any);

    await getSellerCode(userId);

    expect(prismaMock.configUser.findUnique).toHaveBeenCalledWith({
      where: { userId },
      select: { sellerCode: true },
    });
  });
});

describe('canUserViewAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when canViewAll is true', async () => {
    const userId = 'user-5';

    prismaMock.configUser.findUnique.mockResolvedValue({
      canViewAll: true,
    } as any);

    const result = await canUserViewAll(userId);

    expect(result).toBe(true);
  });

  it('should return false when canViewAll is false', async () => {
    const userId = 'user-6';

    prismaMock.configUser.findUnique.mockResolvedValue({
      canViewAll: false,
    } as any);

    const result = await canUserViewAll(userId);

    expect(result).toBe(false);
  });

  it('should return false when config not found', async () => {
    const userId = 'user-7';

    prismaMock.configUser.findUnique.mockResolvedValue(null);

    const result = await canUserViewAll(userId);

    expect(result).toBe(false);
  });
});

describe('getFollowUpDateBoundaries', () => {
  it('should return today start and end dates', () => {
    const result = getFollowUpDateBoundaries();

    expect(result.todayStart).toBeDefined();
    expect(result.todayEnd).toBeDefined();
    expect(result.threeDaysLater).toBeDefined();
  });

  it('todayStart should be at 00:00:00', () => {
    const result = getFollowUpDateBoundaries();

    expect(result.todayStart.getHours()).toBe(0);
    expect(result.todayStart.getMinutes()).toBe(0);
    expect(result.todayStart.getSeconds()).toBe(0);
    expect(result.todayStart.getMilliseconds()).toBe(0);
  });

  it('todayEnd should be at 23:59:59.999', () => {
    const result = getFollowUpDateBoundaries();

    expect(result.todayEnd.getHours()).toBe(23);
    expect(result.todayEnd.getMinutes()).toBe(59);
    expect(result.todayEnd.getSeconds()).toBe(59);
    expect(result.todayEnd.getMilliseconds()).toBe(999);
  });

  it('threeDaysLater should be 3 days after todayStart', () => {
    const result = getFollowUpDateBoundaries();

    const expectedDate = new Date(result.todayStart);
    expectedDate.setDate(expectedDate.getDate() + 3);

    // Compare only year, month, day
    expect(result.threeDaysLater.getFullYear()).toBe(expectedDate.getFullYear());
    expect(result.threeDaysLater.getMonth()).toBe(expectedDate.getMonth());
    expect(result.threeDaysLater.getDate()).toBe(expectedDate.getDate());
  });

  it('should have same date for todayStart and todayEnd', () => {
    const result = getFollowUpDateBoundaries();

    expect(result.todayStart.getFullYear()).toBe(result.todayEnd.getFullYear());
    expect(result.todayStart.getMonth()).toBe(result.todayEnd.getMonth());
    expect(result.todayStart.getDate()).toBe(result.todayEnd.getDate());
  });
});
