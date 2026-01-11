/**
 * Tests for usePermission hook
 * Covers: RBAC permission checks for all roles
 */

import { renderHook } from '@testing-library/react';
import { usePermission } from '../use-permission';

// Mock next-auth/react
const mockUseSession = jest.fn();
jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

describe('usePermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Status', () => {
    it('returns loading state when session is loading', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'loading' });

      const { result } = renderHook(() => usePermission());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.role).toBeNull();
    });

    it('returns unauthenticated state when no session', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      const { result } = renderHook(() => usePermission());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.role).toBeNull();
    });

    it('returns authenticated state when session exists', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '1', role: 'ADMIN' } },
        status: 'authenticated',
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.role).toBe('ADMIN');
    });

    it('returns userId from session', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-123', role: 'SELLER' } },
        status: 'authenticated',
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.userId).toBe('user-123');
    });

    it('returns null userId when not authenticated', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      const { result } = renderHook(() => usePermission());

      expect(result.current.userId).toBeNull();
    });
  });

  describe('ADMIN Role', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '1', role: 'ADMIN' } },
        status: 'authenticated',
      });
    });

    it('has all permissions via wildcard', () => {
      const { result } = renderHook(() => usePermission());

      // Request permissions
      expect(result.current.can('request:view')).toBe(true);
      expect(result.current.can('request:create')).toBe(true);
      expect(result.current.can('request:edit')).toBe(true);
      expect(result.current.can('request:edit_own')).toBe(true);
      expect(result.current.can('request:delete')).toBe(true);

      // Operator permissions
      expect(result.current.can('operator:view')).toBe(true);
      expect(result.current.can('operator:create')).toBe(true);
      expect(result.current.can('operator:edit')).toBe(true);
      expect(result.current.can('operator:edit_claimed')).toBe(true);
      expect(result.current.can('operator:claim')).toBe(true);
      expect(result.current.can('operator:approve')).toBe(true);
      expect(result.current.can('operator:delete')).toBe(true);

      // Revenue permissions
      expect(result.current.can('revenue:view')).toBe(true);
      expect(result.current.can('revenue:manage')).toBe(true);

      // Expense permissions
      expect(result.current.can('expense:view')).toBe(true);
      expect(result.current.can('expense:manage')).toBe(true);

      // Supplier permissions
      expect(result.current.can('supplier:view')).toBe(true);
      expect(result.current.can('supplier:manage')).toBe(true);

      // User permissions
      expect(result.current.can('user:view')).toBe(true);
      expect(result.current.can('user:manage')).toBe(true);
    });

    it('isAdmin returns true', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isSeller).toBe(false);
      expect(result.current.isOperator).toBe(false);
      expect(result.current.isAccountant).toBe(false);
    });

    it('canAll returns true for any permission combination', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.canAll(['request:view', 'operator:view', 'revenue:view'])).toBe(
        true
      );
      expect(result.current.canAll(['user:manage', 'supplier:manage'])).toBe(true);
    });

    it('canAny returns true for any permission', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.canAny(['request:view', 'user:manage'])).toBe(true);
    });
  });

  describe('SELLER Role', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '2', role: 'SELLER' } },
        status: 'authenticated',
      });
    });

    it('has limited request permissions', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('request:view')).toBe(true);
      expect(result.current.can('request:create')).toBe(true);
      expect(result.current.can('request:edit_own')).toBe(true);
      // Should NOT have full edit/delete
      expect(result.current.can('request:edit')).toBe(false);
      expect(result.current.can('request:delete')).toBe(false);
    });

    it('can only view operators', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('operator:view')).toBe(true);
      expect(result.current.can('operator:create')).toBe(false);
      expect(result.current.can('operator:edit')).toBe(false);
      expect(result.current.can('operator:edit_claimed')).toBe(false);
      expect(result.current.can('operator:claim')).toBe(false);
      expect(result.current.can('operator:approve')).toBe(false);
      expect(result.current.can('operator:delete')).toBe(false);
    });

    it('cannot access revenue', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('revenue:view')).toBe(false);
      expect(result.current.can('revenue:manage')).toBe(false);
    });

    it('cannot access user management', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('user:view')).toBe(false);
      expect(result.current.can('user:manage')).toBe(false);
    });

    it('isSeller returns true', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.isSeller).toBe(true);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isOperator).toBe(false);
      expect(result.current.isAccountant).toBe(false);
    });

    it('canAll returns false when missing permissions', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.canAll(['request:view', 'revenue:view'])).toBe(false);
    });

    it('canAny returns true when at least one permission exists', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.canAny(['request:view', 'revenue:view'])).toBe(true);
    });
  });

  describe('OPERATOR Role', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '3', role: 'OPERATOR' } },
        status: 'authenticated',
      });
    });

    it('can view requests', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('request:view')).toBe(true);
      expect(result.current.can('request:create')).toBe(false);
      expect(result.current.can('request:edit')).toBe(false);
    });

    it('has limited operator permissions', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('operator:view')).toBe(true);
      expect(result.current.can('operator:claim')).toBe(true);
      expect(result.current.can('operator:edit_claimed')).toBe(true);
      // Cannot create/delete/approve
      expect(result.current.can('operator:create')).toBe(false);
      expect(result.current.can('operator:edit')).toBe(false);
      expect(result.current.can('operator:approve')).toBe(false);
      expect(result.current.can('operator:delete')).toBe(false);
    });

    it('cannot access revenue', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('revenue:view')).toBe(false);
      expect(result.current.can('revenue:manage')).toBe(false);
    });

    it('isOperator returns true', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.isOperator).toBe(true);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSeller).toBe(false);
      expect(result.current.isAccountant).toBe(false);
    });
  });

  describe('ACCOUNTANT Role', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '4', role: 'ACCOUNTANT' } },
        status: 'authenticated',
      });
    });

    it('can view requests and operators', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('request:view')).toBe(true);
      expect(result.current.can('operator:view')).toBe(true);
    });

    it('can approve operators', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('operator:approve')).toBe(true);
      // Cannot claim or edit claimed
      expect(result.current.can('operator:claim')).toBe(false);
      expect(result.current.can('operator:edit_claimed')).toBe(false);
    });

    it('has full revenue access', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('revenue:view')).toBe(true);
      expect(result.current.can('revenue:manage')).toBe(true);
    });

    it('has full expense access', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('expense:view')).toBe(true);
      expect(result.current.can('expense:manage')).toBe(true);
    });

    it('has full supplier access', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('supplier:view')).toBe(true);
      expect(result.current.can('supplier:manage')).toBe(true);
    });

    it('cannot manage users', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('user:view')).toBe(false);
      expect(result.current.can('user:manage')).toBe(false);
    });

    it('isAccountant returns true', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.isAccountant).toBe(true);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSeller).toBe(false);
      expect(result.current.isOperator).toBe(false);
    });
  });

  describe('Unauthenticated User', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    });

    it('can returns false for all permissions', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('request:view')).toBe(false);
      expect(result.current.can('operator:view')).toBe(false);
      expect(result.current.can('revenue:view')).toBe(false);
      expect(result.current.can('user:manage')).toBe(false);
    });

    it('canAll returns false', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.canAll(['request:view'])).toBe(false);
    });

    it('canAny returns false', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.canAny(['request:view', 'operator:view'])).toBe(false);
    });

    it('all role flags are false', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isSeller).toBe(false);
      expect(result.current.isOperator).toBe(false);
      expect(result.current.isAccountant).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles session with missing role', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '1' } },
        status: 'authenticated',
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.role).toBeNull();
      expect(result.current.can('request:view')).toBe(false);
    });

    it('handles empty permission array in canAll', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '1', role: 'ADMIN' } },
        status: 'authenticated',
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.canAll([])).toBe(true);
    });

    it('handles empty permission array in canAny', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: '1', role: 'ADMIN' } },
        status: 'authenticated',
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.canAny([])).toBe(false);
    });
  });
});
