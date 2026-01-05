# Phase 02: Auth Config

## Context
- **Parent Plan**: `plans/260105-1208-foundation-auth-rbac/plan.md`
- **Dependencies**: Phase 01 (schema + packages installed)
- **Blocks**: Phase 03, 04, 05, 07

## Overview
| Field | Value |
|-------|-------|
| Description | Configure NextAuth.js v5 with CredentialsProvider, JWT callbacks |
| Priority | P1 |
| Status | completed |
| Effort | 45min |
| Review | `plans/reports/code-reviewer-260105-1326-phase02-auth-config.md` |

## Requirements

### R2.1: Auth Configuration
Create `src/auth.ts` with:
- CredentialsProvider for email/password
- JWT strategy (not database sessions)
- Callbacks: jwt() stores role, session() exposes role
- Type declarations for Session/JWT extensions

### R2.2: API Route Handler
Create `src/app/api/auth/[...nextauth]/route.ts`:
- Export GET and POST handlers
- Import from src/auth.ts

### R2.3: Environment Variables
Required env var:
- `AUTH_SECRET`: Cryptographic secret (32+ chars)
- `AUTH_URL`: Auto-detected in v5, only needed for edge cases

## Architecture

### Auth.js v5 vs v4 Changes
| v4 | v5 |
|----|-----|
| `NEXTAUTH_SECRET` | `AUTH_SECRET` |
| `NEXTAUTH_URL` | `AUTH_URL` (often auto-detected) |
| `[...nextauth].ts` in pages | route.ts in app/api |
| getServerSession() | auth() |
| useSession() | unchanged |

### JWT Structure
```typescript
{
  sub: "user-cuid",
  email: "user@example.com",
  role: "SELLER",
  iat: 1234567890,
  exp: 1234567890
}
```

### Session Structure
```typescript
{
  user: {
    id: "user-cuid",
    email: "user@example.com",
    name: "John Doe",
    role: "SELLER"
  },
  expires: "2026-01-06T12:00:00.000Z"
}
```

## Related Code Files
- `src/auth.ts` - Main auth config (CREATE)
- `src/app/api/auth/[...nextauth]/route.ts` - API handler (CREATE)
- `src/lib/db.ts` - Prisma client

## Implementation Steps

### Step 1: Create Auth Config
Create `src/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

// Extend types for role
declare module "next-auth" {
  interface User {
    role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR";
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR";
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
```

### Step 2: Create API Route Handler
Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

### Step 3: Add Environment Variable
Add to `.env`:
```env
AUTH_SECRET="your-32-char-secret-key-here-abc"
```

Generate secure secret:
```bash
openssl rand -base64 32
```

### Step 4: Verify Types
Run TypeScript check:
```bash
npx tsc --noEmit
```

## Todo List

- [x] Create src/auth.ts with CredentialsProvider
- [x] Add type declarations for Session/JWT
- [x] Configure JWT callbacks (jwt, session)
- [x] Create src/app/api/auth/[...nextauth]/route.ts
- [⚠️] Add AUTH_SECRET to .env (not verified - privacy-protected)
- [x] Verify TypeScript compilation passes

## Code Review Findings (2026-01-05)

**Verdict:** ✅ APPROVE WITH MANDATORY FIXES

### Critical Issues (Must Fix)
1. **C1:** Type module path incorrect - use `"@auth/core/jwt"` not `"next-auth/jwt"`
2. **C2:** Missing AUTH_SECRET validation (length >= 32 chars)
3. **C3:** Timing attack vulnerability in password comparison

### High Priority
1. **H1:** Import `Role` from Prisma instead of redefining `RoleType`
2. **H5:** Zero test coverage - add auth tests before Phase 07

### Next Steps
1. Apply critical fixes (C1, C2, C3) - estimated 30min
2. Write auth tests (H5) - estimated 1h
3. Document rate limiting plan for Phase 03 or Phase 07

## Success Criteria

- [x] `src/auth.ts` exports: handlers, signIn, signOut, auth
- [⚠️] API route responds at /api/auth/signin (not tested yet)
- [⚠️] JWT token contains role field (not tested yet)
- [⚠️] Session object contains user.role (not tested yet)
- [x] TypeScript recognizes session.user.role type
- [x] No TS errors in auth.ts
- [ ] **NEW:** Critical fixes applied (C1, C2, C3)
- [ ] **NEW:** Auth tests written (minimum 7 test cases)

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AUTH_SECRET missing | High | Medium | Add clear error message |
| bcryptjs import issues | Medium | Low | Use named import { compare } |
| Type declaration conflicts | Medium | Low | Place declarations in auth.ts |
| Prisma client not ready | Medium | Low | Verify db.ts singleton works |

## Rollback Plan

1. Delete `src/auth.ts`
2. Delete `src/app/api/auth/[...nextauth]/route.ts`
3. Remove AUTH_SECRET from .env
