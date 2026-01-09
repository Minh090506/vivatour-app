/**
 * @jest-environment node
 */

// Tests for Report API routes
// Covers: GET /api/reports/dashboard, revenue-trend, cost-breakdown, funnel

import { NextRequest } from 'next/server';
import { prismaMock } from '@/lib/__mocks__/db';

// Mock database
jest.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

// Mock auth
const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN'
  }
};

jest.mock('@/auth', () => ({
  auth: jest.fn(() => Promise.resolve(mockSession)),
}));

import { auth } from '@/auth';

function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

// ============================================
// Dashboard Endpoint Tests
// ============================================

describe('GET /api/reports/dashboard', () => {
  let GET: any;

  beforeAll(() => {
    const module = require('@/app/api/reports/dashboard/route');
    GET = module.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(auth).mockResolvedValue(mockSession as any);
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 when unauthenticated', async () => {
      jest.mocked(auth).mockResolvedValue(null as any);

      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for SELLER role (no revenue:view)', async () => {
      jest.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'SELLER' }
      } as any);

      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 for OPERATOR role (no revenue:view)', async () => {
      jest.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'OPERATOR' }
      } as any);

      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Query Validation', () => {
    it('should return 400 for invalid range parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/reports/dashboard?range=invalidRange'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should accept valid thisMonth range', async () => {
      // Setup mocks for successful query
      prismaMock.request.count.mockResolvedValue(10 as never);
      prismaMock.revenue.aggregate.mockResolvedValue({
        _sum: { amountVND: 5000000 }
      } as never);
      prismaMock.operator.aggregate.mockResolvedValue({
        _sum: { totalCost: 2000000 }
      } as never);

      const request = createMockRequest(
        'http://localhost:3000/api/reports/dashboard?range=thisMonth'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept valid lastMonth range', async () => {
      prismaMock.request.count.mockResolvedValue(8 as never);
      prismaMock.revenue.aggregate.mockResolvedValue({
        _sum: { amountVND: 4000000 }
      } as never);
      prismaMock.operator.aggregate.mockResolvedValue({
        _sum: { totalCost: 1500000 }
      } as never);

      const request = createMockRequest(
        'http://localhost:3000/api/reports/dashboard?range=lastMonth'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      // Setup default mocks
      prismaMock.request.count.mockResolvedValue(50 as never);
      prismaMock.revenue.aggregate.mockResolvedValue({
        _sum: { amountVND: 10000000 }
      } as never);
      prismaMock.operator.aggregate.mockResolvedValue({
        _sum: { totalCost: 3000000 }
      } as never);
    });

    it('should return valid dashboard response with all required fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('kpiCards');
      expect(data.data).toHaveProperty('comparison');
      expect(data.data).toHaveProperty('dateRange');
    });

    it('should include all KPI card metrics', async () => {
      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);
      const data = await response.json();

      const kpis = data.data.kpiCards;
      expect(kpis).toHaveProperty('totalBookings');
      expect(kpis).toHaveProperty('totalRevenue');
      expect(kpis).toHaveProperty('totalProfit');
      expect(kpis).toHaveProperty('activeRequests');
      expect(kpis).toHaveProperty('conversionRate');

      // Validate types
      expect(typeof kpis.totalBookings).toBe('number');
      expect(typeof kpis.totalRevenue).toBe('number');
      expect(typeof kpis.totalProfit).toBe('number');
    });

    it('should calculate profit as revenue minus cost', async () => {
      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.kpiCards.totalProfit).toBe(10000000 - 3000000);
    });

    it('should include comparison metrics with changePercent', async () => {
      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);
      const data = await response.json();

      const comparison = data.data.comparison;
      expect(comparison).toHaveProperty('bookings');
      expect(comparison).toHaveProperty('revenue');

      expect(comparison.bookings).toHaveProperty('current');
      expect(comparison.bookings).toHaveProperty('previous');
      expect(comparison.bookings).toHaveProperty('changePercent');
    });

    it('should include dateRange with startDate, endDate and label', async () => {
      const request = createMockRequest('http://localhost:3000/api/reports/dashboard');
      const response = await GET(request);
      const data = await response.json();

      const dr = data.data.dateRange;
      expect(dr).toHaveProperty('startDate');
      expect(dr).toHaveProperty('endDate');
      expect(dr).toHaveProperty('label');
      expect(typeof dr.label).toBe('string');
    });
  });
});

// ============================================
// Revenue Trend Endpoint Tests
// ============================================

describe('GET /api/reports/revenue-trend', () => {
  let GET: any;

  beforeAll(() => {
    const module = require('@/app/api/reports/revenue-trend/route');
    GET = module.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(auth).mockResolvedValue(mockSession as any);
  });

  it('should return 401 when unauthenticated', async () => {
    jest.mocked(auth).mockResolvedValue(null as any);

    const request = createMockRequest('http://localhost:3000/api/reports/revenue-trend');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return 403 for SELLER role', async () => {
    jest.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', role: 'SELLER' }
    } as any);

    const request = createMockRequest('http://localhost:3000/api/reports/revenue-trend');
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid range parameter', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/reports/revenue-trend?range=invalid'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should return valid response with summary and data array', async () => {
    prismaMock.revenue.findMany.mockResolvedValue([
      { paymentDate: new Date('2026-01-15'), amountVND: 5000000 }
    ] as never);

    prismaMock.operator.findMany.mockResolvedValue([
      { serviceDate: new Date('2026-01-15'), totalCost: 2000000 }
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/reports/revenue-trend');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.data)).toBe(true);
    expect(data.data).toHaveProperty('summary');
    expect(data.data.summary).toHaveProperty('totalRevenue');
    expect(data.data.summary).toHaveProperty('totalCost');
    expect(data.data.summary).toHaveProperty('totalProfit');
    expect(data.data.summary).toHaveProperty('avgMonthly');
  });

  it('should group data points by period', async () => {
    prismaMock.revenue.findMany.mockResolvedValue([
      { paymentDate: new Date('2026-01-15'), amountVND: 1000000 },
      { paymentDate: new Date('2026-02-15'), amountVND: 2000000 }
    ] as never);

    prismaMock.operator.findMany.mockResolvedValue([
      { serviceDate: new Date('2026-01-10'), totalCost: 500000 }
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/reports/revenue-trend');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.data.length).toBeGreaterThan(0);
    expect(data.data.data[0]).toHaveProperty('period');
    expect(data.data.data[0]).toHaveProperty('revenue');
    expect(data.data.data[0]).toHaveProperty('cost');
    expect(data.data.data[0]).toHaveProperty('profit');
  });
});

// ============================================
// Cost Breakdown Endpoint Tests
// ============================================

describe('GET /api/reports/cost-breakdown', () => {
  let GET: any;

  beforeAll(() => {
    const module = require('@/app/api/reports/cost-breakdown/route');
    GET = module.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(auth).mockResolvedValue(mockSession as any);
  });

  it('should return 401 when unauthenticated', async () => {
    jest.mocked(auth).mockResolvedValue(null as any);

    const request = createMockRequest('http://localhost:3000/api/reports/cost-breakdown');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return 403 for OPERATOR role', async () => {
    jest.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', role: 'OPERATOR' }
    } as any);

    const request = createMockRequest('http://localhost:3000/api/reports/cost-breakdown');
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid range parameter', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/reports/cost-breakdown?range=badRange'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('should return valid cost breakdown response', async () => {
    prismaMock.operator.findMany.mockResolvedValue([
      { serviceType: 'ACCOMMODATION', totalCost: 3000000, paymentStatus: 'PAID' },
      { serviceType: 'TRANSPORTATION', totalCost: 2000000, paymentStatus: 'UNPAID' }
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/reports/cost-breakdown');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('byServiceType');
    expect(data.data).toHaveProperty('paymentStatus');
    expect(data.data).toHaveProperty('dateRange');

    expect(Array.isArray(data.data.byServiceType)).toBe(true);
    expect(data.data.byServiceType[0]).toHaveProperty('type');
    expect(data.data.byServiceType[0]).toHaveProperty('amount');
    expect(data.data.byServiceType[0]).toHaveProperty('percentage');
  });

  it('should aggregate payment status correctly', async () => {
    prismaMock.operator.findMany.mockResolvedValue([
      { serviceType: 'ACCOMMODATION', totalCost: 2000000, paymentStatus: 'PAID' },
      { serviceType: 'ACCOMMODATION', totalCost: 1000000, paymentStatus: 'PARTIAL' },
      { serviceType: 'TRANSPORTATION', totalCost: 3000000, paymentStatus: 'UNPAID' }
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/reports/cost-breakdown');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.paymentStatus.paid).toBe(2000000);
    expect(data.data.paymentStatus.partial).toBe(1000000);
    expect(data.data.paymentStatus.unpaid).toBe(3000000);
  });

  it('should calculate percentage by service type', async () => {
    prismaMock.operator.findMany.mockResolvedValue([
      { serviceType: 'ACCOMMODATION', totalCost: 4000000, paymentStatus: 'PAID' },
      { serviceType: 'TRANSPORTATION', totalCost: 6000000, paymentStatus: 'UNPAID' }
    ] as never);

    const request = createMockRequest('http://localhost:3000/api/reports/cost-breakdown');
    const response = await GET(request);
    const data = await response.json();

    // Check percentages
    const breakdown = data.data.byServiceType;
    const totalCost = 10000000;
    expect(breakdown[0].percentage).toBe(60); // 6M / 10M
    expect(breakdown[1].percentage).toBe(40); // 4M / 10M
  });
});

// ============================================
// Funnel Endpoint Tests
// ============================================

describe('GET /api/reports/funnel', () => {
  let GET: any;

  beforeAll(() => {
    const module = require('@/app/api/reports/funnel/route');
    GET = module.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(auth).mockResolvedValue(mockSession as any);
  });

  it('should return 401 when unauthenticated', async () => {
    jest.mocked(auth).mockResolvedValue(null as any);

    const request = createMockRequest('http://localhost:3000/api/reports/funnel');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return 403 for SELLER role', async () => {
    jest.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', role: 'SELLER' }
    } as any);

    const request = createMockRequest('http://localhost:3000/api/reports/funnel');
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid range parameter', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/reports/funnel?range=wrongRange'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('should return valid funnel response with all stages', async () => {
    prismaMock.request.groupBy.mockResolvedValue([
      { stage: 'LEAD', _count: { id: 100 } },
      { stage: 'QUOTE', _count: { id: 50 } }
    ] as never);

    prismaMock.request.count.mockResolvedValue(10 as never);

    const request = createMockRequest('http://localhost:3000/api/reports/funnel');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('stages');
    expect(data.data).toHaveProperty('conversionRate');
    expect(data.data).toHaveProperty('dateRange');

    expect(Array.isArray(data.data.stages)).toBe(true);
    expect(data.data.stages.length).toBe(4); // LEAD, QUOTE, FOLLOWUP, OUTCOME
  });

  it('should include all funnel stages in correct order', async () => {
    prismaMock.request.groupBy.mockResolvedValue([
      { stage: 'OUTCOME', _count: { id: 10 } },
      { stage: 'LEAD', _count: { id: 100 } }
    ] as never);

    prismaMock.request.count.mockResolvedValue(10 as never);

    const request = createMockRequest('http://localhost:3000/api/reports/funnel');
    const response = await GET(request);
    const data = await response.json();

    const stageNames = data.data.stages.map((s: any) => s.stage);
    expect(stageNames).toEqual(['LEAD', 'QUOTE', 'FOLLOWUP', 'OUTCOME']);
  });

  it('should include count and percentage for each stage', async () => {
    prismaMock.request.groupBy.mockResolvedValue([
      { stage: 'LEAD', _count: { id: 100 } },
      { stage: 'QUOTE', _count: { id: 50 } }
    ] as never);

    prismaMock.request.count.mockResolvedValue(50 as never); // conversions

    const request = createMockRequest('http://localhost:3000/api/reports/funnel');
    const response = await GET(request);
    const data = await response.json();

    const lead = data.data.stages.find((s: any) => s.stage === 'LEAD');
    const quote = data.data.stages.find((s: any) => s.stage === 'QUOTE');

    expect(lead).toHaveProperty('count', 100);
    expect(lead).toHaveProperty('percentage');
    expect(quote).toHaveProperty('count', 50);
    expect(quote).toHaveProperty('percentage');
  });

  it('should calculate conversion rate correctly', async () => {
    prismaMock.request.groupBy.mockResolvedValue([
      { stage: 'LEAD', _count: { id: 100 } }
    ] as never);

    prismaMock.request.count.mockResolvedValue(20 as never); // 20 bookings out of 100 = 20%

    const request = createMockRequest('http://localhost:3000/api/reports/funnel');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.conversionRate).toBe(20);
  });

  it('should handle stages with zero count', async () => {
    prismaMock.request.groupBy.mockResolvedValue([
      { stage: 'LEAD', _count: { id: 100 } }
      // QUOTE, FOLLOWUP, OUTCOME have no records
    ] as never);

    prismaMock.request.count.mockResolvedValue(10 as never);

    const request = createMockRequest('http://localhost:3000/api/reports/funnel');
    const response = await GET(request);
    const data = await response.json();

    // All 4 stages should be present
    expect(data.data.stages.length).toBe(4);

    // QUOTE, FOLLOWUP, OUTCOME should have count 0
    const empty = data.data.stages.filter((s: any) => ['QUOTE', 'FOLLOWUP', 'OUTCOME'].includes(s.stage));
    empty.forEach((s: any) => {
      expect(s.count).toBe(0);
    });
  });
});
