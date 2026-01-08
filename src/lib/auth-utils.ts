/**
 * Authentication Utilities for API Routes
 *
 * Provides helper functions to get authenticated user session
 * with proper error handling for API routes.
 *
 * @example
 * import { getSessionUser, requireAdmin } from '@/lib/auth-utils';
 *
 * // In API route:
 * const user = await getSessionUser();
 * if (!user) return unauthorizedResponse();
 *
 * // For admin-only routes:
 * const adminCheck = await requireAdmin();
 * if (adminCheck.error) return adminCheck.error;
 * const user = adminCheck.user;
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasPermission, type Role, type Permission } from "./permissions";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

/**
 * Get authenticated user from session
 * Returns null if not authenticated
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role: (session.user.role as Role) ?? "SELLER",
  };
}

/**
 * Standard 401 Unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Chưa đăng nhập" },
    { status: 401 }
  );
}

/**
 * Standard 403 Forbidden response
 */
export function forbiddenResponse(message = "Không có quyền truy cập") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/**
 * Require authenticated user with specific permission
 * Returns user if authorized, or error response if not
 */
export async function requirePermission(permission: Permission): Promise<{
  user: SessionUser | null;
  error: NextResponse | null;
}> {
  const user = await getSessionUser();

  if (!user) {
    return { user: null, error: unauthorizedResponse() };
  }

  if (!hasPermission(user.role, permission)) {
    return { user: null, error: forbiddenResponse() };
  }

  return { user, error: null };
}

/**
 * Require ADMIN role
 * Returns user if admin, or error response if not
 */
export async function requireAdmin(): Promise<{
  user: SessionUser | null;
  error: NextResponse | null;
}> {
  const user = await getSessionUser();

  if (!user) {
    return { user: null, error: unauthorizedResponse() };
  }

  if (user.role !== "ADMIN") {
    return {
      user: null,
      error: forbiddenResponse("Chỉ Admin được thực hiện thao tác này"),
    };
  }

  return { user, error: null };
}
