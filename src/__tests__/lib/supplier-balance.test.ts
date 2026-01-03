/**
 * @jest-environment node
 */

// Tests for supplier balance calculation logic
// Covers: calculateSupplierBalance, getSupplierBalanceSummary

import { prismaMock } from '@/lib/__mocks__/db';

// Mock the db module before importing the module under test
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

import { calculateSupplierBalance, getSupplierBalanceSummary } from '@/lib/supplier-balance';

describe('calculateSupplierBalance', () => {
  const testSupplierId = 'supplier-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate balance correctly with all transaction types', async () => {
    // Mock transaction groupBy results
    prismaMock.supplierTransaction.groupBy.mockResolvedValue([
      { type: 'DEPOSIT', _sum: { amount: 10000000 }, _count: { _all: 1 } },
      { type: 'REFUND', _sum: { amount: 500000 }, _count: { _all: 1 } },
      { type: 'ADJUSTMENT', _sum: { amount: 200000 }, _count: { _all: 1 } },
      { type: 'FEE', _sum: { amount: 100000 }, _count: { _all: 1 } },
    ] as never);

    // Mock operator costs
    prismaMock.operator.aggregate.mockResolvedValue({
      _sum: { totalCost: 3000000 },
      _count: { _all: 2 },
      _avg: {},
      _min: {},
      _max: {},
    } as never);

    const result = await calculateSupplierBalance(testSupplierId);

    // Balance = 10,000,000 + 500,000 + 200,000 - 100,000 - 3,000,000 = 7,600,000
    expect(result).toEqual({
      deposits: 10000000,
      refunds: 500000,
      adjustments: 200000,
      fees: 100000,
      costs: 3000000,
      balance: 7600000,
    });
  });

  it('should handle zero transactions (new supplier)', async () => {
    prismaMock.supplierTransaction.groupBy.mockResolvedValue([] as never);
    prismaMock.operator.aggregate.mockResolvedValue({
      _sum: { totalCost: null },
      _count: { _all: 0 },
      _avg: {},
      _min: {},
      _max: {},
    } as never);

    const result = await calculateSupplierBalance(testSupplierId);

    expect(result).toEqual({
      deposits: 0,
      refunds: 0,
      adjustments: 0,
      fees: 0,
      costs: 0,
      balance: 0,
    });
  });

  it('should handle deposits only', async () => {
    prismaMock.supplierTransaction.groupBy.mockResolvedValue([
      { type: 'DEPOSIT', _sum: { amount: 5000000 }, _count: { _all: 1 } },
    ] as never);
    prismaMock.operator.aggregate.mockResolvedValue({
      _sum: { totalCost: null },
      _count: { _all: 0 },
      _avg: {},
      _min: {},
      _max: {},
    } as never);

    const result = await calculateSupplierBalance(testSupplierId);

    expect(result.deposits).toBe(5000000);
    expect(result.balance).toBe(5000000);
  });

  it('should calculate negative balance when costs exceed deposits', async () => {
    prismaMock.supplierTransaction.groupBy.mockResolvedValue([
      { type: 'DEPOSIT', _sum: { amount: 1000000 }, _count: { _all: 1 } },
    ] as never);
    prismaMock.operator.aggregate.mockResolvedValue({
      _sum: { totalCost: 3000000 },
      _count: { _all: 1 },
      _avg: {},
      _min: {},
      _max: {},
    } as never);

    const result = await calculateSupplierBalance(testSupplierId);

    expect(result.balance).toBe(-2000000); // 1M - 3M = -2M
  });

  it('should handle large numeric values', async () => {
    const largeDeposit = 999999999999999; // Near max for Decimal(15,0)

    prismaMock.supplierTransaction.groupBy.mockResolvedValue([
      { type: 'DEPOSIT', _sum: { amount: largeDeposit }, _count: { _all: 1 } },
    ] as never);
    prismaMock.operator.aggregate.mockResolvedValue({
      _sum: { totalCost: null },
      _count: { _all: 0 },
      _avg: {},
      _min: {},
      _max: {},
    } as never);

    const result = await calculateSupplierBalance(testSupplierId);

    expect(result.deposits).toBe(largeDeposit);
    expect(result.balance).toBe(largeDeposit);
  });

  it('should call Prisma with correct supplier ID', async () => {
    prismaMock.supplierTransaction.groupBy.mockResolvedValue([] as never);
    prismaMock.operator.aggregate.mockResolvedValue({
      _sum: { totalCost: null },
      _count: { _all: 0 },
      _avg: {},
      _min: {},
      _max: {},
    } as never);

    await calculateSupplierBalance(testSupplierId);

    expect(prismaMock.supplierTransaction.groupBy).toHaveBeenCalledWith({
      by: ['type'],
      where: { supplierId: testSupplierId },
      _sum: { amount: true },
    });

    expect(prismaMock.operator.aggregate).toHaveBeenCalledWith({
      where: { supplierId: testSupplierId },
      _sum: { totalCost: true },
    });
  });
});

describe('getSupplierBalanceSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return balance summary for all active suppliers', async () => {
    const mockSuppliers = [
      { id: 'sup-1', code: 'HOT-DN-ABC-0001', name: 'Hotel A', type: 'HOTEL', paymentModel: 'PREPAID', isActive: true },
      { id: 'sup-2', code: 'RES-HN-XYZ-0001', name: 'Restaurant B', type: 'RESTAURANT', paymentModel: 'CREDIT', isActive: true },
    ];

    prismaMock.supplier.findMany.mockResolvedValue(mockSuppliers as never);

    // Mock balance calculations for each supplier
    prismaMock.supplierTransaction.groupBy
      .mockResolvedValueOnce([
        { type: 'DEPOSIT', _sum: { amount: 5000000 }, _count: { _all: 1 } },
      ] as never)
      .mockResolvedValueOnce([
        { type: 'DEPOSIT', _sum: { amount: 3000000 }, _count: { _all: 1 } },
      ] as never);

    prismaMock.operator.aggregate
      .mockResolvedValueOnce({
        _sum: { totalCost: 1000000 },
        _count: { _all: 1 },
        _avg: {},
        _min: {},
        _max: {},
      } as never)
      .mockResolvedValueOnce({
        _sum: { totalCost: 500000 },
        _count: { _all: 1 },
        _avg: {},
        _min: {},
        _max: {},
      } as never);

    const result = await getSupplierBalanceSummary();

    expect(result.summary.supplierCount).toBe(2);
    expect(result.summary.totalDeposits).toBe(8000000); // 5M + 3M
    expect(result.summary.totalCosts).toBe(1500000); // 1M + 500K
    expect(result.summary.positiveBalance).toBe(2); // Both have positive balance
    expect(result.summary.negativeBalance).toBe(0);
    expect(result.data).toHaveLength(2);
  });

  it('should filter by supplier type when provided', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([] as never);

    await getSupplierBalanceSummary('HOTEL');

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: { isActive: true, type: 'HOTEL' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        paymentModel: true,
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  });

  it('should return empty results for no active suppliers', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([] as never);

    const result = await getSupplierBalanceSummary();

    expect(result.summary.supplierCount).toBe(0);
    expect(result.summary.totalDeposits).toBe(0);
    expect(result.summary.totalCosts).toBe(0);
    expect(result.summary.totalBalance).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('should count positive and negative balances correctly', async () => {
    const mockSuppliers = [
      { id: 'sup-1', code: 'HOT-DN-ABC-0001', name: 'Hotel A', type: 'HOTEL', paymentModel: 'PREPAID', isActive: true },
      { id: 'sup-2', code: 'RES-HN-XYZ-0001', name: 'Restaurant B', type: 'RESTAURANT', paymentModel: 'CREDIT', isActive: true },
      { id: 'sup-3', code: 'TRA-HN-DEF-0001', name: 'Transport C', type: 'TRANSPORT', paymentModel: 'PAY_PER_USE', isActive: true },
    ];

    prismaMock.supplier.findMany.mockResolvedValue(mockSuppliers as never);

    // Supplier 1: positive balance (2M deposits, 1M costs = 1M balance)
    prismaMock.supplierTransaction.groupBy
      .mockResolvedValueOnce([{ type: 'DEPOSIT', _sum: { amount: 2000000 }, _count: { _all: 1 } }] as never)
      // Supplier 2: negative balance (1M deposits, 3M costs = -2M balance)
      .mockResolvedValueOnce([{ type: 'DEPOSIT', _sum: { amount: 1000000 }, _count: { _all: 1 } }] as never)
      // Supplier 3: zero balance
      .mockResolvedValueOnce([] as never);

    prismaMock.operator.aggregate
      .mockResolvedValueOnce({ _sum: { totalCost: 1000000 }, _count: { _all: 1 }, _avg: {}, _min: {}, _max: {} } as never)
      .mockResolvedValueOnce({ _sum: { totalCost: 3000000 }, _count: { _all: 1 }, _avg: {}, _min: {}, _max: {} } as never)
      .mockResolvedValueOnce({ _sum: { totalCost: null }, _count: { _all: 0 }, _avg: {}, _min: {}, _max: {} } as never);

    const result = await getSupplierBalanceSummary();

    expect(result.summary.positiveBalance).toBe(1); // Only sup-1
    expect(result.summary.negativeBalance).toBe(1); // Only sup-2
    // sup-3 has 0 balance, not counted in either
  });
});
