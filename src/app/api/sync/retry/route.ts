/**
 * Sync Queue Retry API (Phase 07.5.5)
 *
 * POST - Reset failed queue items for retry
 *
 * Auth: ADMIN role or CRON_SECRET
 * Body: { ids?: string[] } - specific IDs or all failed if empty
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { verifyCronSecret } from "@/lib/auth-utils";
import { basePrisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/logger";

/**
 * POST - Reset failed items for retry
 *
 * @body { ids?: string[] } - Optional array of specific queue item IDs to retry.
 *                            If empty/omitted, resets ALL failed items.
 * @returns { success: boolean, count: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: Either admin user or cron secret (timing-safe)
    const cronSecret = request.headers
      .get("Authorization")
      ?.replace("Bearer ", "");
    const isCronTrigger = verifyCronSecret(cronSecret);

    if (!isCronTrigger) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!hasPermission(session.user.role as Role, "*")) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
    }

    // Parse body - allow empty body
    const body = await request.json().catch(() => ({}));
    const ids = body.ids as string[] | undefined;

    // Reset items
    let count = 0;
    if (ids && ids.length > 0) {
      // Reset specific items by ID
      const result = await basePrisma.syncQueue.updateMany({
        where: {
          id: { in: ids },
          status: "FAILED",
        },
        data: {
          status: "PENDING",
          retries: 0,
          lastError: null,
        },
      });
      count = result.count;
    } else {
      // Reset all failed items
      const result = await basePrisma.syncQueue.updateMany({
        where: { status: "FAILED" },
        data: {
          status: "PENDING",
          retries: 0,
          lastError: null,
        },
      });
      count = result.count;
    }

    logInfo("api/sync/retry", `Reset ${count} failed items`, {
      trigger: isCronTrigger ? "cron" : "manual",
      specificIds: ids?.length ?? 0,
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    logError("api/sync/retry", error);
    return NextResponse.json(
      { success: false, error: "Retry failed" },
      { status: 500 }
    );
  }
}
