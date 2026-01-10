/**
 * Sync Queue Status API
 *
 * GET - Get queue statistics and recent items
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { basePrisma } from "@/lib/db";
import { getQueueStats } from "@/lib/sync/write-back-queue";
import { logError } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get queue statistics
    const stats = await getQueueStats();

    // Check if user is admin for detailed view
    const isAdmin = hasPermission(session.user.role as Role, "*");

    // Get recent failed items (last 10) - admin only
    const recentFailed = isAdmin
      ? await basePrisma.syncQueue.findMany({
          where: { status: "FAILED" },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            model: true,
            action: true,
            recordId: true,
            lastError: true,
            retries: true,
            createdAt: true,
          },
        })
      : [];

    // Get recent write-back logs (last 20) - admin only
    const recentLogs = isAdmin
      ? await basePrisma.syncLog.findMany({
          where: {
            action: { startsWith: "WRITE_BACK" },
          },
          orderBy: { syncedAt: "desc" },
          take: 20,
        })
      : [];

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentFailed,
        recentLogs,
        lastProcessed: recentLogs[0]?.syncedAt || null,
      },
    });
  } catch (error) {
    logError("api/sync/queue", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue status" },
      { status: 500 }
    );
  }
}
