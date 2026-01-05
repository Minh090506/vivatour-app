# Phase 01: Schema + Dependencies

## Context
- **Parent Plan**: `plans/260105-1208-foundation-auth-rbac/plan.md`
- **Dependencies**: None (first phase)
- **Blocks**: Phase 02, 03, 04, 05
- **Completed**: 2026-01-05

## Overview
| Field | Value |
|-------|-------|
| Description | Add OPERATOR role, password field to User, install auth packages |
| Priority | P1 |
| Status | completed |
| Effort | 20min |

## Requirements

### R1.1: Schema Updates
Add OPERATOR to Role enum:
```prisma
enum Role {
  ADMIN
  SELLER
  ACCOUNTANT
  OPERATOR  // NEW
}
```

Add password field to User model:
```prisma
model User {
  // ... existing fields
  password  String?   // NEW: Optional for non-credential auth
}
```

### R1.2: Dependencies
Install required packages:
```bash
npm install next-auth@beta bcryptjs react-resizable-panels
npm install -D @types/bcryptjs
```

| Package | Version | Purpose |
|---------|---------|---------|
| next-auth@beta | ^5.x | Auth.js v5 with App Router support |
| bcryptjs | ^2.x | Password hashing (pure JS, no native deps) |
| react-resizable-panels | ^2.x | Draggable panel dividers |
| @types/bcryptjs | ^2.x | TypeScript types |

## Architecture

### Password Storage Strategy
- Use bcryptjs (not bcrypt) to avoid native compilation issues
- Salt rounds: 10 (balance security/performance)
- Password nullable: supports future OAuth providers
- Never return password in API responses

### Role Ordering
Keep alphabetical for consistency, OPERATOR fits between ACCOUNTANT and SELLER alphabetically but add at end to avoid migration issues:
```
ADMIN, SELLER, ACCOUNTANT, OPERATOR
```

## Related Code Files
- `prisma/schema.prisma` - Schema definition
- `package.json` - Dependencies

## Implementation Steps

### Step 1: Update Prisma Schema
Edit `prisma/schema.prisma`:

```prisma
// Add to Role enum (line ~36-40)
enum Role {
  ADMIN
  SELLER
  ACCOUNTANT
  OPERATOR
}

// Add to User model (after email field, ~line 19)
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?   // Hashed password for credentials auth
  name          String?
  role          Role      @default(SELLER)
  // ... rest unchanged
}
```

### Step 2: Install Dependencies
```bash
cd vivatour-app
npm install next-auth@beta bcryptjs react-resizable-panels
npm install -D @types/bcryptjs
```

### Step 3: Run Prisma Migration
```bash
npx prisma migrate dev --name add-operator-role-password
```

If migration fails due to existing data:
```bash
npx prisma db push  # For dev, force sync without migration history
```

### Step 4: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 5: Verify Installation
```bash
npm run build  # Should pass with no TS errors
```

## Todo List

- [ ] Update Role enum in schema.prisma (add OPERATOR)
- [ ] Add password field to User model
- [ ] Run npm install for new packages
- [ ] Run prisma migrate dev
- [ ] Verify prisma generate succeeds
- [ ] Verify npm run build passes

## Success Criteria

- [ ] Role enum includes: ADMIN, SELLER, ACCOUNTANT, OPERATOR
- [ ] User model has password: String?
- [ ] next-auth@beta installed (check package.json)
- [ ] bcryptjs installed
- [ ] react-resizable-panels installed
- [ ] @types/bcryptjs installed (devDeps)
- [ ] Prisma client regenerated
- [ ] Build passes

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Migration conflicts | Medium | Low | Use db push in dev |
| Package version conflicts | Low | Low | Pin versions in package.json |
| Prisma generate fails | Medium | Low | Delete node_modules/.prisma, regenerate |

## Rollback Plan

If issues arise:
1. Revert schema.prisma changes via git
2. Run `npx prisma generate`
3. Remove packages: `npm uninstall next-auth bcryptjs react-resizable-panels @types/bcryptjs`
