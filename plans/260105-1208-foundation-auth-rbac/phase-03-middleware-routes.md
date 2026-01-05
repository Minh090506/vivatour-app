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
| Status | pending |
| Effort | 30min |

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

- [ ] Create src/middleware.ts with auth wrapper
- [ ] Define roleRoutes configuration
- [ ] Implement redirect for unauthenticated users
- [ ] Implement 403 for unauthorized roles
- [ ] Create src/app/forbidden/page.tsx
- [ ] Test middleware with different roles

## Success Criteria

- [ ] Unauthenticated access to /requests → redirects to /login
- [ ] SELLER accessing /settings → sees 403 page
- [ ] ADMIN accessing /settings → allowed
- [ ] /login accessible without auth
- [ ] /api/auth/* accessible without auth
- [ ] Static assets not affected by middleware

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
