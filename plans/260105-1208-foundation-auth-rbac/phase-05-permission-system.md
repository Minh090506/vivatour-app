# Phase 05: Permission System

## Context
- **Parent Plan**: `plans/260105-1208-foundation-auth-rbac/plan.md`
- **Dependencies**: Phase 02 (auth config for session types)
- **Blocks**: None (can run in parallel)

## Overview
| Field | Value |
|-------|-------|
| Description | Permission constants and usePermission hook |
| Priority | P1 |
| Status | pending |
| Effort | 20min |

## Requirements

### R5.1: Permission Constants
Create `src/lib/permissions.ts` with:
```typescript
const PERMISSIONS = {
  ADMIN: ['*'],
  SELLER: ['request:create', 'request:edit_own', 'operator:view'],
  OPERATOR: ['operator:claim', 'operator:edit_claimed', 'request:view'],
  ACCOUNTANT: ['revenue:manage', 'expense:manage', 'operator:approve']
};
```

### R5.2: Permission Hook
Create `src/hooks/usePermission.ts` with:
- `can(permission: string)`: Check if user has permission
- `role`: Current user's role
- `isAdmin`: Boolean shorthand
- `isAccountant`: Boolean shorthand

## Architecture

### Permission Naming Convention
Format: `{resource}:{action}`
- Resources: request, operator, revenue, expense, supplier, user
- Actions: view, create, edit, edit_own, edit_claimed, delete, approve, manage

### Wildcard Handling
- ADMIN has `['*']` which matches any permission
- `can('*')` always returns true for ADMIN

### Permission Hierarchy
```
ADMIN ─────────────────────┐
  └── All permissions      │
                           │
SELLER ────────────────────┤
  ├── request:create       │
  ├── request:edit_own     │
  └── operator:view        │
                           │
OPERATOR ──────────────────┤
  ├── operator:claim       │
  ├── operator:edit_claimed│
  └── request:view         │
                           │
ACCOUNTANT ────────────────┘
  ├── revenue:manage
  ├── expense:manage
  └── operator:approve
```

## Related Code Files
- `src/lib/permissions.ts` - Permission config (CREATE)
- `src/hooks/usePermission.ts` - Hook (CREATE)
- `src/hooks/index.ts` - Barrel export (CREATE)

## Implementation Steps

### Step 1: Create Permissions Config
Create `src/lib/permissions.ts`:

```typescript
export type Role = "ADMIN" | "SELLER" | "OPERATOR" | "ACCOUNTANT";

export type Permission =
  // Request permissions
  | "request:view"
  | "request:create"
  | "request:edit"
  | "request:edit_own"
  | "request:delete"
  // Operator permissions
  | "operator:view"
  | "operator:create"
  | "operator:edit"
  | "operator:edit_claimed"
  | "operator:claim"
  | "operator:approve"
  | "operator:delete"
  // Revenue permissions
  | "revenue:view"
  | "revenue:manage"
  // Expense permissions
  | "expense:view"
  | "expense:manage"
  // Supplier permissions
  | "supplier:view"
  | "supplier:manage"
  // User permissions
  | "user:view"
  | "user:manage"
  // Wildcard
  | "*";

export const PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["*"],
  SELLER: [
    "request:view",
    "request:create",
    "request:edit_own",
    "operator:view",
  ],
  OPERATOR: [
    "request:view",
    "operator:view",
    "operator:claim",
    "operator:edit_claimed",
  ],
  ACCOUNTANT: [
    "request:view",
    "operator:view",
    "operator:approve",
    "revenue:view",
    "revenue:manage",
    "expense:view",
    "expense:manage",
    "supplier:view",
    "supplier:manage",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = PERMISSIONS[role] || [];

  // ADMIN with wildcard has all permissions
  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
  return PERMISSIONS[role] || [];
}
```

### Step 2: Create usePermission Hook
Create `src/hooks/usePermission.ts`:

```typescript
"use client";

import { useSession } from "next-auth/react";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";

export function usePermission() {
  const { data: session, status } = useSession();

  const role = (session?.user?.role as Role) || null;

  const can = (permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  return {
    /** Check if user has a specific permission */
    can,

    /** Current user's role (null if not authenticated) */
    role,

    /** Session loading status */
    isLoading: status === "loading",

    /** Is user authenticated */
    isAuthenticated: status === "authenticated",

    /** Shorthand for ADMIN check */
    isAdmin: role === "ADMIN",

    /** Shorthand for ACCOUNTANT check */
    isAccountant: role === "ACCOUNTANT",

    /** Shorthand for SELLER check */
    isSeller: role === "SELLER",

    /** Shorthand for OPERATOR check */
    isOperator: role === "OPERATOR",
  };
}
```

### Step 3: Create Hooks Index
Create `src/hooks/index.ts`:

```typescript
export { usePermission } from "./usePermission";
```

### Step 4: Usage Examples
Component-level permission checking:

```typescript
// Hide button for unauthorized users
function DeleteButton({ requestId }: { requestId: string }) {
  const { can } = usePermission();

  if (!can("request:delete")) {
    return null;
  }

  return <Button onClick={() => deleteRequest(requestId)}>Xoa</Button>;
}

// Show different UI based on role
function RequestActions() {
  const { isAdmin, can } = usePermission();

  return (
    <div>
      {can("request:create") && <CreateButton />}
      {can("request:edit") && <EditButton />}
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

## Todo List

- [ ] Create src/lib/permissions.ts with PERMISSIONS constant
- [ ] Define Permission type with all resource:action combos
- [ ] Create hasPermission helper function
- [ ] Create src/hooks/usePermission.ts
- [ ] Export can, role, isAdmin, isAccountant, etc.
- [ ] Create src/hooks/index.ts barrel export
- [ ] Verify TypeScript types work correctly

## Success Criteria

- [ ] PERMISSIONS constant has all 4 roles
- [ ] Permission type is properly typed
- [ ] hasPermission('ADMIN', 'anything') returns true
- [ ] hasPermission('SELLER', 'revenue:manage') returns false
- [ ] usePermission hook returns can function
- [ ] can('request:create') works for SELLER
- [ ] isAdmin returns true for ADMIN role

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Session not available | Medium | Low | Return false if no session |
| Type mismatch with Role enum | Low | Low | Use string literals matching Prisma |
| Hook called in server component | Medium | Medium | Add "use client" directive |

## Rollback Plan

1. Delete `src/lib/permissions.ts`
2. Delete `src/hooks/usePermission.ts`
3. Delete `src/hooks/index.ts`
4. Components using permission checks will error
