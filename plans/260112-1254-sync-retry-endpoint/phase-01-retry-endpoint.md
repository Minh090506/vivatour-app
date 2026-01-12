---
parent: ./plan.md
phase: 01
title: "Create Retry Endpoint"
status: completed
priority: P2
effort: 30min
completed: 2026-01-12
---

# Phase 01: Create Retry Endpoint

## Context Links

- Parent: [plan.md](./plan.md)
- Reference: `src/app/api/sync/write-back/route.ts` (auth pattern)
- Utility: `src/lib/sync/write-back-queue.ts` (retryFailed)

## Overview

Create POST /api/sync/retry endpoint to reset failed queue items.

## Requirements

1. **Auth**: ADMIN role or CRON_SECRET (timing-safe)
2. **Input**: `{ ids?: string[] }` - specific IDs or all failed
3. **Action**: Reset status=PENDING, retries=0, lastError=null
4. **Response**: `{ success: true, count: number }`

## Architecture

```
POST /api/sync/retry
  ↓
Auth Check (ADMIN or CRON_SECRET)
  ↓
ids provided?
  ├─ Yes → Reset specific items
  └─ No → Reset all FAILED items
  ↓
Return count
```

## Related Code Files

| File | Purpose |
|------|---------|
| `src/app/api/sync/write-back/route.ts` | Auth pattern reference |
| `src/lib/sync/write-back-queue.ts` | `retryFailed()` function |

## Implementation Steps

### Step 1: Create route.ts

```typescript
// src/app/api/sync/retry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { basePrisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/logger";

function verifyCronSecret(provided: string | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(provided, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cronSecret = request.headers.get("Authorization")?.replace("Bearer ", "");
    const isCron = verifyCronSecret(cronSecret);

    if (!isCron) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!hasPermission(session.user.role as Role, "*")) {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
      }
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const ids = body.ids as string[] | undefined;

    // Reset items
    let count = 0;
    if (ids && ids.length > 0) {
      // Reset specific items
      const result = await basePrisma.syncQueue.updateMany({
        where: { id: { in: ids }, status: "FAILED" },
        data: { status: "PENDING", retries: 0, lastError: null },
      });
      count = result.count;
    } else {
      // Reset all failed
      const result = await basePrisma.syncQueue.updateMany({
        where: { status: "FAILED" },
        data: { status: "PENDING", retries: 0, lastError: null },
      });
      count = result.count;
    }

    logInfo("api/sync/retry", `Reset ${count} failed items`);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    logError("api/sync/retry", error);
    return NextResponse.json(
      { success: false, error: "Retry failed" },
      { status: 500 }
    );
  }
}
```

## Implementation Summary

**COMPLETED**

### Files Created/Modified:
1. **src/app/api/sync/retry/route.ts** (NEW) - POST endpoint for retry functionality
2. **src/__tests__/api/sync-retry.test.ts** (NEW) - Comprehensive test suite (15 tests passing)
3. **src/lib/auth-utils.ts** (MODIFIED) - Extracted `verifyCronSecret()` for DRY principle
4. **src/app/api/sync/write-back/route.ts** (MODIFIED) - Uses shared `verifyCronSecret` from auth-utils

### Tests Implemented:
- ✓ 15 tests passing
- ✓ Auth validation (ADMIN & CRON_SECRET)
- ✓ Specific IDs retry
- ✓ All failed items retry
- ✓ Error handling

## Success Criteria

1. Endpoint accepts POST with optional `{ ids: string[] }`
2. Resets FAILED items to PENDING
3. Returns count of reset items
4. Proper auth (ADMIN or CRON_SECRET)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mass retry floods queue | Low | Queue processor has batch limits |
| Auth bypass | High | Uses same pattern as write-back |

## Security Considerations

- Timing-safe cron secret comparison
- ADMIN role required for user auth
- No sensitive data in response
