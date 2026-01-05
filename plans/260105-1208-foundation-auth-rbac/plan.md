---
title: "Phase 1: Foundation - Auth & RBAC"
description: "NextAuth.js v5 authentication, 4-role RBAC, MasterDetailLayout"
status: completed
priority: P1
effort: 4h
branch: master
tags: [auth, rbac, nextauth, layout]
created: 2026-01-05
phase-01-completed: 2026-01-05
phase-02-completed: 2026-01-05
phase-03-completed: 2026-01-05
phase-04-completed: 2026-01-05
phase-05-completed: 2026-01-05
phase-06-completed: 2026-01-05
phase-07-completed: 2026-01-05
---

# Phase 1: Foundation - Auth & RBAC

## Overview

Implement authentication and role-based access control using NextAuth.js v5 (Auth.js) with Credentials provider. Add OPERATOR role to support 4-role system: ADMIN, SELLER, OPERATOR, ACCOUNTANT. Create reusable MasterDetailLayout component with responsive 40-60 split and mobile Sheet overlay.

## Current State Analysis

| Item | Current | Target |
|------|---------|--------|
| NextAuth | v4.24.13 | v5 beta |
| Role enum | ADMIN, SELLER, ACCOUNTANT | + OPERATOR |
| User.password | Missing | Optional String |
| Session strategy | None | JWT-based |
| Route protection | None | Middleware + role mapping |
| Layout components | Simple wrapper | MasterDetailLayout + SlideInPanel |

## Architecture Decisions

### AD1: JWT Strategy (Not Database Sessions)
**Decision**: Use JWT-based sessions with role embedded in token
**Rationale**:
- Stateless scaling - no DB lookup per request
- Faster auth checks in middleware
- Role changes require re-login (acceptable for admin operations)

### AD2: Permissions as Hardcoded Config
**Decision**: Define PERMISSIONS constant in code, not database
**Rationale**:
- YAGNI - dynamic permissions add complexity without immediate benefit
- 4 roles are stable business requirement
- Type safety with TypeScript
- Future: can migrate to DB if requirements change

### AD3: Sheet-Based Mobile Detail Panel
**Decision**: Use existing shadcn Sheet component for mobile detail views
**Rationale**:
- Sheet component already in codebase
- Consistent with modern apps (Gmail, Linear pattern)
- Avoids new dependency for Drawer component

### AD4: react-resizable-panels for Desktop
**Decision**: Use react-resizable-panels for draggable 40-60 split
**Rationale**:
- Mature library (by React Virtualized author)
- Built-in localStorage persistence
- PanelResizeHandle provides visual feedback

## Dependencies

### New Packages
```bash
npm install next-auth@beta bcryptjs react-resizable-panels
npm install -D @types/bcryptjs
```

### Peer Dependencies (Already Installed)
- react: 19.2.3
- next: 16.1.1
- @radix-ui/react-dialog (Sheet)

## Phase Breakdown

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| 01 | Schema + Dependencies | 20min | None |
| 02 | Auth Config | 45min | Phase 01 |
| 03 | Middleware + Routes | 30min | Phase 02 |
| 04 | Login Page | 30min | Phase 02 |
| 05 | Permission System | 20min | Phase 02 |
| 06 | Layout Components | 45min | None |
| 07 | Integration | 30min | Phases 02-06 |

## Files Overview

### Files to Create
```
src/
  auth.ts                           # NextAuth.js v5 config
  middleware.ts                     # Route protection
  app/
    login/
      page.tsx                      # Login form
    api/
      auth/
        [...nextauth]/
          route.ts                  # Auth API handler
  lib/
    permissions.ts                  # RBAC permissions config
  hooks/
    usePermission.ts               # Permission hook
  components/
    layouts/
      MasterDetailLayout.tsx       # Resizable 40-60 panel
      SlideInPanel.tsx             # Sheet wrapper
      index.ts                     # Barrel exports
prisma/
  seed-admin.ts                    # Admin user seeder
```

### Files to Modify
```
prisma/schema.prisma               # Add OPERATOR, password field
src/app/(dashboard)/layout.tsx     # Add SessionProvider
package.json                       # Upgrade deps
```

## Success Criteria

- [x] User can login with email/password (code complete, QA pending)
- [x] JWT contains user role (auth.ts verified)
- [x] Unauthorized routes redirect to /login (middleware verified)
- [x] Forbidden routes show 403 page (middleware verified)
- [x] MasterDetailLayout renders 40-60 on desktop (md+) (Phase 06)
- [x] SlideInPanel slides from right on mobile (Phase 06)
- [x] usePermission correctly checks permissions (Phase 05)
- [x] Build passes with no TypeScript errors
- [x] Lint passes with no errors

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| NextAuth v5 breaking changes | High | Low | Pin to specific beta version |
| JWT token size | Low | Low | Only store essential fields (id, role) |
| Mobile responsiveness issues | Medium | Medium | Test on actual devices |
| Middleware perf overhead | Low | Low | Use matcher to limit routes |

## Phase Files

1. [Phase 01: Schema + Dependencies](./phase-01-schema-dependencies.md)
2. [Phase 02: Auth Config](./phase-02-auth-config.md)
3. [Phase 03: Middleware + Routes](./phase-03-middleware-routes.md)
4. [Phase 04: Login Page](./phase-04-login-page.md)
5. [Phase 05: Permission System](./phase-05-permission-system.md)
6. [Phase 06: Layout Components](./phase-06-layout-components.md)
7. [Phase 07: Integration](./phase-07-integration.md)

## Validation Summary

**Validated:** 2026-01-05
**Questions asked:** 6

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| JWT session duration | 24 giờ |
| Existing users migration | Seed password mặc định + bắt đổi on first login |
| Post-login redirect | /requests |
| SELLER xem Operator | Xem tất cả operator của request mình |
| Default role | **Không có default - bắt buộc chọn** |
| Dashboard homepage auth | Có - redirect to /login |

### Action Items (Plan Revisions)

- [x] **Phase 01**: Remove `@default(SELLER)` from User.role in schema - make role required field
- [x] **Phase 02**: Add `forcePasswordChange` logic (or document for Phase 2 of parent plan)
- [x] **Phase 03**: Add `/` to protected routes in middleware
- [x] **Phase 05**: Confirm SELLER has `operator:view` permission

## References

- Research: `plans/260105-0950-ui-workflow-redesign/research/researcher-auth-rbac-report.md`
- Research: `plans/260105-0950-ui-workflow-redesign/research/researcher-ui-patterns-report.md`
- [Auth.js v5 Docs](https://authjs.dev/)
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
