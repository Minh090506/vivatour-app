# Phase 07: Integration

## Context
- **Parent Plan**: `plans/260105-1208-foundation-auth-rbac/plan.md`
- **Dependencies**: Phase 02, 03, 04, 05, 06 (all prior phases)
- **Blocks**: None (final phase)

## Overview
| Field | Value |
|-------|-------|
| Description | Wire up SessionProvider, seed admin, update env example |
| Priority | P1 |
| Status | completed |
| Effort | 30min |

## Requirements

### R7.1: SessionProvider Integration
Update `src/app/(dashboard)/layout.tsx`:
- Wrap children with SessionProvider
- Import from next-auth/react

### R7.2: Admin User Seeder
Create `prisma/seed-admin.ts`:
- Create default admin user with hashed password
- Idempotent (check if exists before creating)

### R7.3: Environment Updates
Update `.env.example` with:
- AUTH_SECRET placeholder
- Instructions for generating secret

## Architecture

### SessionProvider Placement
```
RootLayout
└── body
    ├── Toaster (already exists)
    └── {children}

DashboardLayout
└── SessionProvider ← ADD HERE
    └── div
        ├── Header
        ├── main
        │   └── {children}
        └── AIAssistant
```

Why in DashboardLayout, not RootLayout:
- Login page doesn't need session context
- Reduces bundle for public pages
- SessionProvider is client component

### Seed Script Execution
```bash
npx tsx prisma/seed-admin.ts
```

Or add to package.json:
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed-admin.ts"
  }
}
```

## Related Code Files
- `src/app/(dashboard)/layout.tsx` - Dashboard layout (MODIFY)
- `prisma/seed-admin.ts` - Seed script (CREATE)
- `.env.example` - Env template (CREATE/MODIFY)

## Implementation Steps

### Step 1: Update Dashboard Layout
Modify `src/app/(dashboard)/layout.tsx`:

```typescript
import { SessionProvider } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { AIAssistant } from "@/components/layout/AIAssistant";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </main>
        <AIAssistant />
      </div>
    </SessionProvider>
  );
}
```

### Step 2: Create Admin Seeder
Create `prisma/seed-admin.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@vivatour.vn";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123!";

  // Check if admin exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  // Hash password
  const hashedPassword = await hash(adminPassword, 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: "Administrator",
      role: "ADMIN",
    },
  });

  console.log(`Admin user created: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 3: Update package.json Seed Command
Modify `package.json`:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed-admin.ts"
  }
}
```

### Step 4: Create/Update .env.example
Create `.env.example`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication (Auth.js v5)
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-32-character-secret-here-abc"

# Optional: Admin seed defaults
ADMIN_EMAIL="admin@vivatour.vn"
ADMIN_PASSWORD="change-this-in-production"

# AI & APIs (optional)
ANTHROPIC_API_KEY="sk-ant-xxx"

# Development
NODE_ENV="development"
```

### Step 5: Run Seed Script
```bash
# Generate secret
openssl rand -base64 32

# Add to .env
AUTH_SECRET="generated-secret-here"

# Seed admin user
npx tsx prisma/seed-admin.ts
```

### Step 6: Verify Full Flow
1. Start dev server: `npm run dev`
2. Navigate to /login
3. Login with admin credentials
4. Verify redirect to /requests
5. Check session in Header component (if user display exists)
6. Try accessing /settings → should work for admin
7. Test middleware: try /revenue → should work for admin

## Todo List

- [x] Update src/app/(dashboard)/layout.tsx with SessionProvider
- [x] Create prisma/seed-admin.ts (integrated into prisma/seed.ts)
- [x] Update package.json prisma.seed
- [x] Create/update .env.example with AUTH_SECRET
- [x] Add secret generation instructions
- [ ] Run seed script to create admin user (QA task)
- [ ] Verify login flow end-to-end (QA task)
- [ ] Verify role-based access in middleware (QA task)

## Success Criteria

- [x] SessionProvider wraps dashboard content
- [x] useSession works in dashboard components (code ready)
- [ ] Admin user exists in database (pending seed execution)
- [ ] Admin can login with seeded credentials (QA verification)
- [ ] /settings accessible for ADMIN role (QA verification)
- [ ] /revenue accessible for ADMIN role (QA verification)
- [x] Build passes: `npm run build`
- [x] No TypeScript errors

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SessionProvider import error | High | Low | Use "next-auth/react" |
| Seed script fails on existing data | Low | Medium | Idempotent check |
| AUTH_SECRET not set | High | Medium | Clear error message |
| Password stored in logs | Medium | Low | Don't log password |

## Rollback Plan

1. Revert `src/app/(dashboard)/layout.tsx` to remove SessionProvider
2. Delete `prisma/seed-admin.ts`
3. Revert package.json changes
4. Delete admin user from database if created

## Final Verification Checklist

After all phases complete, verify:

```bash
# 1. Build passes
npm run build

# 2. Lint passes
npm run lint

# 3. Start dev server
npm run dev

# 4. Test login flow
# - Navigate to /login
# - Enter admin credentials
# - Verify redirect to /requests

# 5. Test middleware
# - Access /settings as ADMIN → OK
# - Logout, access /requests → redirect to /login

# 6. Test permissions hook
# - Use usePermission in a component
# - Verify can('request:create') returns correct value
```

## Implementation Summary

**Completed**: 2026-01-05 17:09

### Files Created/Modified
1. ✅ src/components/providers/session-provider-wrapper.tsx (NEW)
2. ✅ src/components/providers/index.ts (NEW)
3. ✅ src/app/(dashboard)/layout.tsx (MODIFIED - added SessionProvider)
4. ✅ prisma/seed.ts (MODIFIED - added seedAdminUser function)
5. ✅ .env.example (CREATED)

### Code Review Results
- Build: ✅ PASS (0 errors, 6.1s compile)
- TypeScript: ✅ PASS (0 errors)
- Lint: ✅ CLEAN (Phase 07 files)
- Security: ✅ APPROVED (bcryptjs, timing-attack safe, idempotent seed)

### Remaining QA Tasks
1. Run seed script: `npm run seed`
2. Test login flow with admin@vivatour.vn
3. Verify session persistence
4. Test role-based route access
5. Verify Header component displays user info

## Post-Implementation Notes

After QA verification:

1. **Documentation**: Update README.md with auth setup section
2. **Testing**: Add auth integration tests (useSession in components)
3. **Security Review**: Complete (bcryptjs, timing-safe comparison verified)
4. **Monitoring**: Add auth failure alerts if using monitoring
5. **Next Steps**: Implement role-specific UI in Header component
