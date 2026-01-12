---
title: "Batch Sync Flag for Prisma Extensions"
description: "Add flag to disable change tracking during batch sync operations"
status: pending
priority: P2
effort: 1h
branch: master
tags: [prisma, sync, phase-07.5.4]
created: 2026-01-12
---

# Batch Sync Flag Implementation Plan

## Overview

Add request-scoped flag to disable Prisma change tracking during batch sync operations. Prevents recursive sync loops when bulk-importing data from Google Sheets.

## Problem

Current sync-extensions.ts tracks all CRUD operations. During batch sync (Sheets→DB), tracked changes would queue back to Sheets, creating infinite loop.

## Solution

Use `AsyncLocalStorage` for request-scoped flag isolation. Thread-safe, no race conditions between concurrent requests.

## Implementation Phases

| Phase | Description | Status | Effort |
|-------|-------------|--------|--------|
| [Phase 01](./phase-01-sync-context.md) | Add SyncContext with AsyncLocalStorage | pending | 45min |

## Files Modified

- `src/lib/sync/sync-context.ts` (NEW) - Context provider
- `src/lib/sync/sync-extensions.ts` - Add flag check
- `src/lib/sync/__tests__/sync-context.test.ts` (NEW) - Unit tests

## Success Criteria

1. `withSyncDisabled(callback)` function exported
2. Operations inside callback skip queue
3. No race conditions between requests
4. Existing tests pass
5. New unit tests for context

## Related

- Parent: Phase 07.5.4 Change Tracking
- Dependency: `src/lib/sync/sync-extensions.ts`
