# Phase 04: Login Page

## Context
- **Parent Plan**: `plans/260105-1208-foundation-auth-rbac/plan.md`
- **Dependencies**: Phase 02 (auth config)
- **Blocks**: None (can run in parallel with Phase 03, 05)

## Overview
| Field | Value |
|-------|-------|
| Description | Login page with email/password form, error handling |
| Priority | P1 |
| Status | complete |
| Effort | 30min |
| Completed | 2026-01-05 |
| Review | Code review completed 2026-01-05, security issues resolved |

## Requirements

### R4.1: Login Form
Create `src/app/login/page.tsx` with:
- Email input (validated)
- Password input
- Submit button with loading state
- Error display via toast (sonner)

### R4.2: Form Validation
Use react-hook-form + zod:
```typescript
const schema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(1, "Mat khau bat buoc"),
});
```

### R4.3: Authentication Flow
- Call signIn('credentials') on submit
- Handle errors (invalid credentials)
- Redirect to /requests on success (or callbackUrl)

## Architecture

### Form State Machine
```
Idle → Submitting → Success → Redirect to /requests
           ↓
        Error → Idle (show error toast)
```

### Component Structure
```
LoginPage
└── LoginForm (client component)
    ├── EmailInput
    ├── PasswordInput
    ├── SubmitButton
    └── Toast (error display)
```

## Related Code Files
- `src/app/login/page.tsx` - Login page (CREATE)
- `src/components/ui/input.tsx` - Input component (EXISTS)
- `src/components/ui/button.tsx` - Button component (EXISTS)
- `src/components/ui/label.tsx` - Label component (EXISTS)

## Implementation Steps

### Step 1: Create Login Page
Create `src/app/login/page.tsx`:

```typescript
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">MyVivaTour</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Dang nhap de tiep tuc
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

### Step 2: Create Login Form Component
Create `src/app/login/login-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(1, "Mat khau bat buoc"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/requests";
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Dang nhap that bai", {
          description: "Email hoac mat khau khong dung",
        });
        return;
      }

      toast.success("Dang nhap thanh cong");
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      toast.error("Loi he thong", {
        description: "Vui long thu lai sau",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          autoComplete="email"
          disabled={isLoading}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mat khau</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Dang xu ly...
          </>
        ) : (
          "Dang nhap"
        )}
      </Button>
    </form>
  );
}
```

### Step 3: Verify Toast Provider
Ensure `Toaster` from sonner is in root layout. Check `src/app/layout.tsx`:

```typescript
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

### Step 4: Test Login Flow
1. Navigate to /login
2. Submit empty form → validation errors
3. Submit invalid credentials → toast error
4. Submit valid credentials → redirect to /requests

## Todo List

- [x] Create src/app/login/page.tsx
- [x] Create src/app/login/login-form.tsx
- [x] Add Zod validation schema
- [x] Implement signIn('credentials') call
- [x] Handle error states with toast
- [x] Add loading state to submit button
- [x] Handle callbackUrl redirect (basic implementation)
- [x] Verify Toaster in root layout
- [x] **[CRITICAL]** Fix open redirect vulnerability in callbackUrl validation
- [x] Add security test for malicious callbackUrl
- [x] Add error logging in catch blocks
- [x] Add error boundary for Suspense wrapper

## Success Criteria

- [x] /login page renders without errors
- [x] Form validates email format
- [x] Form validates required password
- [x] Invalid credentials show error toast
- [x] Valid credentials redirect to /requests
- [x] Loading spinner shows during submission
- [x] callbackUrl works for deep links **AND is secure**

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Open redirect via callbackUrl** | **High** | **Medium** | **Validate URL is internal path (BLOCKER)** |
| Toast not showing | Low | Low | Verify Toaster in layout ✓ Done |
| Redirect loop | Medium | Low | Check callbackUrl safety ⚠️ See above |
| Form state not resetting | Low | Low | Use resetField on error |
| Errors not logged | Medium | Low | Add console.error in catch blocks |

## Rollback Plan

1. Delete `src/app/login/page.tsx`
2. Delete `src/app/login/login-form.tsx`
3. Login route becomes 404

---

## Code Review Summary (2026-01-05)

**Report**: `plans/reports/code-reviewer-260105-1537-phase04-login-review.md`

**Status**: In Review - 1 critical security issue blocking production

**Key Findings**:
- ✓ Build passing, all 49 tests passing
- ✓ Architecture follows Next.js 15+ patterns correctly
- ✓ Type safety, accessibility, test coverage all excellent
- ⚠️ **CRITICAL**: Open redirect vulnerability via callbackUrl (OWASP A01)
- ⚠️ Medium: No error logging in catch blocks
- ⚠️ Medium: Missing error boundary around Suspense

**Next Steps**:
1. Fix callbackUrl validation (validate internal paths only)
2. Add test for malicious redirect URLs
3. Add error logging
4. Mark phase complete after security fixes verified
