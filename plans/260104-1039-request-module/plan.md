---
title: "Request Module Implementation"
description: "Full request workflow with status stages, auto-generated IDs, booking conversion, and seller permissions"
status: completed
priority: P1
effort: 6d
branch: master
tags: [request, workflow, crud, permissions]
created: 2026-01-04
reviewed: 2026-01-04
completed: 2026-01-04
---

# Request Module Implementation Plan

## Overview

Implement complete Request module with 14 statuses grouped into 4 stages, auto-generated IDs (RQID + Booking CODE), follow-up reminders, booking-to-operator conversion, and multi-seller permissions.

## Design Reference

- **Brainstorm Report:** [brainstorm-260104-1039-request-module-design.md](../reports/brainstorm-260104-1039-request-module-design.md)
- **Operator Patterns:** [research/operator-patterns-report.md](research/operator-patterns-report.md)
- **Prisma Patterns:** [research/prisma-patterns-report.md](research/prisma-patterns-report.md)

---

## Implementation Phases

| Phase | Name | Status | Effort | Dependencies |
|-------|------|--------|--------|--------------|
| 1 | [Schema & Config](phase-01-schema-config.md) | ✅ Complete | 1d | None |
| 2 | [API Routes](phase-02-api-routes.md) | ✅ Complete | 1d | Phase 1 |
| 3 | [UI Components](phase-03-ui-components.md) | ✅ Complete | 1.5d | Phase 2 |
| 4 | [UI Pages](phase-04-ui-pages.md) | ✅ Complete | 1.5d | Phase 3 |
| 5 | [Booking & Follow-up](phase-05-booking-followup.md) | ✅ Complete | 1d | Phase 4 |

---

## Key Features

### Status Workflow (4 Stages, 14 Statuses)

```
LEAD          → DANG_LL_CHUA_TL, DANG_LL_DA_TL
QUOTE         → DA_BAO_GIA, DANG_XAY_TOUR
FOLLOWUP      → F1, F2, F3, F4
OUTCOME       → BOOKING, KHACH_HOAN, KHACH_SUY_NGHI, KHONG_DU_TC, DA_KET_THUC, CANCEL
```

### Auto-Generated IDs

| Type | Format | Example |
|------|--------|---------|
| RQID | RQ-YYMMDD-0001 | RQ-260104-0001 |
| BookingCode | YYYYMMDD+Seller+Seq | 20260201L0005 |

### Core Logic

- **Create:** Auto-generate RQID, set receivedDate
- **Update dates:** Auto-calculate endDate = startDate + tourDays
- **Status → BOOKING:** Generate bookingCode, create Operator entry
- **Follow-up:** Calculate nextFollowUp from ConfigFollowUp.daysToWait

### Permissions

| Role | View | Edit |
|------|------|------|
| Seller | Own only | Own |
| Manager+ | All | All |

---

## Files to Create/Modify

### New Files
- `src/config/request-config.ts`
- `src/lib/request-utils.ts`
- `src/app/api/config/follow-up/route.ts`
- `src/app/api/config/user/route.ts`
- `src/app/(dashboard)/requests/page.tsx`
- `src/app/(dashboard)/requests/create/page.tsx`
- `src/app/(dashboard)/requests/[id]/page.tsx`
- `src/components/requests/request-form.tsx`
- `src/components/requests/request-table.tsx`
- `src/components/requests/request-filters.tsx`
- `src/components/requests/request-status-badge.tsx`

### Modified Files
- `prisma/schema.prisma`
- `src/types/index.ts`
- `src/app/api/requests/route.ts`
- `src/app/api/requests/[id]/route.ts`
- `src/app/(dashboard)/page.tsx` (follow-up widget)

---

## Success Criteria

- [x] All 14 statuses selectable in UI grouped by stage
- [x] RQID auto-generated on create
- [x] BookingCode generated when status=BOOKING
- [x] Manual operator creation after booking (per design decision)
- [x] Follow-up dashboard shows overdue/today/upcoming
- [x] Sellers see only own requests (via ConfigUser.canViewAll)
- [x] Build passes, no type errors
- [x] CRITICAL-1 fixed: Static Tailwind color mapping
- [x] CRITICAL-2 fixed: sellerId from /api/config/user/me

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Status transition bugs | High | Validate in API, test all paths |
| Booking code collision | Low | DB unique constraint + sequence |
| Permission bypass | High | Default restrictive, thorough testing |

---

## Validation Summary

**Validated:** 2026-01-04
**Questions asked:** 6

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| Status transition rules | Free transitions - any status can change to any other |
| Operator auto-generation | None - manual only (user adds operators after BOOKING) |
| Existing data migration | Generate rqid for existing requests via migration script |
| Status change history | Basic log - store changes with timestamp and user |
| ConfigUser access | Admin only - only ADMIN role can manage seller codes |
| Booking status revert | Allow with warning - bookingCode and operators remain |

### Plan Revisions Applied ✅

- [x] **Phase 1:** Add migration script to backfill rqid for existing requests
- [x] **Phase 1:** Add basic status change logging (statusChangedAt, statusChangedBy fields)
- [x] **Phase 2:** Remove auto-operator creation from BOOKING logic
- [x] **Phase 2:** Add admin-only check to ConfigUser API endpoints
- [x] **Phase 5:** Update PUT handler - only generate bookingCode, no operator creation
- [x] **Phase 5:** Add warning message when reverting from BOOKING status

---

## Code Review Findings (2026-01-04)

**Report:** [code-reviewer-260104-1218-request-module-review.md](../reports/code-reviewer-260104-1218-request-module-review.md)

### Critical Issues (RESOLVED)

- [x] **CRITICAL-1:** Replace dynamic Tailwind classes with static mappings (`request-status-badge.tsx`) ✅ Fixed
- [x] **CRITICAL-2:** Add `sellerId` to request creation flow ✅ Fixed (fetch from /api/config/user/me)
- [ ] **CRITICAL-3:** Sanitize notes field to prevent potential XSS (low priority - React auto-escapes)

### High Priority

- [ ] **HIGH-1:** Add error boundaries to all pages
- [ ] **HIGH-2:** Add abort controllers to async fetches (follow-up widget)

### Medium Priority

- [ ] **MED-1:** Replace `as any` type assertions with type guards
- [ ] **MED-2:** Debounce search input to reduce API calls
- [ ] **MED-3:** Add loading state feedback with toast notifications

### Phase Completion Status

- Phase 3: ✅ Complete (CRITICAL-1 fixed - static Tailwind color mapping)
- Phase 4: ✅ Complete (CRITICAL-2 fixed - sellerId injection from /me endpoint)
- Phase 5: ✅ Complete (all steps done, build passes)

### Completed Actions

1. ✅ Fixed CRITICAL-1 (dynamic Tailwind → static COLOR_CLASSES mapping)
2. ✅ Fixed CRITICAL-2 (sellerId fetched from /api/config/user/me)
3. ✅ Build verified - all phases compile successfully
4. ⬜ Future: Add error boundaries and toast notifications (non-blocking)
