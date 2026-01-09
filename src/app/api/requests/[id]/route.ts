import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateNextFollowUp, calculateEndDate, generateBookingCode } from '@/lib/request-utils';
import { getStageFromStatus, isFollowUpStatus, type RequestStatus } from '@/config/request-config';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-utils';
import { updateRequestApiSchema, extractZodErrors } from '@/lib/validations/request-validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/requests/[id] - Get single request
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

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

    // SELLER can only view their own requests
    if (user.role === 'SELLER' && req.sellerId !== user.id) {
      return forbiddenResponse('Bạn không có quyền xem yêu cầu này');
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
    // Verify authentication
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();

    // Validate with Zod schema (partial - all fields optional)
    const validation = updateRequestApiSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dữ liệu không hợp lệ',
          details: extractZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if request exists
    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    // SELLER can only edit their own requests
    if (user.role === 'SELLER' && existing.sellerId !== user.id) {
      return forbiddenResponse('Bạn không có quyền chỉnh sửa yêu cầu này');
    }

    // ACCOUNTANT can only view, not edit
    if (user.role === 'ACCOUNTANT') {
      return forbiddenResponse('Kế toán không có quyền chỉnh sửa yêu cầu');
    }

    // Build update data from validated input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    let responseWarning: string | null = null;

    // Basic fields - only update if provided
    if (data.customerName !== undefined) updateData.customerName = data.customerName.trim();
    if (data.contact !== undefined) updateData.contact = data.contact.trim();
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp?.trim() || null;
    if (data.pax !== undefined) updateData.pax = data.pax;
    if (data.country !== undefined) updateData.country = data.country.trim();
    if (data.source !== undefined) updateData.source = data.source.trim();
    if (data.tourDays !== undefined) updateData.tourDays = data.tourDays;
    if (data.expectedDate !== undefined) {
      updateData.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
    }
    if (data.expectedRevenue !== undefined) updateData.expectedRevenue = data.expectedRevenue;
    if (data.expectedCost !== undefined) updateData.expectedCost = data.expectedCost;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.lastContactDate !== undefined) {
      updateData.lastContactDate = data.lastContactDate ? new Date(data.lastContactDate) : null;
    }

    // Handle startDate and calculate endDate
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      // Calculate endDate if startDate and tourDays available
      if (data.startDate) {
        const days = data.tourDays ?? existing.tourDays;
        if (days) {
          updateData.endDate = calculateEndDate(new Date(data.startDate), days);
        }
      }
    } else if (data.tourDays !== undefined && data.tourDays !== null && existing.startDate) {
      // If only tourDays changed, recalculate endDate
      updateData.endDate = calculateEndDate(existing.startDate, data.tourDays);
    }

    // Handle status change → update stage and nextFollowUp
    if (data.status !== undefined && data.status !== existing.status) {
      const newStatus = data.status as RequestStatus;
      updateData.status = newStatus;
      updateData.stage = getStageFromStatus(newStatus);
      updateData.statusChangedAt = new Date();
      // Note: statusChangedBy should be set from auth context when available
      if (data.statusChangedBy) {
        updateData.statusChangedBy = data.statusChangedBy;
      }

      // Recalculate nextFollowUp based on new status
      if (isFollowUpStatus(newStatus)) {
        const contactDate = data.lastContactDate
          ? new Date(data.lastContactDate)
          : existing.lastContactDate || new Date();
        updateData.nextFollowUp = await calculateNextFollowUp(newStatus, contactDate);
      } else {
        updateData.nextFollowUp = null;
      }

      // Handle BOOKING status transition - generate booking code
      if (newStatus === 'BOOKING' && existing.status !== 'BOOKING') {
        // Require startDate for booking
        const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
        if (!startDate) {
          return NextResponse.json(
            {
              success: false,
              error: 'Cần nhập ngày bắt đầu tour trước khi chuyển Booking',
              details: { startDate: 'Ngày bắt đầu là bắt buộc khi chuyển sang Booking' },
            },
            { status: 400 }
          );
        }

        // Generate booking code using sellerId (function handles fallback logic)
        const bookingCode = await generateBookingCode(startDate, existing.sellerId);
        updateData.bookingCode = bookingCode;
      }

      // Warning when reverting from BOOKING status
      if (existing.status === 'BOOKING' && newStatus !== 'BOOKING') {
        responseWarning = 'Đã chuyển khỏi Booking. Mã booking và operators vẫn được giữ lại.';
      }
    } else if (data.lastContactDate !== undefined && data.lastContactDate !== null && isFollowUpStatus(existing.status as RequestStatus)) {
      // If only lastContactDate changed and status is F1-F4, recalculate nextFollowUp
      updateData.nextFollowUp = await calculateNextFollowUp(
        existing.status as RequestStatus,
        new Date(data.lastContactDate)
      );
    }

    // Manual nextFollowUp override (if explicitly provided)
    if (data.nextFollowUp !== undefined && !data.status) {
      updateData.nextFollowUp = data.nextFollowUp ? new Date(data.nextFollowUp) : null;
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
    // Verify authentication
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

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

    // SELLER can only delete their own requests
    if (user.role === 'SELLER' && existing.sellerId !== user.id) {
      return forbiddenResponse('Bạn không có quyền xóa yêu cầu này');
    }

    // Only ADMIN can delete requests (SELLER can delete own, ACCOUNTANT cannot delete)
    if (user.role === 'ACCOUNTANT') {
      return forbiddenResponse('Kế toán không có quyền xóa yêu cầu');
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
