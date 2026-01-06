# Phase 01: Testing Checklist + Seed Data

**Status**: pending | **Effort**: 2-3h

## Objective

Create testing infrastructure for solo developer: manual checklists per module + seed script for test users.

---

## Tasks

### 1.1 Create Seed Script (1h)

**File**: `prisma/seed.ts`

```typescript
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await hash('Test123!', 10);

  const users = [
    { email: 'admin@test.com', name: 'Admin User', role: Role.ADMIN },
    { email: 'seller@test.com', name: 'Seller User', role: Role.SELLER },
    { email: 'accountant@test.com', name: 'Accountant User', role: Role.ACCOUNTANT },
    { email: 'operator@test.com', name: 'Operator User', role: Role.OPERATOR },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password },
    });
  }

  console.log('✅ Seed completed: 4 test users created');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

**Update `package.json`**:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

**Run**: `npx prisma db seed`

---

### 1.2 Create Testing Checklist (30m)

**File**: `docs/testing-checklist.md`

```markdown
# Manual Testing Checklist

## Authentication
- [ ] Login as ADMIN (admin@test.com / Test123!)
- [ ] Login as SELLER (seller@test.com / Test123!)
- [ ] Login as ACCOUNTANT (accountant@test.com / Test123!)
- [ ] Login as OPERATOR (operator@test.com / Test123!)
- [ ] Invalid login shows error
- [ ] Logout works

## Request Module (SELLER)
- [ ] View request list
- [ ] Create new request
- [ ] Edit own request
- [ ] Cannot edit others' requests
- [ ] Status change works
- [ ] BOOKING status generates bookingCode

## Operator Module (OPERATOR)
- [ ] View operator list
- [ ] Claim unclaimed operator
- [ ] Edit claimed operator
- [ ] Cannot edit locked operators

## Revenue Module (ACCOUNTANT)
- [ ] View revenue list
- [ ] Create revenue
- [ ] Edit unlocked revenue
- [ ] Lock/unlock revenue
- [ ] Multi-currency calculation

## Supplier Module (ACCOUNTANT)
- [ ] View supplier list
- [ ] Create supplier
- [ ] Add transaction
- [ ] Balance calculation correct

## Admin Functions
- [ ] ADMIN sees all data
- [ ] ADMIN can access /settings
- [ ] Other roles get 403 on /settings
```

---

### 1.3 Setup Error Logging (30m)

**Option A: Sentry (recommended)**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Option B: Simple Error Boundary**

**File**: `src/components/error-boundary.tsx`

```typescript
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error caught:', error, info);
    // TODO: Send to logging service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-600 rounded">
          <h2>Đã xảy ra lỗi</h2>
          <pre className="text-sm mt-2">{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### 1.4 Add API Error Logging (30m)

**File**: `src/lib/logger.ts`

```typescript
export function logError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${context}]`, { message, stack, timestamp: new Date().toISOString() });

  // TODO: Send to Sentry or external service
}
```

Use in API routes:
```typescript
import { logError } from '@/lib/logger';

try {
  // ... code
} catch (error) {
  logError('api/revenues', error);
  return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
}
```

---

## Verification

- [ ] `npx prisma db seed` creates 4 users
- [ ] Login works for all 4 test users
- [ ] Testing checklist covers all modules
- [ ] ErrorBoundary wraps main layout

## Dependencies

- bcryptjs (already installed)
- ts-node for seed script

## Output

- `prisma/seed.ts`
- `docs/testing-checklist.md`
- `src/components/error-boundary.tsx`
- `src/lib/logger.ts`
