---
title: "Sync Retry Endpoint"
description: "Add POST /api/sync/retry to reset failed queue items"
status: completed
priority: P2
effort: 30min
branch: master
tags: [sync, api, phase-07.5.5]
created: 2026-01-12
completed: 2026-01-12
---

# Sync Retry Endpoint Plan

## Overview

Add missing retry endpoint to complete Phase 07.5.5 sync API.

## Context

Existing endpoints:
- `POST /api/sync/write-back` - Process queue (cron triggered)
- `GET /api/sync/queue` - Queue status with failed items

Missing:
- `POST /api/sync/retry` - Reset failed items for retry

## Implementation Phases

| Phase | Description | Status | Effort | Completed |
|-------|-------------|--------|--------|-----------|
| [Phase 01](./phase-01-retry-endpoint.md) | Create retry endpoint | completed | 30min | 2026-01-12 |

## Files

| File | Action |
|------|--------|
| `src/app/api/sync/retry/route.ts` | CREATE |

## Success Criteria

1. POST /api/sync/retry accepts `{ ids?: string[] }`
2. Resets failed items to PENDING status
3. Returns count of reset items
4. Auth: ADMIN or CRON_SECRET
