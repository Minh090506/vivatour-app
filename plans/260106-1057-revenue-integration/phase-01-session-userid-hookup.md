# Phase 01: Hook up NextAuth Session for userId

**Parent:** [plan.md](./plan.md)
**Date:** 2026-01-06
**Priority:** P1
**Status:** ✅ done
**Review:** ✅ passed (second review)
**Commit:** `de43f75`

## Overview

Connect NextAuth session to revenue components so lock/unlock operations use the actual authenticated user ID instead of hardcoded 'system'.

## Key Insights

1. Session already includes `user.id` (configured in `src/auth.ts:101`)
2. `usePermission` hook already uses `useSession` - can extend to expose userId
3. Two locations need userId: `revenue-table.tsx` lines 111 & 134

## Requirements

- [x] Expose `userId` from `usePermission` hook
- [x] Update `RevenueTable` to use authenticated userId for lock/unlock
- [x] Update `RevenueForm` to use authenticated userId for create/update
- [x] **Added:** Server-side auth verification in all API routes

## Implementation Summary

### Client-side (3 files)
- `src/hooks/use-permission.ts` - Added `userId` to return object
- `src/components/revenues/revenue-table.tsx` - Uses userId from hook
- `src/components/revenues/revenue-form.tsx` - Uses userId from hook

### API-side (4 files) - Extended scope after code review
- `src/app/api/revenues/route.ts` - Added auth + permission checks
- `src/app/api/revenues/[id]/route.ts` - Added auth + permission checks
- `src/app/api/revenues/[id]/lock/route.ts` - Added auth + revenue:manage check
- `src/app/api/revenues/[id]/unlock/route.ts` - Added auth + ADMIN check

## Security Improvements

1. ✅ All API routes verify session with `auth()`
2. ✅ UserId extracted from `session.user.id` (never from client)
3. ✅ Permission checks using `hasPermission(role, permission)`
4. ✅ ADMIN-only enforcement for unlock operations
5. ✅ 401 returned for unauthenticated requests
6. ✅ 403 returned for unauthorized requests

## Success Criteria

- [x] Lock/unlock API calls use server-side userId
- [x] Revenue form creates with authenticated userId
- [x] No 'system' hardcoded values remain
- [x] All mutations require authentication
- [x] Permission checks enforced

## Reports

- First review (failed): [code-reviewer-260106-1111-revenue-phase01.md](../../reports/code-reviewer-260106-1111-revenue-phase01.md)
- Second review (passed): [code-reviewer-260106-1128-revenue-integration-phase01-second-review.md](../../reports/code-reviewer-260106-1128-revenue-integration-phase01-second-review.md)
- Test report: [tester-260106-1125-revenue-phase01-api-auth.md](../../reports/tester-260106-1125-revenue-phase01-api-auth.md)
