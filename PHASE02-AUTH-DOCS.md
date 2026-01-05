# Phase 02 Authentication Config - Documentation Index

**Last Updated**: 2026-01-05
**Status**: Documentation Complete

---

## Quick Reference

### What Changed

Phase 02 introduced NextAuth.js v5 authentication with JWT sessions, bcryptjs password hashing, and 4-role RBAC (ADMIN, SELLER, ACCOUNTANT, OPERATOR).

### Key Files

**Implementation**:
- `src/auth.ts` - NextAuth.js v5 configuration
- `src/app/api/auth/[...nextauth]/route.ts` - API route handler

**Documentation**:
- `docs/codebase-summary.md` - Updated with auth system overview
- `docs/system-architecture.md` - Complete auth architecture details

---

## Authentication Architecture

### Session Management

```
Session Type:   JWT (stateless)
Expiry:         24 hours
Strategy:       JWT callbacks with bcryptjs verification
Cookie:         httpOnly, secure, sameSite
```

### Providers

```
Credentials Provider:
  - Email/password authentication
  - bcryptjs password hashing
  - Timing attack protection (dummy hash)
  - Role extraction from User model
```

### Roles

```
ADMIN      - Full system access, user management
SELLER     - Create/manage requests, view own data
ACCOUNTANT - Financial records, accounting lock
OPERATOR   - Service management, cost tracking
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/callback/credentials` | POST | Login with email/password |
| `/api/auth/session` | GET | Get current user session |
| `/api/auth/signin` | POST | Sign in (redirect flow) |
| `/api/auth/signout` | GET/POST | Sign out (redirect flow) |

---

## Environment Variables

```env
# Required for authentication
AUTH_SECRET="<generate-with: openssl rand -base64 32>"   # Min 32 characters
NEXTAUTH_URL="http://localhost:3000"                     # Login redirect URL
```

---

## Type Safety

### User Type
```typescript
interface User {
  id: string
  email: string
  name?: string | null
  role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR"
  password: string  // bcryptjs hashed, nullable for OAuth
}
```

### Session Type
```typescript
interface Session {
  user: {
    id: string
    email: string
    name?: string | null
    role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR"
  }
}
```

### JWT Token
```typescript
interface JWT {
  id: string
  email: string
  name?: string | null
  role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR"
}
```

---

## Security Features

1. **Password Hashing**: bcryptjs with configurable rounds (default 10)
2. **Timing Attack Prevention**: Dummy hash comparison for non-existent users
3. **AUTH_SECRET Validation**: Enforced minimum 32 characters at startup
4. **Secure Cookies**: httpOnly, sameSite flags managed by NextAuth.js
5. **JWT Signing**: Uses AUTH_SECRET for cryptographic signing
6. **Session Expiry**: Automatic 24-hour expiration

---

## Configuration Details

### src/auth.ts

**Setup**:
- Validates AUTH_SECRET at module load
- Defines RoleType union type
- Declares type extensions for NextAuth

**Credentials Provider**:
- Accepts email and password credentials
- Queries User model for email
- Compares password with bcryptjs.compare()
- Returns user with id, email, name, role

**JWT Callback**:
- Extracts id and role from user object
- Stores in token for session persistence

**Session Callback**:
- Injects token.id and token.role into session.user
- Ensures type-safe role availability in components

**Pages**:
- Sign in: `/login`
- Error: `/login` (login page shows errors)

---

## Usage Examples

### Check Session in Component

```typescript
import { auth } from "@/auth";

export default async function ProtectedPage() {
  const session = await auth();

  if (!session?.user) {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome {session.user.email} ({session.user.role})</div>;
}
```

### Check Role in API Route

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admin-only logic here
  return NextResponse.json({ success: true });
}
```

### Sign In

```typescript
import { signIn } from "@/auth";

export default function LoginPage() {
  const handleLogin = async (formData: FormData) => {
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: true,
      redirectTo: "/dashboard"
    });
  };

  return (
    <form action={handleLogin}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Sign Out

```typescript
import { signOut } from "@/auth";

export default function SignOutButton() {
  return (
    <form action={async () => { "use server"; await signOut(); }}>
      <button type="submit">Sign Out</button>
    </form>
  );
}
```

---

## Documentation Files

### Updated Documentation

**docs/codebase-summary.md**
- Section: "Authentication System (Phase 02)" (line 161)
- Table: "Authentication Files" (line 107)
- Table: "API Routes (REST Endpoints)" - Added 4 auth routes (line 107)
- Section: "Environment Variables" - Added AUTH_SECRET, NEXTAUTH_URL (line 332)

**docs/system-architecture.md**
- Section: "API Routes Pattern" - Added NextAuth routes (line 181)
- Section: "Integration Points" - NextAuth.js v5 details (line 586)
  - Implementation flow diagram
  - RBAC role descriptions
  - 6 security features with details
  - Type definitions
  - Environment variables

### Reports

**plans/reports/docs-manager-260105-1334-phase02-auth.md**
- Comprehensive documentation update report
- Changes made to each file
- Verification results
- Quality metrics
- Next steps recommendations

**plans/reports/docs-manager-260105-1334-summary.txt**
- Quick summary of changes
- Features documented
- Verification checklist
- Metrics

---

## Next Steps

### Phase 03 (Recommended)

1. **Login Page UI Implementation**
   - Create `/app/login/page.tsx` component
   - Implement credentials form with validation
   - Add error display and loading state
   - Document in `docs/codebase-summary.md`

2. **Protected Routes Setup**
   - Create middleware for route protection
   - Implement role-based route guards
   - Document patterns in `docs/code-standards.md`

3. **Session Usage in Components**
   - Add session-aware navigation
   - Show user info in header
   - Implement sign-out button
   - Document in login guide

### Future Enhancements

- Google OAuth 2.0 provider
- GitHub OAuth provider
- Two-factor authentication (TOTP, SMS)
- Passkeys/WebAuthn support
- Session revocation
- Password reset flow

---

## Troubleshooting

### AUTH_SECRET Not Set

```
Error: AUTH_SECRET must be set and at least 32 characters
```

**Solution**:
```bash
openssl rand -base64 32
# Copy output to .env as AUTH_SECRET value
```

### Wrong Password Not Failing

**Note**: This is expected behavior. The auth system uses timing attack protection:
- Dummy hash comparison ensures consistent response time
- Non-existent users return null (no error leaked)
- This prevents user enumeration attacks

### Session Not Available

**Check**:
1. Verify AUTH_SECRET is set in `.env`
2. Verify NEXTAUTH_URL matches application URL
3. Check browser cookies are enabled
4. Verify `auth()` called in server component

---

## References

- [NextAuth.js v5 Documentation](https://authjs.dev)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [JWT Token Overview](https://jwt.io)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-05 | 1.0 | Initial Phase 02 documentation |

---

**Report Generated**: 2026-01-05 13:34
**Status**: Complete & Ready for Phase 03
