# Plan: Revenue UI Testing & Middleware Deprecation Warning

**Created:** 2026-01-06
**Status:** Ready for implementation

---

## Task Overview

Two tasks to address:
1. Test revenue section in UI by viewing request with booking code
2. Address Next.js middleware deprecation warning

---

## Task 1: Revenue UI Testing

### Current State Analysis

Revenue section in `request-detail-panel.tsx` (lines 250-283):
- Only shows when request has `bookingCode` AND user has `revenue:view` permission
- Fetches revenues from `/api/revenues?requestId={id}`
- Shows `RevenueSummaryCard` + `RevenueTable` + add/edit dialog

### Testing Steps

1. Start dev server: `npm run dev`
2. Login as ADMIN/ACCOUNTANT (has `revenue:view` + `revenue:manage`)
3. Navigate to `/requests`
4. Find/create a request with booking code (look for green "Mã Booking" banner)
5. Verify:
   - Revenue section appears
   - Table shows existing revenues (if any)
   - "Thêm thu nhập" button works
   - CRUD operations function correctly

### Validation Criteria

- [ ] Revenue section visible for requests with booking codes
- [ ] Add revenue dialog opens and submits correctly
- [ ] Edit/delete/lock operations work
- [ ] Summary card shows correct totals

---

## Task 2: Middleware Deprecation Warning

### Current State

Build output shows:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**File:** `src/middleware.ts`

Current implementation uses `auth()` from next-auth for:
- Authentication checks (redirect to /login if not authenticated)
- Role-based route access control

### Migration Considerations

Per Next.js 16 migration guide:

| Aspect | middleware.ts | proxy.ts |
|--------|---------------|----------|
| Purpose | Edge runtime, auth | Routing (rewrites, redirects, headers) |
| Runtime | Edge | Node.js |
| Auth | Allowed but discouraged | NOT recommended |
| Status | Deprecated | Recommended |

**Critical Issue:** Next.js 16 explicitly states proxy.ts should NOT handle authentication. Auth should move to:
- Layouts (for page protection)
- Route handlers (for API protection)

### Recommended Approach

Given complexity and scope, recommend **two-phase approach**:

#### Phase A: Immediate (No Change)
- Keep `middleware.ts` as-is
- Warning is cosmetic - functionality remains
- Document in code as tech debt

#### Phase B: Future Refactor (Separate PR)
1. Migrate auth checks to layout components
2. Migrate API auth to route handlers
3. Rename `middleware.ts` → `proxy.ts`
4. Keep only routing logic in proxy

### Action for This Task

Add TODO comment to middleware.ts acknowledging deprecation:

```typescript
/**
 * TODO: [Tech Debt] Migrate to proxy.ts convention
 *
 * Next.js 16 deprecates middleware.ts in favor of proxy.ts.
 * However, proxy.ts should NOT handle authentication per Next.js docs.
 *
 * Migration requires:
 * 1. Move auth checks to layout components (RSC)
 * 2. Move API auth to individual route handlers
 * 3. Rename this file to proxy.ts with only routing logic
 *
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 */
```

---

## Implementation Phases

### Phase 01: Revenue UI Testing (Manual)
- Run dev server
- Manual testing with browser
- Document any issues found

### Phase 02: Middleware Documentation
- Add tech debt comment to middleware.ts
- No functional changes
- Ensures future devs understand the deprecation

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Revenue section bugs | Low | Manual testing will catch issues |
| Middleware breaking | None | No functional changes, only documentation |

---

## Success Criteria

1. Revenue section verified working for booking-code requests
2. Middleware file documented with tech debt note
3. Build still passes (warning expected)

---

## Sources

- [Next.js Middleware to Proxy](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Proxy File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
