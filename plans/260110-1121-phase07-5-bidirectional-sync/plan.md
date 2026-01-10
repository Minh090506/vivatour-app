---
title: "Phase 07.5: Bidirectional Sync"
description: "DB-to-Sheets write-back with queue-based change tracking"
status: in-progress
priority: P1
effort: 12h
branch: master
tags: [sync, google-sheets, prisma, queue, cron]
created: 2026-01-10
---

# Phase 07.5: Bidirectional Sync

## Overview

Extend existing one-way sync (Sheets -> DB) to bidirectional. DB changes write back to Google Sheets via queue-based system with 5-min cron trigger.

## Architecture

```
[DB Change] --> [Prisma $extends] --> [SyncQueue] --> [Cron 5min] --> [Sheets API]
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Conflict Resolution | Last-Write-Wins | Simpler, timestamp-based |
| Sync Trigger | Cron (5min) | No real-time complexity |
| Queue | PostgreSQL SyncQueue | No Redis dependency |
| Rate Limits | Exponential backoff | 1s-64s, 5 retries |
| Batch Size | 25 rows/call | Stay under quota |

## Scope

- Request sheet (column AR=code as key)
- Operator sheet (serviceId as key)
- Revenue sheet (revenueId as key)
- Skip locked records (lockKT, lockAdmin, lockFinal)

## Phases

| Phase | Description | Effort | File | Status |
|-------|-------------|--------|------|--------|
| 01 | Database Queue Model + Utils | 2h | [phase-01](./phase-01-database-queue.md) | ✓ DONE |
| 02 | Sheets Writer + Retry Logic | 3h | [phase-02](./phase-02-sheets-writer.md) | ✓ DONE |
| 03 | Reverse Mappers (DB->Sheet) | 2h | [phase-03](./phase-03-reverse-mappers.md) | ✓ DONE |
| 04 | Prisma Change Tracking | 3h | [phase-04](./phase-04-change-tracking.md) | ✓ DONE |
| 05 | API Endpoints + Cron | 2h | [phase-05](./phase-05-api-integration.md) | ✓ DONE |

## Files Overview

### New Files
- `prisma/schema.prisma` - Add SyncQueue model
- `src/lib/sync/write-back-queue.ts` - Queue CRUD
- `src/lib/sync/sheets-writer.ts` - Sheets batchUpdate wrapper
- `src/lib/sync/db-to-sheet-mappers.ts` - Reverse mapping
- `src/lib/sync/sync-extensions.ts` - Prisma $extends
- `src/app/api/sync/write-back/route.ts` - Process queue
- `src/app/api/sync/queue/route.ts` - Queue status
- `vercel.json` - Cron config

### Modified Files
- `src/lib/google-sheets.ts` - Read-write scope
- `src/lib/db.ts` - Apply extensions

## Success Criteria

1. DB changes queue automatically via Prisma extensions
2. Cron processes queue every 5 min
3. Locked records skipped from write-back
4. Rate limits handled with exponential backoff
5. SyncLog tracks both directions

## Risks

| Risk | Mitigation |
|------|------------|
| Rate limit exhaustion | Batch 25 rows, backoff 1-64s |
| Formula corruption | USER_ENTERED mode, skip formula columns |
| Concurrent edits | Last-write-wins (timestamp) |
| Queue growth | Auto-cleanup after 7 days |

---

## Validation Summary

**Validated:** 2026-01-10
**Questions asked:** 7

### Confirmed Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| DELETE sync | Skip entirely | Don't modify Sheets on DB delete. Simplest, avoids data loss. |
| Sync coexistence | Independent | Both syncs run on own schedules. Last-write-wins handles conflicts. |
| Orphan queue items | Skip silently | Mark completed if record not found. Log but no error. |
| New row position | Append to end | Simplest. New webapp records go to sheet bottom. |
| Queue durability | Best-effort | setImmediate acceptable. Rare edge case, non-blocking. |
| Bulk operations | Skip tracking | Only track single-record ops. updateMany/deleteMany not synced. |
| Data freshness | 5 min acceptable | Current cron schedule confirmed sufficient. |

### Action Items

- [x] Plan confirmed, no revisions needed
- [ ] Phase 05: Update DELETE handling to skip (already in plan)
- [ ] Phase 04: Confirm bulk ops not tracked (already excluded)

### Recommendation

**Proceed to implementation.** All assumptions validated, no blocking issues found.
