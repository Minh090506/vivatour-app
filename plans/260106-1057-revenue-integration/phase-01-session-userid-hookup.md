# Phase 01: Hook up NextAuth Session for userId

**Parent:** [plan.md](./plan.md)
**Date:** 2026-01-06
**Priority:** P1
**Status:** blocked
**Review:** failed - critical security issues
**Review Report:** [plans/reports/code-reviewer-260106-1111-revenue-phase01.md](../../reports/code-reviewer-260106-1111-revenue-phase01.md)

## Overview

Connect NextAuth session to revenue components so lock/unlock operations use the actual authenticated user ID instead of hardcoded 'system'.

## Key Insights

1. Session already includes `user.id` (configured in `src/auth.ts:101`)
2. `usePermission` hook already uses `useSession` - can extend to expose userId
3. Two locations need userId: `revenue-table.tsx` lines 111 & 134

## Requirements

- Expose `userId` from `usePermission` hook
- Update `RevenueTable` to use authenticated userId for lock/unlock
- Update `RevenueForm` to use authenticated userId for create/update

## Architecture

```
usePermission hook
├── Already uses useSession()
├── Add: userId = session.user.id
└── Return: { ...existing, userId }

RevenueTable
├── Import usePermission
├── Get userId from hook
└── Replace 'system' with userId in API calls
```

## Related Files

| File | Action |
|------|--------|
| `src/hooks/use-permission.ts` | Extend to return userId |
| `src/components/revenues/revenue-table.tsx` | Use userId from hook |
| `src/components/revenues/revenue-form.tsx` | Use userId from hook |

## Implementation Steps

- [x] Extend `usePermission` to include `userId` from session
- [x] Update `RevenueTable` lock/unlock calls with userId from hook
- [x] Update `RevenueForm` submit with userId from hook
- [ ] Test lock/unlock with authenticated user ⚠️ BLOCKED by security issues

## Success Criteria

- [x] Lock/unlock API calls send actual user ID ⚠️ CLIENT-SIDE ONLY (INSECURE)
- [x] Revenue form sends user ID on create/update ⚠️ CLIENT-SIDE ONLY (INSECURE)
- [x] No 'system' hardcoded values remain

## Code Review Findings

**Status:** 🔴 **FAILED**
**Critical Issues:** 3
**High Priority:** 4
**Recommendation:** **BLOCK MERGE**

### Critical Security Vulnerabilities

1. **Client-Side userId Tampering** - Client sends userId in request body, API trusts it without verification. Enables user impersonation and audit trail manipulation.

2. **Missing Authorization Checks** - All API endpoints lack permission verification. TODO comments exist but checks not implemented.

3. **No Authentication Required** - API routes process requests without verifying session. Allows unauthenticated access.

### Required Fixes Before Proceeding

1. Remove client-provided userId from API requests
2. Extract userId from server-side session in API routes
3. Add authentication verification to all endpoints
4. Implement authorization checks (revenue:manage, ADMIN role)
5. Add input validation for date filters
6. Remove 'unknown' fallback (block operations without auth)

**See full report:** [plans/reports/code-reviewer-260106-1111-revenue-phase01.md](../../reports/code-reviewer-260106-1111-revenue-phase01.md)

## Risks

- **Low:** Session may not be loaded - handle with optional chaining
