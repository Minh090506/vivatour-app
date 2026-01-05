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
| Status | pending |
| Effort | 30min |

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

- [ ] Create src/app/login/page.tsx
- [ ] Create src/app/login/login-form.tsx
- [ ] Add Zod validation schema
- [ ] Implement signIn('credentials') call
- [ ] Handle error states with toast
- [ ] Add loading state to submit button
- [ ] Handle callbackUrl redirect
- [ ] Verify Toaster in root layout

## Success Criteria

- [ ] /login page renders without errors
- [ ] Form validates email format
- [ ] Form validates required password
- [ ] Invalid credentials show error toast
- [ ] Valid credentials redirect to /requests
- [ ] Loading spinner shows during submission
- [ ] callbackUrl works for deep links

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Toast not showing | Low | Low | Verify Toaster in layout |
| Redirect loop | Medium | Low | Check callbackUrl safety |
| Form state not resetting | Low | Low | Use resetField on error |

## Rollback Plan

1. Delete `src/app/login/page.tsx`
2. Delete `src/app/login/login-form.tsx`
3. Login route becomes 404
