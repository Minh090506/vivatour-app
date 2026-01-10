/**
 * @jest-environment node
 */

// Tests for Operator Approval API routes
// Covers: GET /api/operators/pending-payments, POST /api/operators/approve, POST /api/operators/[id]/approve

import { NextRequest } from 'next/server';
import { prismaMock } from '@/lib/__mocks__/db';
import { setMockUser, resetMockUser } from '@/lib/__mocks__/auth-utils';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

// Mock auth-utils to avoid next-auth ESM import issues
jest.mock('@/lib/auth-utils');

// Mock operator history
jest.mock('@/lib/operator-history', () => ({
  createOperatorHistory: jest.fn().mockResolvedValue({}),
}));

import { GET } from '@/app/api/operators/pending-payments/route';
import { POST as batchApprove } from '@/app/api/operators/approve/route';
import { POST as singleApprove } from '@/app/api/operators/[id]/approve/route';

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: { method?: string; body?: string }): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('GET /api/operators/pending-payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOperator = {
    id: 'op-1',
    requestId: 'req-1',
    supplierId: 'sup-1',
    serviceDate: new Date('2026-01-10'),
    serviceType: 'HOTEL',
    serviceName: 'Hotel Room',
    supplier: 'Hotel ABC',
    costBeforeTax: 1000000,
    vat: 100000,
    totalCost: 1100000,
    paymentDeadline: new Date('2026-01-05'),
    paymentStatus: 'PENDING',
    paymentDate: null,
    bankAccount: null,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    notes: null,
    userId: 'user-1',
    sheetRowIndex: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    request: { code: '260110-JOHN-US', customerName: 'John Doe' },
    supplierRef: { code: 'HOT-DN-ABC-0001', name: 'Hotel ABC' },
  };

  it('should return pending payments with success', async () => {
    prismaMock.operator.findMany.mockResolvedValue([mockOperator] as never);

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(1);
  });

  it('should filter by overdue', async () => {
    prismaMock.operator.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments?filter=overdue');
    await GET(request);

    expect(prismaMock.operator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentDeadline: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      })
    );
  });

  it('should filter by today', async () => {
    prismaMock.operator.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments?filter=today');
    await GET(request);

    expect(prismaMock.operator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentDeadline: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('should filter by week', async () => {
    prismaMock.operator.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments?filter=week');
    await GET(request);

    expect(prismaMock.operator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentDeadline: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('should filter by serviceType', async () => {
    prismaMock.operator.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments?serviceType=HOTEL');
    await GET(request);

    expect(prismaMock.operator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceType: 'HOTEL',
        }),
      })
    );
  });

  it('should calculate daysOverdue correctly', async () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 5);

    prismaMock.operator.findMany.mockResolvedValue([
      { ...mockOperator, paymentDeadline: overdueDate },
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data[0].daysOverdue).toBe(5);
  });

  it('should return correct summary', async () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 3);

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    prismaMock.operator.findMany.mockResolvedValue([
      { ...mockOperator, id: 'op-1', paymentDeadline: overdueDate, totalCost: 1000000 },
      { ...mockOperator, id: 'op-2', paymentDeadline: todayDate, totalCost: 2000000 },
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments');
    const response = await GET(request);
    const data = await response.json();

    expect(data.summary.total).toBe(2);
    expect(data.summary.overdue).toBe(1);
    expect(data.summary.dueToday).toBe(1);
  });

  it('should return 500 on database error', async () => {
    prismaMock.operator.findMany.mockRejectedValue(new Error('Database error'));

    const request = createMockRequest('http://localhost:3000/api/operators/pending-payments');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('POST /api/operators/approve (batch)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOperator = {
    id: 'op-1',
    requestId: 'req-1',
    supplierId: 'sup-1',
    serviceDate: new Date(),
    serviceType: 'HOTEL',
    serviceName: 'Hotel Room',
    supplier: 'Hotel ABC',
    costBeforeTax: 1000000,
    vat: 100000,
    totalCost: 1000000,
    paymentDeadline: new Date(),
    paymentStatus: 'PENDING',
    paymentDate: null,
    bankAccount: null,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    notes: null,
    userId: 'user-1',
    sheetRowIndex: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should batch approve operators successfully', async () => {
    prismaMock.operator.findMany.mockResolvedValue([
      { ...mockOperator, id: 'op-1' },
      { ...mockOperator, id: 'op-2' },
    ] as never);

    (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        operator: {
          update: jest.fn().mockResolvedValue({ ...mockOperator, paymentStatus: 'PAID' }),
        },
        operatorHistory: {
          create: jest.fn().mockResolvedValue({}),
        },
      });
    });

    const request = createMockRequest('http://localhost:3000/api/operators/approve', {
      method: 'POST',
      body: JSON.stringify({
        operatorIds: ['op-1', 'op-2'],
        paymentDate: new Date().toISOString(),
        userId: 'user-1',
      }),
    });

    const response = await batchApprove(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 400 when no operatorIds provided', async () => {
    const request = createMockRequest('http://localhost:3000/api/operators/approve', {
      method: 'POST',
      body: JSON.stringify({
        operatorIds: [],
        paymentDate: new Date().toISOString(),
      }),
    });

    const response = await batchApprove(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Vui lòng chọn ít nhất 1 dịch vụ');
  });

  it('should return 400 when paymentDate is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/operators/approve', {
      method: 'POST',
      body: JSON.stringify({
        operatorIds: ['op-1'],
      }),
    });

    const response = await batchApprove(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Vui lòng chọn ngày thanh toán');
  });

  it('should return 404 when some operators not found', async () => {
    prismaMock.operator.findMany.mockResolvedValue([mockOperator] as never);

    const request = createMockRequest('http://localhost:3000/api/operators/approve', {
      method: 'POST',
      body: JSON.stringify({
        operatorIds: ['op-1', 'op-2'], // op-2 doesn't exist
        paymentDate: new Date().toISOString(),
      }),
    });

    const response = await batchApprove(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Một số dịch vụ không tồn tại');
  });

  it('should return 403 when trying to approve locked operators', async () => {
    prismaMock.operator.findMany.mockResolvedValue([
      { ...mockOperator, isLocked: true },
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/operators/approve', {
      method: 'POST',
      body: JSON.stringify({
        operatorIds: ['op-1'],
        paymentDate: new Date().toISOString(),
      }),
    });

    const response = await batchApprove(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('đã khóa');
  });
});

describe('POST /api/operators/[id]/approve (single)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOperator = {
    id: 'op-1',
    requestId: 'req-1',
    supplierId: 'sup-1',
    serviceDate: new Date(),
    serviceType: 'HOTEL',
    serviceName: 'Hotel Room',
    supplier: 'Hotel ABC',
    costBeforeTax: 1000000,
    vat: 100000,
    totalCost: 1000000,
    paymentDeadline: new Date(),
    paymentStatus: 'PENDING',
    paymentDate: null,
    bankAccount: null,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    notes: null,
    userId: 'user-1',
    sheetRowIndex: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockParams = Promise.resolve({ id: 'op-1' });

  it('should approve single operator successfully', async () => {
    prismaMock.operator.findUnique.mockResolvedValue(mockOperator as never);
    prismaMock.operator.update.mockResolvedValue({
      ...mockOperator,
      paymentStatus: 'PAID',
      paymentDate: new Date(),
    } as never);

    const request = createMockRequest('http://localhost:3000/api/operators/op-1/approve', {
      method: 'POST',
      body: JSON.stringify({
        paymentDate: new Date().toISOString(),
        userId: 'user-1',
      }),
    });

    const response = await singleApprove(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.paymentStatus).toBe('PAID');
  });

  it('should return 404 when operator not found', async () => {
    prismaMock.operator.findUnique.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/operators/op-999/approve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await singleApprove(request, { params: Promise.resolve({ id: 'op-999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('không tồn tại');
  });

  it('should return 403 when operator is locked', async () => {
    prismaMock.operator.findUnique.mockResolvedValue({
      ...mockOperator,
      isLocked: true,
    } as never);

    const request = createMockRequest('http://localhost:3000/api/operators/op-1/approve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await singleApprove(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('đã khóa');
  });

  it('should return 400 when already paid', async () => {
    prismaMock.operator.findUnique.mockResolvedValue({
      ...mockOperator,
      paymentStatus: 'PAID',
    } as never);

    const request = createMockRequest('http://localhost:3000/api/operators/op-1/approve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await singleApprove(request, { params: mockParams });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('đã được thanh toán');
  });

  it('should use current date when paymentDate not provided', async () => {
    prismaMock.operator.findUnique.mockResolvedValue(mockOperator as never);
    prismaMock.operator.update.mockResolvedValue({
      ...mockOperator,
      paymentStatus: 'PAID',
      paymentDate: new Date(),
    } as never);

    const request = createMockRequest('http://localhost:3000/api/operators/op-1/approve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    await singleApprove(request, { params: mockParams });

    expect(prismaMock.operator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentDate: expect.any(Date),
        }),
      })
    );
  });
});
