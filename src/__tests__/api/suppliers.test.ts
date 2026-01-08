/**
 * @jest-environment node
 */

// Tests for Supplier API routes validation and error handling
// Covers: GET /api/suppliers, POST /api/suppliers

import { NextRequest } from 'next/server';
import { prismaMock } from '@/lib/__mocks__/db';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

// Mock auth-utils to avoid next-auth ESM import issues
jest.mock('@/lib/auth-utils');

// Mock supplier-balance module
jest.mock('@/lib/supplier-balance', () => ({
  calculateSupplierBalance: jest.fn().mockResolvedValue({
    deposits: 1000000,
    refunds: 0,
    adjustments: 0,
    fees: 0,
    costs: 0,
    balance: 1000000,
  }),
}));

import { GET, POST } from '@/app/api/suppliers/route';

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('GET /api/suppliers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all suppliers with success response', async () => {
    const mockSuppliers = [
      {
        id: 'sup-1',
        code: 'HOT-DN-ABC-0001',
        name: 'Hotel ABC',
        type: 'HOTEL',
        location: 'DA_NANG',
        paymentModel: 'PREPAID',
        creditLimit: null,
        paymentTermDays: null,
        contactName: 'John',
        contactPhone: '123456789',
        contactEmail: 'john@abc.com',
        bankAccount: null,
        isActive: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    prismaMock.supplier.findMany.mockResolvedValue(mockSuppliers);

    const request = createMockRequest('http://localhost:3000/api/suppliers');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].code).toBe('HOT-DN-ABC-0001');
  });

  it('should filter by search term (code or name)', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/suppliers?search=hotel');
    await GET(request);

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { code: { contains: 'hotel', mode: 'insensitive' } },
          { name: { contains: 'hotel', mode: 'insensitive' } },
        ],
      },
      orderBy: { code: 'asc' },
    });
  });

  it('should filter by type', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/suppliers?type=HOTEL');
    await GET(request);

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: { type: 'HOTEL' },
      orderBy: { code: 'asc' },
    });
  });

  it('should filter by location', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/suppliers?location=DA_NANG');
    await GET(request);

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: { location: 'DA_NANG' },
      orderBy: { code: 'asc' },
    });
  });

  it('should filter by paymentModel', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/suppliers?paymentModel=CREDIT');
    await GET(request);

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: { paymentModel: 'CREDIT' },
      orderBy: { code: 'asc' },
    });
  });

  it('should filter by isActive=true', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/suppliers?isActive=true');
    await GET(request);

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  });

  it('should filter by isActive=false', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/suppliers?isActive=false');
    await GET(request);

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: { isActive: false },
      orderBy: { code: 'asc' },
    });
  });

  it('should handle multiple filters combined', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest(
      'http://localhost:3000/api/suppliers?type=HOTEL&location=DA_NANG&isActive=true'
    );
    await GET(request);

    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith({
      where: {
        type: 'HOTEL',
        location: 'DA_NANG',
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  });

  it('should include balance when includeBalance=true', async () => {
    const mockSupplier = {
      id: 'sup-1',
      code: 'HOT-DN-ABC-0001',
      name: 'Hotel ABC',
      type: 'HOTEL',
      location: 'DA_NANG',
      paymentModel: 'PREPAID',
      creditLimit: null,
      paymentTermDays: null,
      contactName: null,
      contactPhone: null,
      contactEmail: null,
      bankAccount: null,
      isActive: true,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.supplier.findMany.mockResolvedValue([mockSupplier]);

    const request = createMockRequest('http://localhost:3000/api/suppliers?includeBalance=true');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data[0].balance).toBe(1000000);
  });

  it('should return 500 on database error', async () => {
    prismaMock.supplier.findMany.mockRejectedValue(new Error('Database connection failed'));

    const request = createMockRequest('http://localhost:3000/api/suppliers');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to fetch suppliers');
  });

  it('should return empty array when no suppliers found', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);

    const request = createMockRequest('http://localhost:3000/api/suppliers');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });
});

describe('POST /api/suppliers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create supplier with valid data', async () => {
    const newSupplier = {
      id: 'sup-new',
      code: 'HOT-DN-ANK-0001',
      name: 'Ankora Hotel',
      type: 'HOTEL',
      location: 'DA_NANG',
      paymentModel: 'PREPAID',
      creditLimit: null,
      paymentTermDays: null,
      contactName: 'Manager',
      contactPhone: '0905123456',
      contactEmail: 'manager@ankora.com',
      bankAccount: null,
      isActive: true,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockResolvedValue(newSupplier);

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ankora Hotel',
        type: 'HOTEL',
        location: 'DA_NANG',
        contactName: 'Manager',
        contactPhone: '0905123456',
        contactEmail: 'manager@ankora.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.code).toBe('HOT-DN-ANK-0001');
  });

  it('should return 400 when name is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        type: 'HOTEL',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Thiếu thông tin bắt buộc');
  });

  it('should return 400 when type is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Supplier',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Thiếu thông tin bắt buộc');
  });

  it('should return 400 for invalid supplier type', async () => {
    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Supplier',
        type: 'INVALID_TYPE',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Loại NCC không hợp lệ');
  });

  it('should return 400 when code already exists', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue({
      id: 'existing',
      code: 'HOT-DN-ANK-0001',
    } as never);

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ankora Hotel',
        type: 'HOTEL',
        code: 'HOT-DN-ANK-0001',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Mã NCC đã tồn tại');
  });

  it('should auto-generate code when not provided', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockResolvedValue({
      id: 'sup-new',
      code: 'HOT-XX-TES-0001',
      name: 'Test Hotel',
      type: 'HOTEL',
      paymentModel: 'PREPAID',
      isActive: true,
    } as never);

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Hotel',
        type: 'HOTEL',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    // Code should be auto-generated
    expect(prismaMock.supplier.create).toHaveBeenCalled();
  });

  it('should increment sequence for existing prefix', async () => {
    // Simulate existing supplier with sequence 0005
    prismaMock.supplier.findMany.mockResolvedValue([
      { code: 'HOT-DN-TES-0005' },
    ] as never);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockImplementation((args) => {
      return Promise.resolve({
        id: 'sup-new',
        ...args.data,
      } as never);
    });

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Hotel',
        type: 'HOTEL',
        location: 'DA_NANG',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    // Code should have sequence 0006
    expect(data.data.code).toContain('0006');
  });

  it('should default paymentModel to PREPAID', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockImplementation((args) => {
      return Promise.resolve({
        id: 'sup-new',
        ...args.data,
      } as never);
    });

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Hotel',
        type: 'HOTEL',
      }),
    });

    await POST(request);

    expect(prismaMock.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentModel: 'PREPAID',
        }),
      })
    );
  });

  it('should default isActive to true', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockImplementation((args) => {
      return Promise.resolve({
        id: 'sup-new',
        ...args.data,
      } as never);
    });

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Hotel',
        type: 'HOTEL',
      }),
    });

    await POST(request);

    expect(prismaMock.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: true,
        }),
      })
    );
  });

  it('should trim text fields', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockImplementation((args) => {
      return Promise.resolve({
        id: 'sup-new',
        ...args.data,
      } as never);
    });

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: '  Test Hotel  ',
        type: 'HOTEL',
        contactName: '  Manager  ',
      }),
    });

    await POST(request);

    expect(prismaMock.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Hotel',
          contactName: 'Manager',
        }),
      })
    );
  });

  it('should convert creditLimit to number', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockImplementation((args) => {
      return Promise.resolve({
        id: 'sup-new',
        ...args.data,
      } as never);
    });

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Hotel',
        type: 'HOTEL',
        paymentModel: 'CREDIT',
        creditLimit: '10000000',
      }),
    });

    await POST(request);

    expect(prismaMock.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creditLimit: 10000000,
        }),
      })
    );
  });

  it('should return 500 on database error', async () => {
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.supplier.findUnique.mockResolvedValue(null);
    prismaMock.supplier.create.mockRejectedValue(new Error('Database write failed'));

    const request = createMockRequest('http://localhost:3000/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Hotel',
        type: 'HOTEL',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Lỗi tạo NCC');
  });
});
