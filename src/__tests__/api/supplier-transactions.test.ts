/**
 * @jest-environment node
 */

// Tests for Supplier Transaction API routes validation and error handling
// Covers: GET /api/supplier-transactions, POST /api/supplier-transactions

import { NextRequest } from 'next/server';
import { prismaMock } from '@/lib/__mocks__/db';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

// Mock auth-utils to avoid next-auth ESM import issues
jest.mock('@/lib/auth-utils');

import { GET, POST } from '@/app/api/supplier-transactions/route';

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('GET /api/supplier-transactions', () => {
  const mockTransactions = [
    {
      id: 'tx-1',
      supplierId: 'sup-1',
      type: 'DEPOSIT',
      amount: 5000000,
      transactionDate: new Date('2024-01-15'),
      description: 'Monthly deposit',
      proofLink: 'https://example.com/receipt.pdf',
      relatedBookingCode: null,
      createdBy: 'admin',
      createdAt: new Date(),
      supplier: {
        code: 'HOT-DN-ABC-0001',
        name: 'Hotel ABC',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all transactions with success response', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue(mockTransactions);
    prismaMock.supplierTransaction.count.mockResolvedValue(1);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.hasMore).toBe(false);
  });

  it('should filter by supplierId', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(0);

    const request = createMockRequest(
      'http://localhost:3000/api/supplier-transactions?supplierId=sup-1'
    );
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ supplierId: 'sup-1' }),
      })
    );
  });

  it('should filter by transaction type', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(0);

    const request = createMockRequest(
      'http://localhost:3000/api/supplier-transactions?type=DEPOSIT'
    );
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'DEPOSIT' }),
      })
    );
  });

  it('should filter by date range (fromDate only)', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(0);

    const request = createMockRequest(
      'http://localhost:3000/api/supplier-transactions?fromDate=2024-01-01'
    );
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionDate: { gte: new Date('2024-01-01') },
        }),
      })
    );
  });

  it('should filter by date range (toDate only)', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(0);

    const request = createMockRequest(
      'http://localhost:3000/api/supplier-transactions?toDate=2024-12-31'
    );
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionDate: { lte: new Date('2024-12-31') },
        }),
      })
    );
  });

  it('should filter by date range (both fromDate and toDate)', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(0);

    const request = createMockRequest(
      'http://localhost:3000/api/supplier-transactions?fromDate=2024-01-01&toDate=2024-12-31'
    );
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        }),
      })
    );
  });

  it('should paginate with limit and offset', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(100);

    const request = createMockRequest(
      'http://localhost:3000/api/supplier-transactions?limit=20&offset=40'
    );
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 40,
      })
    );
  });

  it('should default limit to 50', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(0);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions');
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        skip: 0,
      })
    );
  });

  it('should return hasMore=true when more records exist', async () => {
    const transactions = Array(20).fill(mockTransactions[0]);
    prismaMock.supplierTransaction.findMany.mockResolvedValue(transactions);
    prismaMock.supplierTransaction.count.mockResolvedValue(100);

    const request = createMockRequest(
      'http://localhost:3000/api/supplier-transactions?limit=20&offset=0'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.hasMore).toBe(true);
    expect(data.total).toBe(100);
  });

  it('should include supplier details in response', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue(mockTransactions);
    prismaMock.supplierTransaction.count.mockResolvedValue(1);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data[0].supplier).toBeDefined();
    expect(data.data[0].supplier.code).toBe('HOT-DN-ABC-0001');
  });

  it('should order by transactionDate desc', async () => {
    prismaMock.supplierTransaction.findMany.mockResolvedValue([]);
    prismaMock.supplierTransaction.count.mockResolvedValue(0);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions');
    await GET(request);

    expect(prismaMock.supplierTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { transactionDate: 'desc' },
      })
    );
  });

  it('should return 500 on database error', async () => {
    prismaMock.supplierTransaction.findMany.mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch transactions');
  });
});

describe('POST /api/supplier-transactions', () => {
  const validTransactionData = {
    supplierId: 'sup-1',
    type: 'DEPOSIT',
    amount: 5000000,
    transactionDate: '2024-01-15',
    description: 'Monthly deposit',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create transaction with valid data', async () => {
    const createdTransaction = {
      id: 'tx-new',
      ...validTransactionData,
      amount: 5000000,
      transactionDate: new Date('2024-01-15'),
      proofLink: null,
      relatedBookingCode: null,
      createdBy: 'system',
      createdAt: new Date(),
      supplier: {
        code: 'HOT-DN-ABC-0001',
        name: 'Hotel ABC',
      },
    };

    prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
    prismaMock.supplierTransaction.create.mockResolvedValue(createdTransaction);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify(validTransactionData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.type).toBe('DEPOSIT');
    expect(data.data.amount).toBe(5000000);
  });

  it('should return 400 when supplierId is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'DEPOSIT',
        amount: 5000000,
        transactionDate: '2024-01-15',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 when type is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: 'sup-1',
        amount: 5000000,
        transactionDate: '2024-01-15',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 when amount is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: 'sup-1',
        type: 'DEPOSIT',
        transactionDate: '2024-01-15',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 when transactionDate is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: 'sup-1',
        type: 'DEPOSIT',
        amount: 5000000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 when amount is zero', async () => {
    // Note: In JS, 0 is falsy, so the required fields check fails first
    // This test verifies that amount=0 is rejected (either as missing or non-positive)
    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...validTransactionData,
        amount: 0,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    // Amount 0 is falsy, so it fails the required fields check
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 when amount is negative', async () => {
    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...validTransactionData,
        amount: -1000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Amount must be positive');
  });

  describe('transaction type validation', () => {
    const validTypes = ['DEPOSIT', 'REFUND', 'ADJUSTMENT', 'FEE'];

    validTypes.forEach((type) => {
      it(`should accept valid type: ${type}`, async () => {
        prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
        prismaMock.supplierTransaction.create.mockResolvedValue({
          id: 'tx-new',
          type,
          amount: 1000,
          supplier: { code: 'TEST', name: 'Test' },
        } as never);

        const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
          method: 'POST',
          body: JSON.stringify({
            ...validTransactionData,
            type,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      });
    });

    it('should return 400 for invalid type', async () => {
      const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...validTransactionData,
          type: 'INVALID_TYPE',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid type');
      expect(data.error).toContain('DEPOSIT, REFUND, ADJUSTMENT, FEE');
    });
  });

  it('should return 404 when supplier not found', async () => {
    prismaMock.supplier.findUnique.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...validTransactionData,
        supplierId: 'non-existent',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Supplier not found');
  });

  it('should convert amount to number', async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
    prismaMock.supplierTransaction.create.mockResolvedValue({
      id: 'tx-new',
      amount: 5000000,
      supplier: { code: 'TEST', name: 'Test' },
    } as never);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...validTransactionData,
        amount: '5000000', // String instead of number
      }),
    });

    await POST(request);

    expect(prismaMock.supplierTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 5000000, // Should be converted to number
        }),
      })
    );
  });

  it('should parse transactionDate as Date', async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
    prismaMock.supplierTransaction.create.mockResolvedValue({
      id: 'tx-new',
      transactionDate: new Date('2024-01-15'),
      supplier: { code: 'TEST', name: 'Test' },
    } as never);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify(validTransactionData),
    });

    await POST(request);

    expect(prismaMock.supplierTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactionDate: new Date('2024-01-15'),
        }),
      })
    );
  });

  it('should use authenticated user ID as createdBy', async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
    prismaMock.supplierTransaction.create.mockResolvedValue({
      id: 'tx-new',
      createdBy: 'test-admin-id', // From mock auth-utils
      supplier: { code: 'TEST', name: 'Test' },
    } as never);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify(validTransactionData),
    });

    await POST(request);

    // createdBy should be set from authenticated user, not from body
    expect(prismaMock.supplierTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdBy: 'test-admin-id',
        }),
      })
    );
  });

  it('should ignore body createdBy and use authenticated user', async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
    prismaMock.supplierTransaction.create.mockResolvedValue({
      id: 'tx-new',
      createdBy: 'test-admin-id',
      supplier: { code: 'TEST', name: 'Test' },
    } as never);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...validTransactionData,
        createdBy: 'admin', // This should be ignored
      }),
    });

    await POST(request);

    // Should use authenticated user ID, not the provided createdBy
    expect(prismaMock.supplierTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdBy: 'test-admin-id',
        }),
      })
    );
  });

  it('should include optional fields when provided', async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
    prismaMock.supplierTransaction.create.mockResolvedValue({
      id: 'tx-new',
      proofLink: 'https://example.com/receipt.pdf',
      relatedBookingCode: 'BK-001',
      supplier: { code: 'TEST', name: 'Test' },
    } as never);

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...validTransactionData,
        proofLink: 'https://example.com/receipt.pdf',
        relatedBookingCode: 'BK-001',
      }),
    });

    await POST(request);

    expect(prismaMock.supplierTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proofLink: 'https://example.com/receipt.pdf',
          relatedBookingCode: 'BK-001',
        }),
      })
    );
  });

  it('should return 500 on database error', async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ id: 'sup-1' } as never);
    prismaMock.supplierTransaction.create.mockRejectedValue(new Error('Database write failed'));

    const request = createMockRequest('http://localhost:3000/api/supplier-transactions', {
      method: 'POST',
      body: JSON.stringify(validTransactionData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to create transaction');
  });
});
