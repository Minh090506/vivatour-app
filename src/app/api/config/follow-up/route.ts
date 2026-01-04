import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/config/follow-up - List all follow-up configs
export async function GET() {
  try {
    const configs = await prisma.configFollowUp.findMany({
      orderBy: { stage: 'asc' },
    });

    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error fetching follow-up configs:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi tải cấu hình follow-up: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/config/follow-up - Create/update config (upsert by stage)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.stage || body.daysToWait === undefined) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: stage, daysToWait' },
        { status: 400 }
      );
    }

    // Validate stage is valid
    const validStages = ['F1', 'F2', 'F3', 'F4'];
    if (!validStages.includes(body.stage)) {
      return NextResponse.json(
        { success: false, error: 'Stage không hợp lệ. Chỉ chấp nhận: F1, F2, F3, F4' },
        { status: 400 }
      );
    }

    const config = await prisma.configFollowUp.upsert({
      where: { stage: body.stage },
      update: {
        daysToWait: body.daysToWait,
        isActive: body.isActive ?? true,
      },
      create: {
        stage: body.stage,
        daysToWait: body.daysToWait,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error upserting follow-up config:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi lưu cấu hình follow-up: ${message}` },
      { status: 500 }
    );
  }
}
