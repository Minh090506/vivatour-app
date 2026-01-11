import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createOperatorHistory } from '@/lib/operator-history';
import { getSessionUser, unauthorizedResponse } from '@/lib/auth-utils';
import { extractZodErrors } from '@/lib/validations/request-validation';

// Zod schema for archive body validation
const archiveBodySchema = z
  .object({
    ids: z.array(z.string().uuid('ID không hợp lệ')).min(1, 'Cần ít nhất 1 ID').optional(),
    autoArchive: z.boolean().optional(),
  })
  .refine((data) => data.ids || data.autoArchive, {
    message: 'Thiếu tham số: ids hoặc autoArchive',
  });

/**
 * POST /api/operators/archive
 *
 * Archive operators by IDs or auto-archive completed operators.
 *
 * Input: { ids: string[] } - Archive specific operators
 * Input: { autoArchive: true } - Auto-archive completed operators
 *
 * Auto-archive logic (from MVT_WORKFLOW_MASTER.md section 5.4):
 * - endDate <= last day of previous month
 * - paidAmount >= totalCost (fully paid)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate with Zod schema
    const validation = archiveBodySchema.safeParse(body);
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

    const { ids, autoArchive } = validation.data;

    const now = new Date();
    let operatorIds: string[] = [];

    if (autoArchive) {
      // Auto-archive logic: endDate <= lastDayOfPreviousMonth && paidAmount >= totalCost
      const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      lastDayOfPreviousMonth.setHours(23, 59, 59, 999);

      // Find operators eligible for auto-archive
      const eligibleOperators = await prisma.operator.findMany({
        where: {
          isArchived: false,
          request: {
            endDate: { lte: lastDayOfPreviousMonth },
          },
        },
        include: {
          request: { select: { endDate: true } },
        },
      });

      // Filter for fully paid (paidAmount >= totalCost)
      operatorIds = eligibleOperators
        .filter((op) => {
          const totalCost = Number(op.totalCost) || 0;
          const paidAmount = Number(op.paidAmount) || 0;
          return paidAmount >= totalCost;
        })
        .map((op) => op.id);

      if (operatorIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { archivedCount: 0 },
          message: 'Không có dịch vụ nào đủ điều kiện tự động lưu trữ',
        });
      }
    } else {
      // Manual archive by IDs (validated by Zod)
      operatorIds = ids!;
    }

    // Archive operators
    const updateResult = await prisma.operator.updateMany({
      where: {
        id: { in: operatorIds },
        isArchived: false, // Only archive non-archived
      },
      data: {
        isArchived: true,
        archivedAt: now,
      },
    });

    // Create history entries for each archived operator
    await Promise.all(
      operatorIds.map((id) =>
        createOperatorHistory({
          operatorId: id,
          action: 'ARCHIVE',
          changes: {
            isArchived: { before: false, after: true },
            archivedAt: { before: null, after: now.toISOString() },
          },
          userId: user.id,
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        archivedCount: updateResult.count,
        ids: operatorIds,
      },
      message: `Đã lưu trữ ${updateResult.count} dịch vụ`,
    });
  } catch (error) {
    console.error('Error archiving operators:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Lỗi lưu trữ: ${message}` },
      { status: 500 }
    );
  }
}
