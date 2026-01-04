import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/requests/[id] - Get single request
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const req = await prisma.request.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        operators: {
          include: {
            supplierRef: { select: { code: true, name: true } },
          },
          orderBy: { serviceDate: 'asc' },
        },
        revenues: { orderBy: { paymentDate: 'desc' } },
        _count: { select: { operators: true, revenues: true, emails: true } },
      },
    });

    if (!req) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: req });
  } catch (error) {
    console.error('Error fetching request:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải yêu cầu: ${message}` },
      { status: 500 }
    );
  }
}

// PUT /api/requests/[id] - Update request
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if request exists
    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (body.customerName !== undefined) updateData.customerName = body.customerName.trim();
    if (body.contact !== undefined) updateData.contact = body.contact.trim();
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp?.trim() || null;
    if (body.pax !== undefined) updateData.pax = body.pax;
    if (body.country !== undefined) updateData.country = body.country.trim();
    if (body.source !== undefined) updateData.source = body.source.trim();
    if (body.status !== undefined) updateData.status = body.status;
    if (body.tourDays !== undefined) updateData.tourDays = body.tourDays;
    if (body.expectedDate !== undefined) {
      updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }
    if (body.expectedRevenue !== undefined) updateData.expectedRevenue = body.expectedRevenue;
    if (body.expectedCost !== undefined) updateData.expectedCost = body.expectedCost;
    if (body.nextFollowUp !== undefined) {
      updateData.nextFollowUp = body.nextFollowUp ? new Date(body.nextFollowUp) : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData,
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: updatedRequest });
  } catch (error) {
    console.error('Error updating request:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi cập nhật yêu cầu: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE /api/requests/[id] - Delete request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if request exists
    const existing = await prisma.request.findUnique({
      where: { id },
      include: { _count: { select: { operators: true, revenues: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    // Prevent deletion if has related records
    if (existing._count.operators > 0 || existing._count.revenues > 0) {
      return NextResponse.json(
        { success: false, error: 'Không thể xóa yêu cầu đã có dịch vụ hoặc doanh thu liên kết' },
        { status: 400 }
      );
    }

    await prisma.request.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa yêu cầu' });
  } catch (error) {
    console.error('Error deleting request:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi xóa yêu cầu: ${message}` },
      { status: 500 }
    );
  }
}
