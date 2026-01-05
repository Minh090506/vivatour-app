# Codebase Summary

MyVivaTour Platform - Comprehensive directory structure and implementation details.

**Last Updated**: 2026-01-05 (Phase 04: Login Page)

---

## Directory Structure

```
src/
├── app/                              # Next.js App Router (v16)
│   ├── (auth)/                       # Auth route group (Phase 04)
│   │   ├── login/                    # Login page
│   │   │   ├── page.tsx              # Login page component
│   │   │   ├── login-form.tsx        # LoginForm component with validation
│   │   │   └── __tests__/            # Login tests
│   │   └── layout.tsx                # Auth layout
│   ├── (dashboard)/                  # Dashboard route group
│   │   ├── suppliers/                # Supplier CRUD pages
│   │   ├── layout.tsx                # Dashboard layout
│   │   └── page.tsx                  # Dashboard home
│   ├── api/                          # REST API routes
│   │   ├── auth/                     # NextAuth.js v5 routes
│   │   ├── suppliers/                # Supplier endpoints
│   │   ├── supplier-transactions/    # Transaction endpoints
│   │   └── reports/                  # Report endpoints
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Home page
├── components/
│   ├── ui/                           # shadcn/ui components (22+)
│   ├── layout/                       # Layout components
│   └── suppliers/                    # Feature components
├── lib/
│   ├── db.ts                         # Prisma singleton
│   ├── auth.ts                       # NextAuth.js v5 config
│   ├── supplier-balance.ts           # Balance utilities
│   └── utils.ts                      # Helpers
├── hooks/                            # Custom React hooks
├── stores/                           # Zustand state stores
├── types/                            # TypeScript definitions
├── middleware.ts                     # Route protection
├── auth.ts                           # Auth configuration
└── constants.ts                      # App constants
```

---

## Phase 04: Login Page Implementation

### Components

**src/app/login/page.tsx**
- Server component for /login route
- Centered card layout (Tailwind CSS)
- Vietnamese UI: "MyVivaTour", "Dang nhap de tiep tuc"
- Mobile-responsive design

**src/app/login/login-form.tsx**
- Client component with Suspense boundary
- React Hook Form + Zod validation
- Features:
  - Email & password input fields
  - Form submission via signIn("credentials")
  - Callback URL handling with open redirect protection
  - Toast notifications (sonner)
  - Loading state with spinner
  - Error handling with Vietnamese messages
  - Accessibility: labels, autocomplete

**Key Security Functions**
- `getSafeCallbackUrl()`: Validates callback URL to prevent open redirects
  - Only allows relative paths starting with /
  - Blocks protocol-relative URLs (//)
  - Default fallback to /requests

**Form Validation Schema**
```typescript
loginSchema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(1, "Mat khau bat buoc"),
})
```

**Authentication Flow**
1. User navigates to /login
2. LoginForm renders with Suspense boundary
3. User submits email & password
4. Zod schema validates input
5. signIn("credentials") calls NextAuth.js v5
6. On success: Toast notification, redirect to callback URL or /requests
7. On error: Toast error, form validation messages

### Tests

**src/app/login/__tests__/page.test.tsx**
- Login page component rendering
- Layout structure verification

**src/app/login/__tests__/login-form.test.tsx**
- Form submission behavior
- Input field interactions
- Toast notifications
- Loading states

**src/app/login/__tests__/login-validation.test.ts**
- Zod schema validation
- Email format validation
- Error message accuracy

### Security Features

- Open redirect protection via getSafeCallbackUrl()
- CSRF protection built-in via NextAuth.js v5
- Zod schema validation at client
- Generic error messages (no credential leaks)
- Suspense boundary prevents hydration mismatches
- Password minimal validation at client (server validates)

---

## Authentication Layer Overview

| File | Purpose |
|------|---------|
| src/app/login/page.tsx | Login page routing & layout |
| src/app/login/login-form.tsx | Form with validation & submission |
| src/app/api/auth/[...nextauth]/route.ts | NextAuth.js v5 handler |
| src/auth.ts | NextAuth.js v5 configuration |
| src/middleware.ts | Route protection & redirects |

---

## Tech Stack Summary

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS 4, shadcn/ui (22+ components)
- **Forms**: React Hook Form, Zod
- **Auth**: NextAuth.js v5 with Credentials provider
- **Database**: PostgreSQL (Supabase), Prisma 7 ORM
- **State**: Zustand, React Context
- **Notifications**: Sonner
- **Testing**: Vitest, React Testing Library

---

## Development Patterns

**Component Organization**
- Page components in page.tsx files
- Feature-specific components collocated
- UI components in components/ui/

**Form Handling**
- React Hook Form for state management
- Zod for TypeScript-first validation
- Sonner for toast notifications

**Styling**
- Tailwind CSS utility classes
- shadcn/ui pre-built components
- Mobile-first responsive design

**API Design**
- REST endpoints with standard CRUD
- NextAuth.js v5 for authentication
- Prisma for database queries

**Testing**
- Vitest for unit tests
- React Testing Library for components
- Test coverage for critical paths

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# NextAuth.js v5
NEXTAUTH_SECRET="<generated-secret>"
NEXTAUTH_URL="http://localhost:3000"

# AI & APIs (optional)
ANTHROPIC_API_KEY="sk-ant-xxx"
GOOGLE_SHEETS_API_KEY="xxx"
```

---

## Project Status

| Phase | Component | Status | Date |
|-------|-----------|--------|------|
| 01 | Supplier Module | Complete | 2026-01-01 |
| 02 | Dashboard Layout | Complete | 2026-01-02 |
| 03 | Auth Middleware | Complete | 2026-01-04 |
| 04 | Login Page | Complete | 2026-01-05 |
| 05 | Request Module | Pending | TBD |
| 06+ | Operator, Revenue, AI | Planned | TBD |

