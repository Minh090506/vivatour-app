/**
 * Permission System
 *
 * RBAC (Role-Based Access Control) configuration for MyVivaTour.
 * Defines permissions per role using resource:action naming convention.
 *
 * @example
 * import { hasPermission } from "@/lib/permissions";
 * hasPermission("SELLER", "request:create"); // true
 * hasPermission("SELLER", "revenue:manage"); // false
 */

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
  // Wildcard (admin only)
  | "*";

/**
 * Role-Permission mapping
 *
 * ADMIN: Full access via wildcard
 * SELLER: Request management (own), operator viewing
 * OPERATOR: Claim and edit claimed operators
 * ACCOUNTANT: Revenue, expense, supplier management + operator approval
 */
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
 *
 * @param role - User role
 * @param permission - Permission to check
 * @returns true if role has permission (ADMIN always returns true)
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = PERMISSIONS[role];

  // Safety check
  if (!permissions) {
    return false;
  }

  // ADMIN with wildcard has all permissions
  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 *
 * @param role - User role
 * @returns Array of permissions (empty if role not found)
 */
export function getPermissions(role: Role): Permission[] {
  return PERMISSIONS[role] || [];
}
