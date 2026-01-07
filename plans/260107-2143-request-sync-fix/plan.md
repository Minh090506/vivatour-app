---
title: "Fix Request Sync - Use RequestID as Unique Key"
description: "Fix sync to use column AR as unique identifier + status Vietnamese→enum mapping"
status: completed
priority: P1
effort: 1h
branch: master
tags: [sync, request, bugfix]
created: 2026-01-07
completed: 2026-01-07
---

# Plan: Fix Request Sync Logic

## Overview

Fix Request sync to use `Request ID` (column AR, index 43) as unique identifier instead of booking code (column T). Add Vietnamese→enum status mapping.

## Context

- **Brainstorm**: `plans/reports/brainstorm-260107-2143-request-sync-fix.md`
- **Decision**: Truncate + re-sync (user approved data loss)

## Current Problems

| Issue | Location | Impact |
|-------|----------|--------|
| Uses col T (index 19) as sync key | sheet-mappers.ts:173 | Empty for leads → unstable RQ-{rowIndex} |
| Status stored as Vietnamese | sheet-mappers.ts:216 | Filters fail |

## Solution Summary

1. Use `row[43]` (Request ID from AR) as unique sync key → `code` field
2. Use `row[19]` (Booking Code from T) → `bookingCode` field (for Operator/Revenue linking)
3. Map Vietnamese status labels → enum keys

## Implementation Phases

| Phase | Description | Status | File |
|-------|-------------|--------|------|
| 1 | Fix sheet-mappers.ts | ✅ completed | [phase-01-fix-sheet-mappers.md](./phase-01-fix-sheet-mappers.md) |
| 2 | Truncate + Re-sync | ✅ completed | [phase-02-truncate-resync.md](./phase-02-truncate-resync.md) |

## Files to Modify

- `src/lib/sheet-mappers.ts` - Add status mapping, change column indices
- `src/app/api/sync/sheets/route.ts` - Update Operator/Revenue lookup (bookingCode)

## Success Criteria

- [x] Requests synced with stable Request ID from column AR
- [x] Status stored as enum key (e.g., DANG_LL_CHUA_TL)
- [ ] Filters work correctly (needs UI testing after deployment)
- [x] Operator/Revenue link via bookingCode
- [x] Code review completed - see [reports/code-reviewer-260107-2346-request-sync-fix-phase2.md](../reports/code-reviewer-260107-2346-request-sync-fix-phase2.md)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss | User confirmed acceptable |
| Operator/Revenue orphaned | Re-sync after Request sync |
