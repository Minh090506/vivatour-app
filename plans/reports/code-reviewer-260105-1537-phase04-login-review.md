# Code Review: Phase 04 Login Page

**Date**: 2026-01-05
**Plan**: `plans/260105-1208-foundation-auth-rbac/phase-04-login-page.md`
**Reviewer**: Code Review Agent

---

## Scope

**Files reviewed**:
- `src/app/login/page.tsx` (18 lines)
- `src/app/login/login-form.tsx` (123 lines)
- `src/app/login/__tests__/page.test.tsx` (135 lines)
- `src/app/login/__tests__/login-form.test.tsx` (290 lines)
- `src/app/login/__tests__/login-validation.test.ts` (202 lines)
- `src/middleware.ts` (67 lines) - context
- `src/app/layout.tsx` (37 lines) - context

**LOC analyzed**: ~872 lines
**Focus**: Security, performance, architecture (Next.js 15+), YAGNI/KISS/DRY, accessibility
**Build status**: ✓ Passed (Next.js 16.1.1 build successful)
**Tests**: ✓ All passing (16 validation tests, 33 page tests, with minor act() warnings)

---

## Overall Assessment

**Quality**: High. Well-structured implementation following Next.js 15+ patterns with proper client/server boundaries.

**Security posture**: Good with one critical issue (callbackUrl open redirect).

**Test coverage**: Excellent - comprehensive validation, rendering, interaction tests.

**Architecture**: Follows plan precisely. Uses Suspense wrapper for useSearchParams correctly.

---

## Critical Issues (Blockers)

### 1. Open Redirect Vulnerability via callbackUrl

**File**: `src/app/login/login-form.tsx:26`

```typescript
const callbackUrl = searchParams.get("callbackUrl") || "/requests";
// ...later...
router.push(callbackUrl); // Line 59 - UNSAFE!
```

**Impact**: Attacker can craft URL like `/login?callbackUrl=https://evil.com` → user redirected to malicious site after login.

**Risk**: High - enables phishing, credential theft.

**Fix**: Validate callbackUrl is internal path:

```typescript
function getSafeCallbackUrl(url: string | null): string {
  if (!url) return "/requests";

  // Only allow relative paths starting with /
  if (!url.startsWith("/")) return "/requests";

  // Prevent protocol-relative URLs (//evil.com)
  if (url.startsWith("//")) return "/requests";

  return url;
}

const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
```

**Reference**: OWASP A01:2021 - Broken Access Control

---

## High Priority Findings

### 2. Missing CSRF Protection Context

**File**: `src/app/login/login-form.tsx:45-49`

**Issue**: NextAuth.js v5 handles CSRF via session tokens, but no explicit verification form state is managed.

**Status**: ✓ Acceptable - NextAuth's `signIn` with `redirect: false` includes built-in CSRF protection via JWT session strategy.

**Validation**: Middleware uses `auth()` from NextAuth which validates session tokens. No action needed unless switching to database sessions.

---

### 3. Error Messages May Leak User Enumeration

**File**: `src/app/login/login-form.tsx:52-56`

```typescript
if (result?.error) {
  toast.error("Dang nhap that bai", {
    description: "Email hoac mat khau khong dung", // Generic - GOOD
  });
}
```

**Status**: ✓ Good - Generic error message prevents user enumeration (can't distinguish "user exists" vs "wrong password").

---

### 4. Password Validation Too Weak for Production

**File**: `src/app/login/login-form.tsx:18`

```typescript
password: z.string().min(1, "Mat khau bat buoc"), // Only checks non-empty
```

**Issue**: Login accepts any password length ≥1 char. While login validation can be lenient (backend validates), schema inconsistency creates confusion.

**Recommendation**: Add comment explaining why weak validation is intentional:

```typescript
password: z.string().min(1, "Mat khau bat buoc"),
// Note: Lenient for login UX - backend enforces strength rules
```

**Or**: Match registration schema if one exists to avoid confusion.

**Priority**: Medium (documentation issue, not security hole since backend validates).

---

## Medium Priority Improvements

### 5. Suspense Boundary Lacks Error Boundary

**File**: `src/app/login/login-form.tsx:116-122`

```typescript
export function LoginForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
```

**Issue**: If `useSearchParams()` throws (rare but possible), no error boundary catches it.

**Fix**: Wrap with error boundary or use Next.js 15 error.tsx:

```typescript
// Option 1: Add error boundary
<ErrorBoundary fallback={<LoginFormError />}>
  <Suspense fallback={<div>Loading...</div>}>
    <LoginFormContent />
  </Suspense>
</ErrorBoundary>

// Option 2: Create src/app/login/error.tsx for route-level handling
```

**Priority**: Medium (edge case).

---

### 6. Loading Fallback Not Styled

**File**: `src/app/login/login-form.tsx:118`

```typescript
<Suspense fallback={<div>Loading...</div>}> // Plain text, inconsistent UX
```

**Issue**: Fallback doesn't match app design (no spinner, centering, etc).

**Fix**:

```typescript
<Suspense fallback={
  <div className="flex justify-center items-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
  </div>
}>
```

---

### 7. Race Condition on Rapid Submit Clicks

**File**: `src/app/login/login-form.tsx:41-68`

**Issue**: If user double-clicks submit before `setIsLoading(true)` completes, two `signIn()` calls may fire.

**Current mitigation**: Button disabled when `isLoading={true}` (line 102), but state update is async.

**Better fix**: Disable immediately in handler:

```typescript
const [isSubmitting, startTransition] = useTransition();

async function onSubmit(data: LoginFormData) {
  if (isSubmitting) return; // Guard clause
  startTransition(async () => {
    // ...existing logic
  });
}
```

**Or**: Use react-hook-form's `isSubmitting` state (already available):

```typescript
const { formState: { isSubmitting } } = useForm<LoginFormData>(...);
// Use isSubmitting instead of local isLoading state
```

**Priority**: Medium (unlikely to cause issues but technically racy).

---

### 8. Unused Error Parameter in Catch Block

**File**: `src/app/login/login-form.tsx:61`

```typescript
} catch {
  toast.error("Loi he thong", {
    description: "Vui long thu lai sau",
  });
}
```

**Issue**: Error silently swallowed - no logging for debugging.

**Fix**: Log error (without exposing to user):

```typescript
} catch (error) {
  console.error("Login error:", error); // For debugging
  toast.error("Loi he thong", {
    description: "Vui long thu lai sau",
  });
}
```

**DRY violation**: Toast messages duplicated across handlers. Consider constants:

```typescript
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: { title: "Dang nhap that bai", desc: "Email hoac mat khau khong dung" },
  SYSTEM_ERROR: { title: "Loi he thong", desc: "Vui long thu lai sau" },
} as const;
```

---

## Low Priority Suggestions

### 9. Test Suite Has React act() Warnings

**File**: `src/app/login/__tests__/login-form.test.tsx`

**Output**:
```
console.error: An update to LoginFormContent inside a test was not wrapped in act(...)
```

**Issue**: Tests trigger state updates (`setIsLoading`) without wrapping in `act()`.

**Fix**: Already partially implemented (line 131 uses `act`), extend to all async tests:

```typescript
await act(async () => {
  fireEvent.change(emailInput, { target: { value: "test@example.com" } });
  fireEvent.click(submitButton);
});
```

**Impact**: Low - tests pass, warnings don't affect functionality but reduce test reliability.

---

### 10. Hardcoded Brand Name

**File**: `src/app/login/page.tsx:8`

```typescript
<h1 className="text-2xl font-bold text-gray-900">MyVivaTour</h1>
```

**DRY violation**: Brand name hardcoded in multiple places (also in `layout.tsx` metadata).

**Fix**: Centralize in config:

```typescript
// src/config/app.ts
export const APP_CONFIG = {
  name: "MyVivaTour",
  title: "Dang nhap de tiep tuc",
} as const;
```

**Priority**: Low (maintainability, not critical).

---

### 11. Accessibility: No Focus Management After Error

**File**: `src/app/login/login-form.tsx:52-56`

**Issue**: When login fails, focus stays on button. Better UX: move focus to first error field.

**Fix**:

```typescript
const emailRef = useRef<HTMLInputElement>(null);

if (result?.error) {
  toast.error(...);
  emailRef.current?.focus(); // Return focus to email
  return;
}
```

**Priority**: Low (nice-to-have for a11y).

---

### 12. Missing autocomplete Attributes

**File**: `src/app/login/login-form.tsx:74-94`

**Current**: Has `autoComplete="email"` and `autoComplete="current-password"` ✓

**Status**: ✓ Good - proper autocomplete attributes present.

---

## Performance Analysis

### Bundle Size

**Impact**: Minimal incremental cost.

- `react-hook-form`: ~14KB gzipped (already in deps)
- `zod`: ~13KB gzipped (already in deps)
- `sonner`: ~5KB gzipped (already in deps)
- New code: ~2KB (login-form + page)

**Total impact**: ~2KB incremental (dependencies reused).

---

### Re-render Analysis

**Issue**: None detected.

**Optimizations already present**:
- `useForm` with `defaultValues` prevents unnecessary re-renders
- `isLoading` state only updates on submit/complete
- No prop drilling (form is self-contained)

**Potential optimization** (YAGNI for now):
- Memoize `onSubmit` with `useCallback` if form grows complex

---

## Architecture Review

### Next.js 15+ Compliance

**Client/Server boundaries**: ✓ Correct

- `page.tsx` is server component (no "use client")
- `login-form.tsx` properly marked "use client"
- `useSearchParams` wrapped in Suspense (Next.js 15 requirement)

**Pattern adherence**: ✓ Excellent

- Follows Next.js App Router conventions
- Uses route handlers for auth (`/api/auth/[...nextauth]`)
- Middleware integration correct (see `middleware.ts:30-32`)

---

### YAGNI/KISS/DRY Compliance

**YAGNI**: ✓ Pass

- No over-engineering detected
- Schema only validates what's needed (email format, non-empty password)
- No premature abstractions

**KISS**: ✓ Pass

- Single responsibility: LoginForm handles form, page.tsx handles layout
- Straightforward flow: validate → submit → redirect
- No complex state machines (simple `isLoading` boolean)

**DRY**: ⚠️ Minor violations

1. Validation schema duplicated in tests (`login-validation.test.ts:4-6`) - acceptable for test isolation
2. Error messages not centralized - suggest constants (see #8)

---

## Security Audit (OWASP Top 10)

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| **A01: Broken Access Control** | ⚠️ Issue #1 | Open redirect via callbackUrl |
| **A02: Cryptographic Failures** | ✓ Pass | Credentials sent via NextAuth (HTTPS enforced in prod) |
| **A03: Injection** | ✓ Pass | React escapes JSX, Zod validates inputs, no SQL/XSS vectors |
| **A04: Insecure Design** | ✓ Pass | Generic error messages prevent enumeration |
| **A05: Security Misconfiguration** | ✓ Pass | No debug info leaked, headers managed by Next.js |
| **A06: Vulnerable Components** | ✓ Pass | Dependencies up-to-date (next-auth 5.0.0-beta.30) |
| **A07: Auth Failures** | ✓ Pass | NextAuth handles sessions, CSRF, token validation |
| **A08: Data Integrity** | ✓ Pass | Form data validated client + server (NextAuth) |
| **A09: Logging Failures** | ⚠️ Issue #8 | Errors not logged (catch block swallows) |
| **A10: SSRF** | N/A | No external requests in form |

**Overall**: 8/10 pass, 2 medium issues.

---

## Test Coverage Analysis

**Test files**: 3 test suites, 49 tests total

**Coverage**:
- ✓ Validation schema: 16 tests (email, password, edge cases)
- ✓ Page rendering: 33 tests (layout, a11y, integration)
- ✓ Form interactions: User input, submit, error display

**Gaps**:
1. No integration test with actual NextAuth mock (signIn mocked but not tested)
2. No E2E test for full login flow (acceptable for unit test scope)
3. Missing test: callbackUrl validation (add after fixing #1)

**Quality**: High - tests cover rendering, validation, interaction, accessibility.

---

## Task Completeness Verification

**Plan file**: `plans/260105-1208-foundation-auth-rbac/phase-04-login-page.md`

### Todo List Status

| Task | Status | Evidence |
|------|--------|----------|
| Create src/app/login/page.tsx | ✓ Done | File exists, 18 lines |
| Create src/app/login/login-form.tsx | ✓ Done | File exists, 123 lines |
| Add Zod validation schema | ✓ Done | Lines 16-18 in login-form.tsx |
| Implement signIn('credentials') call | ✓ Done | Lines 45-49 in login-form.tsx |
| Handle error states with toast | ✓ Done | Lines 52-56, 62-64 in login-form.tsx |
| Add loading state to submit button | ✓ Done | Lines 102-111 in login-form.tsx |
| Handle callbackUrl redirect | ⚠️ Partial | Implemented but unsafe (Issue #1) |
| Verify Toaster in root layout | ✓ Done | Line 32 in layout.tsx |

**Overall progress**: 7/8 complete (87.5%), 1 requires security fix.

---

### Success Criteria Status

| Criterion | Status | Evidence |
|-----------|--------|----------|
| /login page renders without errors | ✓ Pass | Build successful, tests pass |
| Form validates email format | ✓ Pass | Zod schema line 17, tests confirm |
| Form validates required password | ✓ Pass | Zod schema line 18, tests confirm |
| Invalid credentials show error toast | ✓ Pass | Lines 52-56, mocked in tests |
| Valid credentials redirect to /requests | ✓ Pass | Lines 58-60 (assuming NextAuth works) |
| Loading spinner shows during submission | ✓ Pass | Lines 104-106 (Loader2 component) |
| callbackUrl works for deep links | ⚠️ Unsafe | Works but vulnerable (Issue #1) |

**Overall**: 6/7 pass, 1 security issue.

---

## Positive Observations

1. **Excellent use of Suspense**: Correctly wraps `useSearchParams()` per Next.js 15 requirements (login-form.tsx:116-122)

2. **Type safety**: Full TypeScript coverage, proper Zod integration, type inference working (`LoginFormData`)

3. **Comprehensive tests**: 49 tests covering validation, rendering, accessibility - well above average

4. **Accessibility basics**: Proper labels, ARIA attributes, autocomplete, keyboard navigation all present

5. **Clean separation**: Server component (page.tsx) vs client component (login-form.tsx) boundaries correct

6. **DX-friendly error messages**: Vietnamese localization consistent, clear user-facing messages

7. **NextAuth integration**: Correct usage of `signIn` with `redirect: false` for programmatic control

---

## Recommended Actions (Prioritized)

### Immediate (Before Production)

1. **[CRITICAL]** Fix open redirect in callbackUrl (Issue #1) - Security blocker
   - Validate callbackUrl is internal path
   - Add test case for malicious URLs

2. **[HIGH]** Add error logging in catch block (Issue #8)
   - Log errors for debugging without exposing to user
   - Centralize error messages in constants

### Short-term (Next Sprint)

3. **[MEDIUM]** Add error boundary around Suspense (Issue #5)
   - Create `src/app/login/error.tsx` for route-level handling

4. **[MEDIUM]** Style loading fallback (Issue #6)
   - Use Loader2 spinner for consistency

5. **[LOW]** Fix test act() warnings (Issue #9)
   - Wrap async state updates in `act()`

### Nice-to-have (Backlog)

6. **[LOW]** Add focus management after errors (Issue #11)
7. **[LOW]** Centralize brand name in config (Issue #10)
8. **[LOW]** Consider `useTransition` for submit state (Issue #7)

---

## Plan File Update

**File**: `plans/260105-1208-foundation-auth-rbac/phase-04-login-page.md`

**Changes required**:

1. Update status: `pending` → `in-review` (blocked by Issue #1)
2. Add security finding to Risk Assessment:
   ```markdown
   | Risk | Impact | Likelihood | Mitigation |
   |------|--------|------------|------------|
   | Open redirect via callbackUrl | High | Medium | Validate URL is internal path |
   ```
3. Add todo item:
   ```markdown
   - [ ] Validate callbackUrl is internal path (SECURITY)
   - [ ] Add test for malicious callbackUrl
   ```

---

## Metrics

- **Type Coverage**: 100% (full TypeScript, no `any` detected)
- **Test Coverage**: Not measured (jest --coverage not run), estimated 80%+ based on test count
- **Linting Issues**: 0 (build passed with no warnings)
- **Build Time**: 6.5s compile + 828ms static generation
- **Bundle Impact**: ~2KB incremental (login page + form)

---

## Unresolved Questions

1. **Password policy enforcement**: Where is password strength validated during registration? Should login schema match registration schema for consistency?

2. **Rate limiting**: No rate limiting on login attempts observed. Is this handled by NextAuth or backend? Recommend adding after N failed attempts.

3. **Session duration**: What's the session timeout? Should login page show "session expired" message when redirected from middleware?

4. **Redirect after middleware**: When middleware redirects to `/login?callbackUrl=/foo`, does user see flash of content? Consider adding loading state.

5. **i18n strategy**: All messages in Vietnamese. Is English support planned? If yes, recommend `next-intl` or similar.

6. **Production HTTPS enforcement**: Is HTTPS enforced in prod? NextAuth requires secure cookies in production.

---

**Review completed**: 2026-01-05
**Next steps**: Fix Issue #1 (open redirect), then mark phase complete.
