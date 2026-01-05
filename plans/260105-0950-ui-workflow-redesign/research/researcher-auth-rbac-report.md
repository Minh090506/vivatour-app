# Research Report: NextAuth.js v5 + Role-Based Access Control

**Date**: 2026-01-05 | **Scope**: Auth.js v5 setup with Next.js 16, Credentials provider, JWT, RBAC

## Executive Summary

Auth.js v5 (formerly NextAuth.js) is production-ready for Next.js 16 with App Router. Key findings: Use JWT-based sessions for stateless auth, extend session with custom role field via callbacks, implement middleware-based route protection, and leverage permission hooks for component-level access. All Auth variables now use `AUTH_` prefix (not `NEXTAUTH_`). Prisma adapter support requires database-persisted sessions for full RBAC.

## Key Findings

### NextAuth.js v5 Architecture
- **Package rename**: NextAuth.js → Auth.js v5 (semantic versioning reset)
- **App Router native**: Full support for `/app/api/auth/[...nextauth]/route.ts` handler
- **No breaking changes to DB schema**: OAuth 1.0 dropped; `oauth_token_secret` field removable if unused
- **Environment variables**: Prefix changed from `NEXTAUTH_` to `AUTH_` (e.g., `AUTH_SECRET`, `AUTH_URL`)
- **Session strategies**: JWT (stateless) or Database (via Prisma adapter)
- **Auto host detection**: `AUTH_URL` often unnecessary; auto-detected from request headers

### Credentials Provider Setup
```typescript
// auth.ts
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";

export const authConfig = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials?.email }
        });
        if (!user) return null;
        const valid = await compare(credentials?.password || "", user.password);
        return valid ? user : null;
      }
    })
  ]
};
```

### RBAC Implementation Pattern
**Two strategies** based on session mode:

1. **JWT-Based (Stateless, recommended for microservices)**:
   - Role persisted in JWT token
   - No database lookup on request
   - Faster, stateless scaling
   - Use `jwt()` callback to store `token.role`

2. **Database-Based (Session strategy)**:
   - Role fetched from user record
   - Requires Prisma adapter + DB query
   - Session persisted in `sessions` table
   - Use `session()` callback to expose role

**Custom Session Extension**:
```typescript
// auth.ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "Admin" | "Seller" | "Operator" | "Accountant";
    }
  }
  interface JWT {
    role: string;
  }
}

export const authOptions = {
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role;
      return session;
    }
  }
};
```

### Middleware-Based Route Protection
```typescript
// middleware.ts
import { auth } from "@/auth";

const roleRoutes = {
  "/admin": ["Admin"],
  "/seller": ["Seller", "Admin"],
  "/operator": ["Operator", "Admin"],
  "/accountant": ["Accountant", "Admin"]
};

export default auth((req) => {
  const token = req.auth?.token;
  const pathname = req.nextUrl.pathname;

  // Check if route requires role
  for (const [route, roles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route) && !roles.includes(token?.role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*", "/seller/:path*", "/operator/:path*", "/accountant/:path*"]
};
```

### Permission Hooks Pattern
```typescript
// hooks/usePermission.ts
import { useSession } from "next-auth/react";

const PERMISSIONS = {
  Admin: ["create_user", "edit_user", "delete_user", "view_reports"],
  Seller: ["view_products", "manage_products", "view_sales"],
  Operator: ["manage_requests", "view_dashboard"],
  Accountant: ["view_reports", "manage_billing"]
};

export function usePermission() {
  const { data: session } = useSession();

  return {
    can: (permission: string) => {
      const role = session?.user?.role || "Guest";
      return PERMISSIONS[role]?.includes(permission) || false;
    },
    role: session?.user?.role
  };
}

// Usage in components
function AdminPanel() {
  const { can } = usePermission();
  if (!can("delete_user")) return null;
  return <button>Delete User</button>;
}
```

### API Route Protection
```typescript
// app/api/users/route.ts
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["Admin", "Operator"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch and return users
  const users = await db.user.findMany();
  return Response.json(users);
}
```

## Security Considerations

- **Password hashing**: Use bcrypt (library: `bcryptjs` or `bcrypt`) for credentials provider
- **JWT secret**: `AUTH_SECRET` must be cryptographically strong (min 32 chars) in production
- **CSRF protection**: Auth.js v5 includes automatic CSRF token management via cookies
- **Session expiry**: Configure via `maxAge` in session config; recommend 24h for API, 7d for UI
- **Secure cookies**: Auto-set with `secure: true` and `httpOnly: true` in production
- **Middleware token access**: Use `req.auth` in middleware.ts; token available after callbacks execute
- **Callback execution order**: With callbacks in `auth.ts`: middleware → jwt → session

## Recommended Approach for 4-Role System

1. **Use JWT strategy** for stateless scaling, especially with microservices
2. **Extend Session/JWT** interfaces with role field (shown above)
3. **Implement permission config** object for DRY principle (PERMISSIONS constant)
4. **Use middleware** for page-level protection; hooks for component-level
5. **Check role in API routes** before executing business logic
6. **Leverage Prisma adapter** if building dashboard with DB-persisted sessions
7. **Store role in User model** (already in your schema, confirmed)

## Unresolved Questions

- How to handle role elevation workflows (e.g., Seller → Admin approval)?
- Should permissions be stored in DB for dynamic config or hardcoded?
- Multi-tenant isolation strategy for Seller role isolation?

## References

- [Auth.js v5 Credentials Provider](https://authjs.dev/getting-started/providers/credentials)
- [Auth.js v5 RBAC Guide](https://authjs.dev/guides/role-based-access-control)
- [Auth.js Migration to v5](https://authjs.dev/getting-started/migrating-to-v5)
- [Next.js Auth Integration (Dec 2025)](https://javascript.plainenglish.io/stop-crying-over-auth-a-senior-devs-guide-to-next-js-15-auth-js-v5-42a57bc5b4ce)
- [Prisma NextAuth Adapter](https://next-auth.js.org/adapters/prisma)
