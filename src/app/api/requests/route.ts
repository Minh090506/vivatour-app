import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateRQID, calculateNextFollowUp, getFollowUpDateBoundaries } from '@/lib/request-utils';
import { getStageFromStatus, isFollowUpStatus, type RequestStatus } from '@/config/request-config';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-utils';

// GET /api/requests - List with filters
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);

    // Extract filters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const stage = searchParams.get('stage') || '';
    const sellerId = searchParams.get('sellerId') || '';
    const source = searchParams.get('source') || '';
    const country = searchParams.get('country') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const followup = searchParams.get('followup') || ''; // overdue, today, upcoming
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // SELLER can only view their own requests
    if (user.role === 'SELLER') {
      where.sellerId = user.id;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { rqid: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { bookingCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (stage) where.stage = stage;
    if (sellerId) where.sellerId = sellerId;
    if (source) where.source = source;
    if (country) where.country = country;

    if (fromDate || toDate) {
      where.receivedDate = {};
      if (fromDate) where.receivedDate.gte = new Date(fromDate);
      if (toDate) where.receivedDate.lte = new Date(toDate);
    }

    // Follow-up filters
    if (followup) {
      const { todayStart, todayEnd, threeDaysLater } = getFollowUpDateBoundaries();

      if (followup === 'overdue') {
        where.nextFollowUp = { lt: todayStart };
        where.stage = { not: 'OUTCOME' }; // Only active requests
      } else if (followup === 'today') {
        where.nextFollowUp = { gte: todayStart, lt: todayEnd };
      } else if (followup === 'upcoming') {
        where.nextFollowUp = { gte: todayEnd, lt: threeDaysLater };
      }
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          _count: { select: { operators: true, revenues: true } },
        },
        orderBy: { receivedDate: 'desc' },
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
    // Verify authentication
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // SELLER must create requests for themselves only
    // ADMIN can create for any seller
    const sellerId = user.role === 'SELLER' ? user.id : (body.sellerId || user.id);

    // Validate required fields
    if (!body.customerName || !body.contact || !body.country || !body.source) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: customerName, contact, country, source' },
        { status: 400 }
      );
    }

    // Generate legacy code: YYMMDD-NAME-COUNTRY
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const namePart = body.customerName.split(' ')[0].toUpperCase().slice(0, 4);
    const countryPart = body.country.toUpperCase().slice(0, 2);
    const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    const code = `${dateStr}-${namePart}-${countryPart}-${randomSuffix}`;

    // Generate RQID
    const rqid = await generateRQID();

    // Determine status and stage
    const status = (body.status || 'DANG_LL_CHUA_TL') as RequestStatus;
    const stage = getStageFromStatus(status);

    // Calculate nextFollowUp if status is F1-F4
    let nextFollowUp: Date | null = null;
    if (isFollowUpStatus(status)) {
      const contactDate = body.lastContactDate ? new Date(body.lastContactDate) : now;
      nextFollowUp = await calculateNextFollowUp(status, contactDate);
    }

    // Create request
    const newRequest = await prisma.request.create({
      data: {
        code,
        rqid,
        customerName: body.customerName.trim(),
        contact: body.contact.trim(),
        whatsapp: body.whatsapp?.trim() || null,
        pax: body.pax || 1,
        country: body.country.trim(),
        source: body.source.trim(),
        status,
        stage,
        tourDays: body.tourDays || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        expectedRevenue: body.expectedRevenue || null,
        expectedCost: body.expectedCost || null,
        lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null,
        nextFollowUp,
        notes: body.notes?.trim() || null,
        sellerId,
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
