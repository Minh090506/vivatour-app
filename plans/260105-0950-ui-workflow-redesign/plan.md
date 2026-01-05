---
title: "UI & Workflow Redesign"
description: "Master-Detail layout with 4 roles, claim mechanism, Expense module, Dashboard KPIs"
status: pending
priority: P1
effort: 5w
branch: master
tags: [ui, auth, rbac, expense, dashboard, nextauth]
created: 2026-01-05
---

# UI & Workflow Redesign - MyVivaTour Platform

## Overview

Transform MyVivaTour from basic 2-panel UI to professional Master-Detail layout with complete RBAC, booking claim mechanism, Expense module, and Dashboard KPIs.

## Research Completed

- [NextAuth.js v5 + RBAC](./research/researcher-auth-rbac-report.md)
- [Master-Detail UI Patterns](./research/researcher-ui-patterns-report.md)

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | NextAuth.js v5 + Credentials | JWT stateless, built-in callbacks |
| Session | JWT-based | No DB lookup per request |
| Layout | Resizable panels + Sheet | Desktop power users, mobile responsive |
| State | URL params + React Query | Bookmarkable, cached |
| Permissions | Centralized hooks | DRY, testable |

## Schema Changes

```prisma
// Add to Role enum
OPERATOR

// Add to Request model
claimedById     String?
claimedAt       DateTime?

// Add to User model
password        String?

// New Expense model (see phase-03)
```

## Phase Summary

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| [Phase 1](./phase-01-foundation-auth-layout.md) | Foundation | Auth, RBAC, Layout components |
| [Phase 2](./phase-02-core-ui-redesign.md) | Core UI | Request/Operator/Revenue redesign |
| [Phase 3](./phase-03-accounting-admin.md) | Accounting | Expense CRUD, Dashboard KPIs |
| [Phase 4](./phase-04-ai-basic-features.md) | AI Basic | Reminders, Notifications, Chat |

## Key Files to Modify

- `prisma/schema.prisma` - Add OPERATOR role, claim fields, Expense model
- `src/app/(dashboard)/layout.tsx` - Integrate MasterDetailLayout
- `src/components/requests/*` - Refactor to new pattern
- New: `src/auth.ts`, `src/middleware.ts`, `src/hooks/usePermission.ts`

## Success Criteria

- [ ] 4 roles with proper access control
- [ ] Master-Detail layout across all modules
- [ ] Claim mechanism prevents duplicates
- [ ] Expense CRUD (Accountant self-manages)
- [ ] Dashboard KPIs real-time (Admin only)
- [ ] Page load < 2s (Lighthouse)

## Validation Summary

**Validated:** 2026-01-05
**Questions asked:** 6

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Expense Approval | No approval needed - Accountant self-manages |
| Claim Conflict UX | Toast error sufficient (no modal) |
| KPI Visibility | Admin only (role-filtered dashboard) |
| Tab Structure | Keep Operator and Duyệt TT separate tabs |
| User Password Migration | Seed default password, force change on first login |
| Booking Validation | **FULL validation required** - startDate, tourDays, pax, booking date, expected revenue, expected cost, all request info passed to Operator |

### Action Items

- [x] Simplify Phase 3: Remove expense approval workflow
- [x] Update Phase 2: Add comprehensive booking validation (startDate, tourDays, pax, bookingDate, expectedRevenue, expectedCost)
- [x] Remove unresolved questions (all answered)

## Resolved Questions

1. ~~Notification delivery~~: In-app only
2. ~~File attachments storage~~: Supabase Storage
3. ~~Audit trail depth~~: Critical fields only (claim, status changes, payments)
