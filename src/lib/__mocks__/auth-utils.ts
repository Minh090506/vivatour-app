/**
 * Mock auth-utils for Jest tests
 * Provides controllable authentication state for testing
 */

import { NextResponse } from 'next/server';
import type { Role, Permission } from '../permissions';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

// Default mock user - can be overridden in tests
let mockUser: SessionUser | null = {
  id: 'test-admin-id',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: 'ADMIN',
};

/**
 * Set mock user for tests
 */
export function setMockUser(user: SessionUser | null) {
  mockUser = user;
}

/**
 * Reset mock user to default
 */
export function resetMockUser() {
  mockUser = {
    id: 'test-admin-id',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'ADMIN',
  };
}

/**
 * Mock getSessionUser
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return mockUser;
}

/**
 * Standard 401 Unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Chưa đăng nhập' },
    { status: 401 }
  );
}

/**
 * Standard 403 Forbidden response
 */
export function forbiddenResponse(message = 'Không có quyền truy cập') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Check if user has permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  // Simplified permission check for tests
  if (role === 'ADMIN') return true;
  if (role === 'ACCOUNTANT') {
    return ['operators:lock', 'operators:unlock', 'reports:view'].includes(permission);
  }
  return false;
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return { error: unauthorizedResponse(), user: null };
  }
  if (user.role !== 'ADMIN') {
    return { error: forbiddenResponse('Chỉ Admin mới có quyền'), user: null };
  }
  return { error: null, user };
}

/**
 * Require accountant or admin role
 */
export async function requireAccountant() {
  const user = await getSessionUser();
  if (!user) {
    return { error: unauthorizedResponse(), user: null };
  }
  if (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT') {
    return { error: forbiddenResponse('Cần quyền Kế toán'), user: null };
  }
  return { error: null, user };
}

/**
 * Require specific permission
 */
export async function requirePermission(permission: Permission) {
  const user = await getSessionUser();
  if (!user) {
    return { error: unauthorizedResponse(), user: null };
  }
  if (!hasPermission(user.role, permission)) {
    return { error: forbiddenResponse('Không có quyền thực hiện'), user: null };
  }
  return { error: null, user };
}
