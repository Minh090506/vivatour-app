"use client";

/**
 * usePermission Hook
 *
 * React hook for checking user permissions in components.
 * Uses NextAuth session to get user role and check against PERMISSIONS config.
 *
 * @example
 * const { can, isAdmin } = usePermission();
 * if (can("request:create")) { ... }
 * if (isAdmin) { ... }
 */

import { useSession } from "next-auth/react";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";

export function usePermission() {
  const { data: session, status } = useSession();

  const role = (session?.user?.role as Role) || null;

  /**
   * Check if current user has a specific permission
   * Returns false if not authenticated
   */
  const can = (permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  /**
   * Check multiple permissions (all must pass)
   */
  const canAll = (permissions: Permission[]): boolean => {
    if (!role) return false;
    return permissions.every((p) => hasPermission(role, p));
  };

  /**
   * Check multiple permissions (any must pass)
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (!role) return false;
    return permissions.some((p) => hasPermission(role, p));
  };

  return {
    /** Check if user has a specific permission */
    can,

    /** Check if user has ALL of the specified permissions */
    canAll,

    /** Check if user has ANY of the specified permissions */
    canAny,

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
