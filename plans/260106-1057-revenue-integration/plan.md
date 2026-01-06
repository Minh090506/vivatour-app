---
title: "Revenue Module Integration"
description: "Integrate revenue components into request detail, hook up auth, create /revenues page"
status: done
priority: P1
effort: 2h
branch: master
tags: [revenue, integration, auth, dashboard]
created: 2026-01-06
---

# Revenue Module Integration

## Overview

Integrate existing revenue components into the request detail panel, connect NextAuth session for userId, and create a standalone `/revenues` management page.

## Phases

| Phase | Description | Status | Effort |
|-------|-------------|--------|--------|
| [Phase 01](./phase-01-session-userid-hookup.md) | Hook up NextAuth session for userId | ✅ done | 20m |
| [Phase 02](./phase-02-request-detail-integration.md) | Integrate revenue components into request detail | ✅ done | 45m |
| [Phase 03](./phase-03-revenues-page.md) | Create standalone /revenues management page | ✅ done | 55m |

## Key Files

**Existing Components:**
- `src/components/revenues/revenue-table.tsx` - Revenue list table
- `src/components/revenues/revenue-form.tsx` - Add/edit revenue form
- `src/components/revenues/revenue-summary-card.tsx` - Summary metrics

**Target Files:**
- `src/components/requests/request-detail-panel.tsx` - Integration target
- `src/hooks/use-permission.ts` - Extend with userId
- `src/app/(dashboard)/revenues/page.tsx` - New page

## Dependencies

- NextAuth session already configured in `src/auth.ts`
- Revenue API endpoints exist at `/api/revenues`
- Permission system supports `revenue:view`, `revenue:manage`

## Success Criteria

1. Revenue section visible in request detail panel (bookings only)
2. Lock/unlock operations use authenticated userId (not 'system')
3. `/revenues` page accessible to ADMIN/ACCOUNTANT with filters
