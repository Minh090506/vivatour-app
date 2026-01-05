# Phase 1: Foundation - Authentication & Layout

## Context

- Parent: [plan.md](./plan.md)
- Research: [Auth RBAC Report](./research/researcher-auth-rbac-report.md), [UI Patterns Report](./research/researcher-ui-patterns-report.md)

## Overview

| Field | Value |
|-------|-------|
| Description | Setup NextAuth.js v5, RBAC middleware, MasterDetailLayout, SlideInPanel |
| Priority | P1 - Critical foundation |
| Status | Pending |
| Review | Not started |

## Key Insights from Research

1. **Auth.js v5**: Use `AUTH_` env prefix, JWT callbacks for role extension
2. **Credentials Provider**: bcrypt for password hashing, authorize() validates
3. **Middleware**: Route-level protection with `req.auth?.token.role`
4. **Permission hooks**: Component-level access via `usePermission()`
5. **Master-Detail**: Use `key` prop on detail for state reset, URL sync for persistence

## Requirements

### R1: Authentication System
- Email/password login via NextAuth.js v5
- JWT-based sessions (stateless)
- Password field in User model (bcrypt hashed)
- Login page at `/login`

### R2: Role-Based Access Control
- 4 roles: ADMIN, SELLER, OPERATOR, ACCOUNTANT
- Middleware protects routes by role
- `usePermission()` hook for component-level
- API routes check session.user.role

### R3: MasterDetailLayout Component
- Resizable 40-60 split (react-resizable-panels)
- Mobile: Sheet overlay from right
- URL sync via searchParams
- Persist panel widths to localStorage

### R4: SlideInPanel Component
- Wrapper around shadcn Sheet
- Responsive width (w-[400px] sm:w-[540px] md:w-[600px])
- Close on Escape, backdrop click

## Architecture Decisions

### AD1: JWT over Database Sessions
- **Why**: Stateless scaling, no DB lookup per request
- **Trade-off**: Cannot invalidate tokens server-side (mitigate with short expiry)

### AD2: Centralized Permission Config
```typescript
const PERMISSIONS = {
  Admin: ['*'],
  Seller: ['request:create', 'request:edit_own', 'operator:view'],
  Operator: ['operator:claim', 'operator:edit_claimed', 'request:view'],
  Accountant: ['revenue:manage', 'expense:manage', 'operator:approve']
};
```

### AD3: Responsive Layout Strategy
- Desktop (>768px): `react-resizable-panels` side-by-side
- Mobile: Full list → Sheet detail overlay
- Breakpoint detection via `useMediaQuery` or Tailwind classes

## Related Code Files

**Existing (to modify):**
- `prisma/schema.prisma` - Add OPERATOR role, password field
- `src/app/(dashboard)/layout.tsx` - Wrap with auth check
- `src/components/ui/sheet.tsx` - Already exists, extend

**New files:**
- `src/auth.ts` - Auth.js config
- `src/middleware.ts` - Route protection
- `src/app/login/page.tsx` - Login form
- `src/hooks/usePermission.ts` - Permission hook
- `src/components/layouts/MasterDetailLayout.tsx`
- `src/components/layouts/SlideInPanel.tsx`
- `src/lib/permissions.ts` - Permission config

## Implementation Steps

### Step 1: Schema Updates
```bash
# Add to prisma/schema.prisma
```
```prisma
enum Role {
  ADMIN
  SELLER
  OPERATOR    // NEW
  ACCOUNTANT
}

model User {
  // ... existing
  password String?  // NEW - bcrypt hashed
}
```

### Step 2: Install Dependencies
```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

### Step 3: Auth Configuration
Create `src/auth.ts`:
- CredentialsProvider with email/password
- JWT callback: store role in token
- Session callback: expose role in session
- Type declarations for Session/JWT

### Step 4: Environment Variables
```env
AUTH_SECRET=<generate 32+ char secret>
AUTH_URL=http://localhost:3000
```

### Step 5: Route Handler
Create `src/app/api/auth/[...nextauth]/route.ts`:
- Export GET, POST handlers from auth.ts

### Step 6: Middleware
Create `src/middleware.ts`:
```typescript
const roleRoutes = {
  '/requests': ['Admin', 'Seller', 'Operator', 'Accountant'],
  '/operators': ['Admin', 'Operator', 'Accountant'],
  '/revenue': ['Admin', 'Accountant'],
  '/expense': ['Admin', 'Accountant'],
  '/settings': ['Admin'],
};
```

### Step 7: Login Page
Create `src/app/login/page.tsx`:
- Email + password form
- `signIn('credentials')` action
- Redirect to `/requests` on success
- Error toast for invalid credentials

### Step 8: Permission Hook
Create `src/hooks/usePermission.ts`:
```typescript
export function usePermission() {
  const { data: session } = useSession();
  return {
    can: (permission: string) => checkPermission(session?.user?.role, permission),
    role: session?.user?.role,
    isAdmin: session?.user?.role === 'Admin'
  };
}
```

### Step 9: MasterDetailLayout
Create `src/components/layouts/MasterDetailLayout.tsx`:
- Props: children (master, detail slots), selectedId
- Desktop: PanelGroup with 40-60 default
- Mobile: Render master only, detail via SlideInPanel

### Step 10: SlideInPanel
Create `src/components/layouts/SlideInPanel.tsx`:
- Props: isOpen, onClose, title, children
- Uses shadcn Sheet internally
- Responsive width classes

### Step 11: Seed Admin User
Create migration script to add initial admin:
```typescript
await prisma.user.create({
  data: {
    email: 'admin@vivatour.vn',
    name: 'Admin',
    role: 'ADMIN',
    password: await hash('changeme123', 10)
  }
});
```

### Step 12: Update Dashboard Layout
Modify `src/app/(dashboard)/layout.tsx`:
- Wrap with SessionProvider
- Check auth status, redirect if unauthenticated

## Todo List

- [ ] Update schema with OPERATOR role and password field
- [ ] Run prisma migrate
- [ ] Install next-auth@beta, bcryptjs
- [ ] Create src/auth.ts with credentials provider
- [ ] Add AUTH_SECRET to .env
- [ ] Create [...nextauth]/route.ts handler
- [ ] Create middleware.ts with role checks
- [ ] Create login page with form
- [ ] Create usePermission hook
- [ ] Create MasterDetailLayout component
- [ ] Create SlideInPanel component
- [ ] Seed admin user
- [ ] Update dashboard layout with SessionProvider
- [ ] Test login flow end-to-end
- [ ] Test role-based route protection

## Success Criteria

- [ ] User can login with email/password
- [ ] JWT contains user role
- [ ] Unauthorized routes redirect to /login
- [ ] Forbidden routes show 403
- [ ] MasterDetailLayout renders 40-60 on desktop
- [ ] SlideInPanel slides from right on mobile
- [ ] usePermission correctly checks permissions

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Password migration for existing users | Medium | Seed new passwords, force reset |
| JWT token too large | Low | Only store essential claims |
| Mobile layout breaks existing | Medium | Feature flag for gradual rollout |

## Security Considerations

- Store AUTH_SECRET in env, never commit
- Use bcrypt with cost factor 10-12
- Set JWT maxAge to 24h
- Implement CSRF via Auth.js built-in
- Sanitize credentials input
- Rate limit login attempts (future)

## Next Steps

After Phase 1 completion:
1. Proceed to [Phase 2](./phase-02-core-ui-redesign.md)
2. Migrate existing requests page to MasterDetailLayout
3. Implement claim mechanism for Operator
