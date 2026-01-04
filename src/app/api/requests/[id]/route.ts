import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateNextFollowUp, calculateEndDate, generateBookingCode } from '@/lib/request-utils';
import { getStageFromStatus, isFollowUpStatus, type RequestStatus } from '@/config/request-config';

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
    let responseWarning: string | null = null;

    // Basic fields
    if (body.customerName !== undefined) updateData.customerName = body.customerName.trim();
    if (body.contact !== undefined) updateData.contact = body.contact.trim();
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp?.trim() || null;
    if (body.pax !== undefined) updateData.pax = body.pax;
    if (body.country !== undefined) updateData.country = body.country.trim();
    if (body.source !== undefined) updateData.source = body.source.trim();
    if (body.tourDays !== undefined) updateData.tourDays = body.tourDays;
    if (body.expectedDate !== undefined) {
      updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }
    if (body.expectedRevenue !== undefined) updateData.expectedRevenue = body.expectedRevenue;
    if (body.expectedCost !== undefined) updateData.expectedCost = body.expectedCost;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.lastContactDate !== undefined) {
      updateData.lastContactDate = body.lastContactDate ? new Date(body.lastContactDate) : null;
    }

    // Handle startDate and calculate endDate
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
      // Calculate endDate if startDate and tourDays available
      if (body.startDate) {
        const days = body.tourDays ?? existing.tourDays;
        if (days) {
          updateData.endDate = calculateEndDate(new Date(body.startDate), days);
        }
      }
    } else if (body.tourDays !== undefined && existing.startDate) {
      // If only tourDays changed, recalculate endDate
      updateData.endDate = calculateEndDate(existing.startDate, body.tourDays);
    }

    // Handle status change → update stage and nextFollowUp
    if (body.status !== undefined && body.status !== existing.status) {
      const newStatus = body.status as RequestStatus;
      updateData.status = newStatus;
      updateData.stage = getStageFromStatus(newStatus);
      updateData.statusChangedAt = new Date();
      // Note: statusChangedBy should be set from auth context when available
      if (body.statusChangedBy) {
        updateData.statusChangedBy = body.statusChangedBy;
      }

      // Recalculate nextFollowUp based on new status
      if (isFollowUpStatus(newStatus)) {
        const contactDate = body.lastContactDate
          ? new Date(body.lastContactDate)
          : existing.lastContactDate || new Date();
        updateData.nextFollowUp = await calculateNextFollowUp(newStatus, contactDate);
      } else {
        updateData.nextFollowUp = null;
      }

      // Handle BOOKING status transition - generate booking code
      if (newStatus === 'BOOKING' && existing.status !== 'BOOKING') {
        // Get seller's code from ConfigUser
        const configUser = await prisma.configUser.findUnique({
          where: { userId: existing.sellerId },
        });

        if (!configUser?.sellerCode) {
          return NextResponse.json(
            { success: false, error: 'Seller chưa được cấu hình mã. Liên hệ Admin.' },
            { status: 400 }
          );
        }

        // Require startDate for booking
        const startDate = body.startDate ? new Date(body.startDate) : existing.startDate;
        if (!startDate) {
          return NextResponse.json(
            { success: false, error: 'Cần nhập ngày bắt đầu tour trước khi chuyển Booking' },
            { status: 400 }
          );
        }

        // Generate booking code (collision handling is in generateBookingCode)
        const bookingCode = await generateBookingCode(startDate, configUser.sellerCode);
        updateData.bookingCode = bookingCode;
      }

      // Warning when reverting from BOOKING status
      if (existing.status === 'BOOKING' && newStatus !== 'BOOKING') {
        responseWarning = 'Đã chuyển khỏi Booking. Mã booking và operators vẫn được giữ lại.';
      }
    } else if (body.lastContactDate !== undefined && isFollowUpStatus(existing.status as RequestStatus)) {
      // If only lastContactDate changed and status is F1-F4, recalculate nextFollowUp
      updateData.nextFollowUp = await calculateNextFollowUp(
        existing.status as RequestStatus,
        new Date(body.lastContactDate)
      );
    }

    // Manual nextFollowUp override (if explicitly provided)
    if (body.nextFollowUp !== undefined && !body.status) {
      updateData.nextFollowUp = body.nextFollowUp ? new Date(body.nextFollowUp) : null;
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData,
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      ...(responseWarning && { warning: responseWarning }),
    });
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
