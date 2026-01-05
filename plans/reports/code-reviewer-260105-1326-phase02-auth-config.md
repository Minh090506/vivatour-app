# Code Review: Phase 02 Auth Config - Foundation Auth RBAC

**Date:** 2026-01-05 13:26
**Reviewer:** code-reviewer
**Scope:** Phase 02 Auth Config implementation
**Plan:** `plans/260105-1208-foundation-auth-rbac/phase-02-auth-config.md`

---

## Scope

**Files reviewed:**
- `src/auth.ts` (100 lines)
- `src/app/api/auth/[...nextauth]/route.ts` (4 lines)
- `.env` (not accessible - privacy-protected)

**Review focus:** Recent Phase 02 implementation (NextAuth.js v5 auth config)

**Updated plans:** `plans/260105-1208-foundation-auth-rbac/phase-02-auth-config.md`

---

## Overall Assessment

**VERDICT: ✅ APPROVE WITH WARNINGS**

Implementation follows NextAuth.js v5 patterns correctly with proper TypeScript type extensions. Code is clean, minimal, adheres to YAGNI/KISS principles. Build passes (✅), tests pass (228/228).

**Critical gaps:** Missing AUTH_SECRET validation, timing attack vulnerability, no auth tests, type declaration module path incorrect.

---

## Critical Issues

### C1: Type Declaration Module Path Incorrect
**Location:** `src/auth.ts:23`
```typescript
declare module "next-auth/jwt" {  // ❌ WRONG
  interface JWT {
```

**Issue:** Module path changed in NextAuth.js v5
- v4 used `"next-auth/jwt"`
- v5 uses `"@auth/core/jwt"`

**Impact:** Type extensions may not apply, causing TypeScript errors when using JWT tokens

**Fix:**
```typescript
declare module "@auth/core/jwt" {  // ✅ CORRECT
  interface JWT {
    id: string;
    role: RoleType;
  }
}
```

**Reference:** Phase plan line 104 uses correct path `"next-auth/jwt"` but should be `"@auth/core/jwt"`

---

### C2: AUTH_SECRET Not Validated
**Location:** `src/auth.ts`

**Issue:** No runtime validation that AUTH_SECRET exists/has minimum length

**Impact:** App crashes with cryptic errors at runtime if SECRET missing or weak

**Security risk:** Weak secrets (< 32 chars) vulnerable to brute force

**Fix:** Add validation before NextAuth initialization:
```typescript
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error(
    'AUTH_SECRET must be set and at least 32 characters. ' +
    'Generate: openssl rand -base64 32'
  );
}
```

---

### C3: Timing Attack Vulnerability in Password Comparison
**Location:** `src/auth.ts:57-60`

**Issue:** Sequential checks leak information via timing
```typescript
const isValid = await compare(
  credentials.password as string,
  user.password
);

if (!isValid) {
  return null;
}
```

**Attack vector:**
1. Invalid email → fast response (no DB lookup)
2. Valid email + wrong password → slow response (bcrypt compare)
3. Attacker can enumerate valid emails via timing analysis

**Severity:** Medium (requires network timing precision)

**Fix:** Always run bcrypt comparison even if user not found:
```typescript
// Constant-time lookup
const user = await prisma.user.findUnique({...});
const hashedPassword = user?.password ??
  "$2a$10$dummyHashToPreventTimingAttack123456"; // dummy bcrypt hash

const isValid = await compare(
  credentials.password as string,
  hashedPassword
);

if (!user || !user.password || !isValid) {
  return null;
}
```

---

## High Priority Findings

### H1: Missing Type Import for RoleType
**Location:** `src/auth.ts:6`

**Issue:** `RoleType` defined locally instead of importing from Prisma
```typescript
type RoleType = "ADMIN" | "SELLER" | "ACCOUNTANT" | "OPERATOR";
```

**Problem:** Duplicates schema definition, risks drift if schema changes

**Better approach:**
```typescript
import type { Role } from "@prisma/client";
type RoleType = Role;
```

**Rationale:** Single source of truth (Prisma schema), type-safe

---

### H2: Prisma Import Uses Wrong Alias
**Location:** `src/auth.ts:4`

**Issue:**
```typescript
import { prisma } from "@/lib/db";
```

**Inconsistency:** Project uses `db` export from `src/lib/db.ts`:
```typescript
export const prisma = ...
export default prisma;
```

**Current code works** but violates project pattern

**Standard pattern per `docs/code-standards.md:273`:**
```typescript
import { prisma } from '@/lib/db';
```

**Verdict:** Actually CORRECT as-is. No change needed.

---

### H3: No Password Hash Verification (Edge Case)
**Location:** `src/auth.ts:53-54`

**Issue:**
```typescript
if (!user || !user.password) {
  return null;
}
```

**Edge case:** If password field exists but is empty string `""` (not null), code proceeds to bcrypt comparison which throws error

**Likelihood:** Low (schema allows `String?` so empty string unlikely)

**Fix:**
```typescript
if (!user || !user.password || user.password.trim() === "") {
  return null;
}
```

---

### H4: Missing Rate Limiting
**Location:** `src/auth.ts` (authorize function)

**Issue:** No brute-force protection on login attempts

**Attack scenario:** Attacker can make unlimited login attempts

**Severity:** High for production

**Mitigation:** Add in Phase 03 (middleware) or Phase 07 (integration):
- Use `next-rate-limit` or similar
- Limit to 5 attempts per IP per 15 minutes
- Lock account after 10 failed attempts

**Note:** Not required for Phase 02, document for future

---

### H5: No Test Coverage for Auth Module
**Location:** `src/__tests__/` (missing auth tests)

**Issue:** 0% coverage on auth.ts and [...nextauth]/route.ts

**Tests needed:**
1. Valid credentials → returns user with role
2. Invalid email → returns null
3. Invalid password → returns null
4. Missing credentials → returns null
5. User without password → returns null
6. JWT callback stores id/role
7. Session callback exposes id/role

**Priority:** High before Phase 07 integration

---

## Medium Priority Improvements

### M1: Hardcoded Session Duration
**Location:** `src/auth.ts:77`

**Issue:**
```typescript
maxAge: 24 * 60 * 60, // 24 hours per validation
```

**Comment unclear:** "per validation" - what does this mean?

**Better approach:**
```typescript
maxAge: 24 * 60 * 60, // 24 hours - user must re-login daily
```

**Improvement:** Extract to environment variable:
```typescript
maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400"), // Default 24h
```

**Verdict:** Current implementation acceptable for MVP, document for Phase 07

---

### M2: Type Assertions Without Runtime Checks
**Location:** `src/auth.ts:86, 94`

**Issue:**
```typescript
token.id = user.id as string;
session.user.id = token.id as string;
```

**Problem:** Type assertions bypass TypeScript safety

**Better approach:** Runtime validation:
```typescript
if (user && typeof user.id === "string") {
  token.id = user.id;
  token.role = user.role;
}
```

**Severity:** Low (Prisma guarantees id is string)

---

### M3: No Logging for Failed Login Attempts
**Location:** `src/auth.ts:62-64`

**Issue:**
```typescript
if (!isValid) {
  return null; // Silent failure
}
```

**Missing:** Security audit log

**Add:**
```typescript
if (!isValid) {
  console.warn(`Failed login attempt for email: ${credentials.email}`);
  return null;
}
```

**Note:** Be careful not to log passwords

---

### M4: Error Redirect Configuration Simplification
**Location:** `src/auth.ts:79-82`

**Current:**
```typescript
pages: {
  signIn: "/login",
  error: "/login",
},
```

**Issue:** Error page redirects to login, losing error context

**Better:**
```typescript
pages: {
  signIn: "/login",
  error: "/login?error=true",
},
```

**Impact:** Low (error handling can be added in login page later)

---

## Low Priority Suggestions

### L1: Add JSDoc Documentation
**Location:** `src/auth.ts:30`

**Suggestion:**
```typescript
/**
 * NextAuth.js v5 configuration with CredentialsProvider
 *
 * Implements JWT-based sessions with 4-role RBAC:
 * - ADMIN: Full system access
 * - SELLER: Manage requests, view own operators
 * - ACCOUNTANT: Financial reports, lock periods
 * - OPERATOR: Service entry, cost tracking
 *
 * Session duration: 24 hours
 * Password hashing: bcrypt
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
```

---

### L2: Extract Database Query to Separate Function
**Location:** `src/auth.ts:42-51`

**Current:** Query inline in authorize callback

**Better pattern:**
```typescript
async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
    },
  });
}
```

**Benefits:** Testable, reusable, follows code-standards.md separation of concerns

---

### L3: Route Handler Could Export Runtime Config
**Location:** `src/app/api/auth/[...nextauth]/route.ts`

**Current:**
```typescript
export const { GET, POST } = handlers;
```

**Optional addition:**
```typescript
export const runtime = 'nodejs'; // Explicit runtime
```

**Impact:** Negligible (Next.js defaults to nodejs)

---

## Positive Observations

✅ **YAGNI compliance:** Minimal config, no over-engineering
✅ **KISS principle:** Clean 100-line implementation
✅ **Type safety:** Proper module augmentation for Session/JWT
✅ **NextAuth.js v5 patterns:** Correct use of new API
✅ **Prisma select:** Only fetches needed fields (performance)
✅ **JWT strategy:** Stateless auth, good for scaling
✅ **Password security:** bcrypt with default 10 rounds
✅ **Build passes:** No TypeScript compilation errors
✅ **Zero regressions:** All 228 existing tests pass

---

## Architecture Review

### Security (OWASP Top 10)

| Risk | Status | Notes |
|------|--------|-------|
| **A01: Broken Access Control** | ⚠️ Partial | Role stored in JWT, no enforcement yet (Phase 05) |
| **A02: Cryptographic Failures** | ⚠️ Warning | AUTH_SECRET not validated, potential weak secrets |
| **A03: Injection** | ✅ Safe | Prisma ORM prevents SQL injection |
| **A04: Insecure Design** | ✅ Safe | JWT strategy appropriate for stateless auth |
| **A05: Security Misconfiguration** | ⚠️ Warning | No rate limiting, no audit logging |
| **A07: Auth Failures** | ⚠️ Timing | Timing attack vector in password check |
| **A08: Data Integrity** | ✅ Safe | JWT signed with SECRET |
| **A09: Logging Failures** | ❌ Missing | No failed login attempt logging |

---

### Performance

| Aspect | Rating | Analysis |
|--------|--------|----------|
| **JWT size** | ✅ Excellent | Only 3 fields (id, role, email) ~150 bytes |
| **DB queries** | ✅ Optimal | Single findUnique with select |
| **Bcrypt rounds** | ✅ Standard | Default 10 rounds (~65ms) |
| **Session strategy** | ✅ Fast | Stateless JWT, no DB lookup |

**Token size calculation:**
```json
{
  "sub": "clxxxx", // ~10 chars
  "email": "user@example.com", // ~20 chars
  "role": "SELLER", // ~6 chars
  "iat": 1234567890,
  "exp": 1234567890
}
```
Total: ~150 bytes encoded → ~200 bytes base64 → acceptable

---

### Type Safety

✅ **Session.user.role:** TypeScript recognizes 4-role enum
✅ **JWT.role:** Type-safe token payload
✅ **User.role:** Prisma type enforced
❌ **Module path:** `"next-auth/jwt"` should be `"@auth/core/jwt"`

---

## YAGNI/KISS/DRY Compliance

### ✅ YAGNI Wins
- No unused features
- No premature optimization
- JWT strategy (not database sessions)
- Hardcoded permissions (not DB table)

### ✅ KISS Wins
- 100-line auth config
- 4-line route handler
- Minimal dependencies

### ⚠️ DRY Violation
- `RoleType` duplicates Prisma `Role` enum
- Fix: Import from `@prisma/client`

---

## Metrics

| Metric | Value |
|--------|-------|
| **Lines of Code** | 104 (auth.ts + route.ts) |
| **TypeScript Errors** | 0 (build passes) |
| **Test Coverage** | 0% (no auth tests) |
| **Build Time** | 5.6s (no slowdown) |
| **Test Execution** | 4.49s (228 tests pass) |
| **Linting Issues** | 0 (eslint passes) |

---

## Plan Status Update

### Phase 02 Todo List Status

- [x] Create src/auth.ts with CredentialsProvider
- [x] Add type declarations for Session/JWT
- [x] Configure JWT callbacks (jwt, session)
- [x] Create src/app/api/auth/[...nextauth]/route.ts
- [⚠️] Add AUTH_SECRET to .env (NOT VERIFIED - privacy-protected)
- [x] Verify TypeScript compilation passes

### Success Criteria

- [x] `src/auth.ts` exports: handlers, signIn, signOut, auth
- [⚠️] API route responds at /api/auth/signin (NOT TESTED)
- [⚠️] JWT token contains role field (NOT TESTED)
- [⚠️] Session object contains user.role (NOT TESTED)
- [x] TypeScript recognizes session.user.role type
- [x] No TS errors in auth.ts

---

## Recommended Actions

### Must Fix Before Production

1. **Fix C1:** Change module path to `"@auth/core/jwt"`
2. **Fix C2:** Add AUTH_SECRET validation with clear error
3. **Fix C3:** Implement constant-time password comparison
4. **Add H5:** Write comprehensive auth tests (7 test cases minimum)

### Should Fix Before Phase 07

1. **H1:** Import `Role` from Prisma instead of redefining
2. **H4:** Add rate limiting documentation/planning
3. **M3:** Add failed login attempt logging

### Nice to Have

1. **L1:** Add JSDoc documentation
2. **L2:** Extract user lookup to separate function
3. **M1:** Extract session duration to env var

---

## Rollback Plan

If critical issues block Phase 03:

1. Revert commit `2ee41e5` (auth implementation)
2. Remove `src/auth.ts`
3. Remove `src/app/api/auth/[...nextauth]/route.ts`
4. Remove AUTH_SECRET from .env
5. Downgrade next-auth if needed

**Risk:** Low (changes isolated, no consumers yet)

---

## Summary

Phase 02 implementation is **production-ready with fixes**. Code follows NextAuth.js v5 patterns, adheres to YAGNI/KISS, and causes zero regressions.

**Critical issues:** Type module path, AUTH_SECRET validation, timing attack. All fixable in < 30 minutes.

**Major gap:** Zero test coverage. Must add before Phase 07 integration.

**Verdict:** ✅ Approve with mandatory fixes (C1, C2, C3) + test coverage (H5)

---

## Unresolved Questions

1. Is AUTH_SECRET properly set in .env? (Cannot verify - privacy-protected)
2. Should rate limiting be Phase 03 (middleware) or Phase 07 (integration)?
3. Will auth tests be added as separate task or part of Phase 07?
4. Should failed login attempts be logged to DB or just console?
5. Production deployment target - edge runtime or Node.js?
