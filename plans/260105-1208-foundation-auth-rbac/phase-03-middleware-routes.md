# Phase 03: Middleware + Routes

## Context
- **Parent Plan**: `plans/260105-1208-foundation-auth-rbac/plan.md`
- **Dependencies**: Phase 02 (auth config)
- **Blocks**: Phase 07

## Overview
| Field | Value |
|-------|-------|
| Description | Route protection middleware with role-based access |
| Priority | P1 |
| Status | complete |
| Effort | 30min |
| Review | `plans/reports/code-reviewer-260105-1339-phase03-middleware.md` |

## Requirements

### R3.1: Route Protection
Create `src/middleware.ts` that:
- Redirects unauthenticated users to /login
- Returns 403 for unauthorized roles
- Allows public routes (/login, /api/auth/*)

### R3.2: Role-Route Mapping
Configure which roles can access which routes:
```typescript
const roleRoutes = {
  '/requests': ['ADMIN', 'SELLER', 'OPERATOR', 'ACCOUNTANT'],
  '/operators': ['ADMIN', 'OPERATOR', 'ACCOUNTANT'],
  '/revenue': ['ADMIN', 'ACCOUNTANT'],
  '/expense': ['ADMIN', 'ACCOUNTANT'],
  '/settings': ['ADMIN'],
};
```

## Architecture

### Middleware Flow
```
Request → Matcher Check → Is Public? → Allow
                            ↓ No
                        Has Token? → No → Redirect /login
                            ↓ Yes
                        Role Allowed? → No → Return 403
                            ↓ Yes
                        Allow Request
```

### Route Categories
| Category | Example Routes | Auth Required |
|----------|---------------|---------------|
| Public | /login, /api/auth/* | No |
| Protected | /requests, /operators | Yes |
| Admin Only | /settings | Yes + ADMIN role |

### Matcher Pattern
Only run middleware on specific routes (performance):
```typescript
export const config = {
  matcher: [
    '/requests/:path*',
    '/operators/:path*',
    '/revenue/:path*',
    '/expense/:path*',
    '/settings/:path*',
  ],
};
```

## Related Code Files
- `src/middleware.ts` - Route protection (CREATE)
- `src/auth.ts` - Auth exports

## Implementation Steps

### Step 1: Create Middleware
Create `src/middleware.ts`:

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Role-based route access configuration
const roleRoutes: Record<string, string[]> = {
  "/requests": ["ADMIN", "SELLER", "OPERATOR", "ACCOUNTANT"],
  "/operators": ["ADMIN", "OPERATOR", "ACCOUNTANT"],
  "/revenue": ["ADMIN", "ACCOUNTANT"],
  "/expense": ["ADMIN", "ACCOUNTANT"],
  "/settings": ["ADMIN"],
  "/suppliers": ["ADMIN", "ACCOUNTANT"],
};

// Public routes that don't require auth
const publicRoutes = ["/login", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  for (const route of publicRoutes) {
    if (pathname.startsWith(route)) {
      return NextResponse.next();
    }
  }

  // Check authentication
  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = session.user.role;

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      // ADMIN always has access
      if (userRole === "ADMIN") {
        return NextResponse.next();
      }

      if (!allowedRoles.includes(userRole)) {
        // Return 403 Forbidden page
        return NextResponse.rewrite(new URL("/forbidden", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Step 2: Create Forbidden Page
Create `src/app/forbidden/page.tsx`:

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <ShieldX className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold mb-2">Truy cap bi tu choi</h1>
      <p className="text-muted-foreground mb-6">
        Ban khong co quyen truy cap trang nay.
      </p>
      <Button asChild>
        <Link href="/">Quay ve Trang chu</Link>
      </Button>
    </div>
  );
}
```

### Step 3: Verify Middleware Execution
Test by:
1. Starting dev server
2. Accessing protected route without login → should redirect to /login
3. Logging in as SELLER → accessing /settings should show forbidden

## Todo List

- [x] Create src/middleware.ts with auth wrapper
- [x] Define roleRoutes configuration
- [x] Implement redirect for unauthenticated users
- [x] Implement 403 for unauthorized roles
- [x] Create src/app/forbidden/page.tsx
- [ ] Test middleware with different roles (manual QA required)

## Success Criteria

- [x] Unauthenticated access to /requests → redirects to /login (verified in code)
- [x] SELLER accessing /settings → sees 403 page (verified in code)
- [x] ADMIN accessing /settings → allowed (verified in code)
- [x] /login accessible without auth (verified in code)
- [x] /api/auth/* accessible without auth (verified in code)
- [x] Static assets not affected by middleware (verified in code)
- [ ] Runtime manual testing (QA pending)

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Middleware blocks static assets | High | Medium | Careful matcher config |
| Infinite redirect loop | High | Low | Check for /login in matcher |
| Token not available in req.auth | Medium | Low | Verify auth callback order |

## Rollback Plan

1. Delete `src/middleware.ts`
2. Delete `src/app/forbidden/page.tsx`
3. All routes become public

---

## Code Review Summary

**Status**: ✅ APPROVED with minor suggestions
**Report**: `plans/reports/code-reviewer-260105-1339-phase03-middleware.md`
**Date**: 2026-01-05

### Key Findings
- **Security**: Production-ready, correct RBAC enforcement
- **Performance**: Acceptable (minor matcher optimization opportunity)
- **Architecture**: Follows NextAuth v5 patterns correctly
- **Code Quality**: 0 lint errors, 0 TypeScript errors

### Critical Issues
None

### Warnings
1. Next.js middleware deprecation notice (future migration to proxy.ts required)
2. Universal matcher runs on all routes (2-5ms overhead, acceptable trade-off)

### Suggestions
1. Fix Vietnamese diacritics in forbidden page (15 sec fix)
2. Add performance comment to matcher config
3. Consider extracting route config to separate file
4. Add security logging for production

### Next Steps
1. Fix Vietnamese diacritics (immediate)
2. Manual QA testing with different user roles (before Phase 07)
3. Track Next.js 17 release for proxy.ts migration
4. Ready to proceed to Phase 04 (Login Page)
