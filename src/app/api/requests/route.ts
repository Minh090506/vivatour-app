import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/requests - List with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract filters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sellerId = searchParams.get('sellerId') || '';
    const source = searchParams.get('source') || '';
    const country = searchParams.get('country') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    if (source) where.source = source;
    if (country) where.country = country;

    if (fromDate || toDate) {
      where.requestDate = {};
      if (fromDate) where.requestDate.gte = new Date(fromDate);
      if (toDate) where.requestDate.lte = new Date(toDate);
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          _count: { select: { operators: true, revenues: true } },
        },
        orderBy: { requestDate: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.request.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      total,
      hasMore: offset + requests.length < total,
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải danh sách yêu cầu: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/requests - Create request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.customerName || !body.contact || !body.country || !body.source) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: customerName, contact, country, source' },
        { status: 400 }
      );
    }

    // Generate booking code: YYMMDD-NAME-COUNTRY
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const namePart = body.customerName.split(' ')[0].toUpperCase().slice(0, 4);
    const countryPart = body.country.toUpperCase().slice(0, 2);
    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    const code = `${dateStr}-${namePart}-${countryPart}-${randomSuffix}`;

    // Create request
    const newRequest = await prisma.request.create({
      data: {
        code,
        customerName: body.customerName.trim(),
        contact: body.contact.trim(),
        whatsapp: body.whatsapp?.trim() || null,
        pax: body.pax || 1,
        country: body.country.trim(),
        source: body.source.trim(),
        status: body.status || 'F2',
        tourDays: body.tourDays || null,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        expectedRevenue: body.expectedRevenue || null,
        expectedCost: body.expectedCost || null,
        nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
        notes: body.notes?.trim() || null,
        sellerId: body.sellerId,
      },
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tạo yêu cầu: ${message}` },
      { status: 500 }
    );
  }
}
