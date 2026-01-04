/**
 * @jest-environment node
 */

// Tests for Operator Reports API routes
// Covers: GET /api/reports/operator-costs, GET /api/reports/operator-payments

import { NextRequest } from 'next/server';
import { prismaMock } from '@/lib/__mocks__/db';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

import { GET as getCostReport } from '@/app/api/reports/operator-costs/route';
import { GET as getPaymentReport } from '@/app/api/reports/operator-payments/route';

// Helper to create mock NextRequest
function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/reports/operator-costs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cost report grouped by service type, supplier, and month', async () => {
    const mockOperators = [
      {
        id: 'op1',
        serviceType: 'HOTEL',
        supplierId: 'sup1',
        supplier: null,
        serviceDate: new Date('2026-01-15'),
        totalCost: 5000000,
        supplierRef: { name: 'Khách sạn ABC' },
        request: { code: 'REQ001' },
      },
      {
        id: 'op2',
        serviceType: 'TRANSPORT',
        supplierId: 'sup2',
        supplier: null,
        serviceDate: new Date('2026-01-20'),
        totalCost: 2000000,
        supplierRef: { name: 'Xe du lịch XYZ' },
        request: { code: 'REQ001' },
      },
      {
        id: 'op3',
        serviceType: 'HOTEL',
        supplierId: 'sup1',
        supplier: null,
        serviceDate: new Date('2026-02-10'),
        totalCost: 3000000,
        supplierRef: { name: 'Khách sạn ABC' },
        request: { code: 'REQ002' },
      },
    ];

    prismaMock.operator.findMany.mockResolvedValue(mockOperators as never);

    const request = createMockRequest('http://localhost:3000/api/reports/operator-costs');
    const response = await getCostReport(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Check summary
    expect(data.data.summary.totalCost).toBe(10000000);
    expect(data.data.summary.totalCount).toBe(3);
    expect(data.data.summary.avgCost).toBe(3333333);

    // Check by service type - should have HOTEL and TRANSPORT
    expect(data.data.byServiceType).toHaveLength(2);
    const hotelType = data.data.byServiceType.find((t: { type: string }) => t.type === 'HOTEL');
    expect(hotelType.total).toBe(8000000);
    expect(hotelType.count).toBe(2);

    // Check by supplier
    expect(data.data.bySupplier).toHaveLength(2);

    // Check by month
    expect(data.data.byMonth).toHaveLength(2);
  });

  it('should filter by date range', async () => {
    prismaMock.operator.findMany.mockResolvedValue([] as never);

    const request = createMockRequest(
      'http://localhost:3000/api/reports/operator-costs?fromDate=2026-01-01&toDate=2026-01-31'
    );
    const response = await getCostReport(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.operator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('should filter by service type', async () => {
    prismaMock.operator.findMany.mockResolvedValue([] as never);

    const request = createMockRequest(
      'http://localhost:3000/api/reports/operator-costs?serviceType=HOTEL'
    );
    const response = await getCostReport(request);

    expect(response.status).toBe(200);
    expect(prismaMock.operator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceType: 'HOTEL',
        }),
      })
    );
  });

  it('should handle empty data gracefully', async () => {
    prismaMock.operator.findMany.mockResolvedValue([] as never);

    const request = createMockRequest('http://localhost:3000/api/reports/operator-costs');
    const response = await getCostReport(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.totalCost).toBe(0);
    expect(data.data.summary.totalCount).toBe(0);
    expect(data.data.summary.avgCost).toBe(0);
    expect(data.data.byServiceType).toHaveLength(0);
    expect(data.data.bySupplier).toHaveLength(0);
    expect(data.data.byMonth).toHaveLength(0);
  });

  it('should handle database errors', async () => {
    prismaMock.operator.findMany.mockRejectedValue(new Error('Database error') as never);

    const request = createMockRequest('http://localhost:3000/api/reports/operator-costs');
    const response = await getCostReport(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Lỗi tạo báo cáo');
  });

  it('should reject invalid date format', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/reports/operator-costs?fromDate=invalid-date'
    );
    const response = await getCostReport(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Ngày bắt đầu không hợp lệ');
  });

  it('should reject invalid service type', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/reports/operator-costs?serviceType=INVALID_TYPE'
    );
    const response = await getCostReport(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Loại dịch vụ không hợp lệ');
  });
});

describe('GET /api/reports/operator-payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return payment status summary', async () => {
    // Mock aggregate calls
    prismaMock.operator.aggregate
      .mockResolvedValueOnce({ _count: { id: 5 }, _sum: { totalCost: 10000000 } } as never)  // pending
      .mockResolvedValueOnce({ _count: { id: 2 }, _sum: { totalCost: 4000000 } } as never)   // dueThisWeek
      .mockResolvedValueOnce({ _count: { id: 1 }, _sum: { totalCost: 2000000 } } as never)   // overdue
      .mockResolvedValueOnce({ _count: { id: 3 }, _sum: { totalCost: 6000000 } } as never);  // paidThisMonth

    const request = createMockRequest('http://localhost:3000/api/reports/operator-payments');
    const response = await getPaymentReport(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.pending.count).toBe(5);
    expect(data.data.pending.total).toBe(10000000);
    expect(data.data.dueThisWeek.count).toBe(2);
    expect(data.data.dueThisWeek.total).toBe(4000000);
    expect(data.data.overdue.count).toBe(1);
    expect(data.data.overdue.total).toBe(2000000);
    expect(data.data.paidThisMonth.count).toBe(3);
    expect(data.data.paidThisMonth.total).toBe(6000000);
  });

  it('should handle null totals gracefully', async () => {
    prismaMock.operator.aggregate
      .mockResolvedValueOnce({ _count: { id: 0 }, _sum: { totalCost: null } } as never)
      .mockResolvedValueOnce({ _count: { id: 0 }, _sum: { totalCost: null } } as never)
      .mockResolvedValueOnce({ _count: { id: 0 }, _sum: { totalCost: null } } as never)
      .mockResolvedValueOnce({ _count: { id: 0 }, _sum: { totalCost: null } } as never);

    const request = createMockRequest('http://localhost:3000/api/reports/operator-payments');
    const response = await getPaymentReport(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.pending.count).toBe(0);
    expect(data.data.pending.total).toBe(0);
  });

  it('should handle database errors', async () => {
    prismaMock.operator.aggregate.mockRejectedValue(new Error('Database error') as never);

    const request = createMockRequest('http://localhost:3000/api/reports/operator-payments');
    const response = await getPaymentReport(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Lỗi tạo báo cáo');
  });

  it('should reject invalid month format', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/reports/operator-payments?month=2026-13'
    );
    const response = await getPaymentReport(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Định dạng tháng không hợp lệ');
  });
});
