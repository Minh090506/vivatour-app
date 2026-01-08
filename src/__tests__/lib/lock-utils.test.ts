import {
  canLock,
  canUnlock,
  canLockTier,
  canUnlockTier,
  isEditable,
  getLockFields,
  getCurrentLockTier,
  getActiveLockTiers,
  hasAnyLock,
  LOCK_TIERS,
  LOCK_TIER_ORDER,
  LOCK_PERMISSIONS,
} from '@/lib/lock-utils';
import type { Role } from '@prisma/client';

describe('Lock System Utilities', () => {
  // ============================================
  // Test: canLock / canUnlock Permissions
  // ============================================
  describe('canLock - Role permissions for locking', () => {
    it('ACCOUNTANT can lock KT tier', () => {
      expect(canLock('ACCOUNTANT', 'KT')).toBe(true);
    });

    it('ADMIN can lock KT tier', () => {
      expect(canLock('ADMIN', 'KT')).toBe(true);
    });

    it('SELLER cannot lock KT tier', () => {
      expect(canLock('SELLER', 'KT')).toBe(false);
    });

    it('OPERATOR cannot lock KT tier', () => {
      expect(canLock('OPERATOR', 'KT')).toBe(false);
    });

    it('ADMIN can lock Admin tier', () => {
      expect(canLock('ADMIN', 'Admin')).toBe(true);
    });

    it('ACCOUNTANT cannot lock Admin tier', () => {
      expect(canLock('ACCOUNTANT', 'Admin')).toBe(false);
    });

    it('ADMIN can lock Final tier', () => {
      expect(canLock('ADMIN', 'Final')).toBe(true);
    });
  });

  describe('canUnlock - Role permissions for unlocking', () => {
    it('ACCOUNTANT can unlock KT tier', () => {
      expect(canUnlock('ACCOUNTANT', 'KT')).toBe(true);
    });

    it('ADMIN can unlock all tiers', () => {
      expect(canUnlock('ADMIN', 'KT')).toBe(true);
      expect(canUnlock('ADMIN', 'Admin')).toBe(true);
      expect(canUnlock('ADMIN', 'Final')).toBe(true);
    });

    it('SELLER cannot unlock any tier', () => {
      expect(canUnlock('SELLER', 'KT')).toBe(false);
      expect(canUnlock('SELLER', 'Admin')).toBe(false);
      expect(canUnlock('SELLER', 'Final')).toBe(false);
    });
  });

  // ============================================
  // Test: canLockTier - Sequential Progression
  // ============================================
  describe('canLockTier - Sequential lock progression', () => {
    const noLocks = { lockKT: false, lockAdmin: false, lockFinal: false };
    const ktLocked = { lockKT: true, lockAdmin: false, lockFinal: false };
    const bothLocked = { lockKT: true, lockAdmin: true, lockFinal: false };
    const allLocked = { lockKT: true, lockAdmin: true, lockFinal: true };

    it('Can lock KT when no locks exist', () => {
      expect(canLockTier(noLocks, 'KT')).toBe(true);
    });

    it('Cannot lock KT when already locked', () => {
      expect(canLockTier(ktLocked, 'KT')).toBe(false);
    });

    it('Cannot lock Admin without KT lock first', () => {
      expect(canLockTier(noLocks, 'Admin')).toBe(false);
    });

    it('Can lock Admin when KT is locked', () => {
      expect(canLockTier(ktLocked, 'Admin')).toBe(true);
    });

    it('Cannot lock Final without Admin lock first', () => {
      expect(canLockTier(ktLocked, 'Final')).toBe(false);
    });

    it('Can lock Final when both KT and Admin are locked', () => {
      expect(canLockTier(bothLocked, 'Final')).toBe(true);
    });

    it('Cannot lock Final when already locked', () => {
      expect(canLockTier(allLocked, 'Final')).toBe(false);
    });
  });

  // ============================================
  // Test: canUnlockTier - Reverse Order Progression
  // ============================================
  describe('canUnlockTier - Reverse unlock progression', () => {
    const noLocks = { lockKT: false, lockAdmin: false, lockFinal: false };
    const ktLocked = { lockKT: true, lockAdmin: false, lockFinal: false };
    const bothLocked = { lockKT: true, lockAdmin: true, lockFinal: false };
    const allLocked = { lockKT: true, lockAdmin: true, lockFinal: true };

    it('Cannot unlock any tier when none are locked', () => {
      expect(canUnlockTier(noLocks, 'KT')).toBe(false);
      expect(canUnlockTier(noLocks, 'Admin')).toBe(false);
      expect(canUnlockTier(noLocks, 'Final')).toBe(false);
    });

    it('Can unlock Final when Final is locked', () => {
      expect(canUnlockTier(allLocked, 'Final')).toBe(true);
    });

    it('Cannot unlock Admin when Final is locked', () => {
      expect(canUnlockTier(allLocked, 'Admin')).toBe(false);
    });

    it('Can unlock Admin when Final is unlocked', () => {
      expect(canUnlockTier(bothLocked, 'Admin')).toBe(true);
    });

    it('Cannot unlock KT when Admin is locked', () => {
      expect(canUnlockTier(bothLocked, 'KT')).toBe(false);
    });

    it('Can unlock KT when Admin is unlocked', () => {
      expect(canUnlockTier(ktLocked, 'KT')).toBe(true);
    });
  });

  // ============================================
  // Test: isEditable
  // ============================================
  describe('isEditable - Check if record is editable', () => {
    it('Record is editable with no locks', () => {
      const state = { lockKT: false, lockAdmin: false, lockFinal: false };
      expect(isEditable(state)).toBe(true);
    });

    it('Record is not editable with KT lock', () => {
      const state = { lockKT: true, lockAdmin: false, lockFinal: false };
      expect(isEditable(state)).toBe(false);
    });

    it('Record is not editable with Admin lock', () => {
      const state = { lockKT: false, lockAdmin: true, lockFinal: false };
      expect(isEditable(state)).toBe(false);
    });

    it('Record is not editable with Final lock', () => {
      const state = { lockKT: false, lockAdmin: false, lockFinal: true };
      expect(isEditable(state)).toBe(false);
    });

    it('Record is not editable with any combination of locks', () => {
      const state = { lockKT: true, lockAdmin: true, lockFinal: true };
      expect(isEditable(state)).toBe(false);
    });
  });

  // ============================================
  // Test: getLockFields
  // ============================================
  describe('getLockFields - Generate DB update fields', () => {
    const userId = 'user-123';

    it('generates lock fields for KT tier', () => {
      const fields = getLockFields('KT', userId, true);
      expect(fields.lockKT).toBe(true);
      expect(fields.lockKTAt).toBeInstanceOf(Date);
      expect(fields.lockKTBy).toBe(userId);
    });

    it('generates lock fields for Admin tier', () => {
      const fields = getLockFields('Admin', userId, true);
      expect(fields.lockAdmin).toBe(true);
      expect(fields.lockAdminAt).toBeInstanceOf(Date);
      expect(fields.lockAdminBy).toBe(userId);
    });

    it('generates lock fields for Final tier', () => {
      const fields = getLockFields('Final', userId, true);
      expect(fields.lockFinal).toBe(true);
      expect(fields.lockFinalAt).toBeInstanceOf(Date);
      expect(fields.lockFinalBy).toBe(userId);
    });

    it('generates unlock fields (sets to false/null)', () => {
      const fields = getLockFields('KT', userId, false);
      expect(fields.lockKT).toBe(false);
      expect(fields.lockKTAt).toBeNull();
      expect(fields.lockKTBy).toBeNull();
    });

    it('sets correct timestamp for lock operations', () => {
      const before = new Date();
      const fields = getLockFields('KT', userId, true);
      const after = new Date();

      expect((fields.lockKTAt as Date).getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect((fields.lockKTAt as Date).getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  // ============================================
  // Test: getCurrentLockTier
  // ============================================
  describe('getCurrentLockTier - Get highest active lock tier', () => {
    it('returns null when no locks', () => {
      const state = { lockKT: false, lockAdmin: false, lockFinal: false };
      expect(getCurrentLockTier(state)).toBeNull();
    });

    it('returns KT when only KT is locked', () => {
      const state = { lockKT: true, lockAdmin: false, lockFinal: false };
      expect(getCurrentLockTier(state)).toBe('KT');
    });

    it('returns Admin when KT and Admin are locked', () => {
      const state = { lockKT: true, lockAdmin: true, lockFinal: false };
      expect(getCurrentLockTier(state)).toBe('Admin');
    });

    it('returns Final when all are locked', () => {
      const state = { lockKT: true, lockAdmin: true, lockFinal: true };
      expect(getCurrentLockTier(state)).toBe('Final');
    });

    it('prioritizes higher tiers (Final > Admin > KT)', () => {
      const state = { lockKT: true, lockAdmin: false, lockFinal: true };
      expect(getCurrentLockTier(state)).toBe('Final');
    });
  });

  // ============================================
  // Test: getActiveLockTiers
  // ============================================
  describe('getActiveLockTiers - Get all active lock tiers', () => {
    it('returns empty array when no locks', () => {
      const state = { lockKT: false, lockAdmin: false, lockFinal: false };
      expect(getActiveLockTiers(state)).toEqual([]);
    });

    it('returns [KT] when only KT is locked', () => {
      const state = { lockKT: true, lockAdmin: false, lockFinal: false };
      expect(getActiveLockTiers(state)).toEqual(['KT']);
    });

    it('returns [KT, Admin] when both are locked', () => {
      const state = { lockKT: true, lockAdmin: true, lockFinal: false };
      expect(getActiveLockTiers(state)).toEqual(['KT', 'Admin']);
    });

    it('returns all tiers when all are locked', () => {
      const state = { lockKT: true, lockAdmin: true, lockFinal: true };
      expect(getActiveLockTiers(state)).toEqual(['KT', 'Admin', 'Final']);
    });
  });

  // ============================================
  // Test: hasAnyLock
  // ============================================
  describe('hasAnyLock - Check if any lock is active', () => {
    it('returns false when no locks', () => {
      const state = { lockKT: false, lockAdmin: false, lockFinal: false };
      expect(hasAnyLock(state)).toBe(false);
    });

    it('returns true when KT is locked', () => {
      const state = { lockKT: true, lockAdmin: false, lockFinal: false };
      expect(hasAnyLock(state)).toBe(true);
    });

    it('returns true when Admin is locked', () => {
      const state = { lockKT: false, lockAdmin: true, lockFinal: false };
      expect(hasAnyLock(state)).toBe(true);
    });

    it('returns true when Final is locked', () => {
      const state = { lockKT: false, lockAdmin: false, lockFinal: true };
      expect(hasAnyLock(state)).toBe(true);
    });

    it('returns true when any combination of locks exist', () => {
      const state = { lockKT: true, lockAdmin: true, lockFinal: true };
      expect(hasAnyLock(state)).toBe(true);
    });
  });

  // ============================================
  // Test: Configuration Constants
  // ============================================
  describe('Lock configuration constants', () => {
    it('LOCK_TIERS has 3 tiers', () => {
      expect(LOCK_TIERS).toEqual(['KT', 'Admin', 'Final']);
    });

    it('LOCK_TIER_ORDER has correct progression', () => {
      expect(LOCK_TIER_ORDER.KT).toBe(1);
      expect(LOCK_TIER_ORDER.Admin).toBe(2);
      expect(LOCK_TIER_ORDER.Final).toBe(3);
    });

    it('LOCK_PERMISSIONS configured for all tiers', () => {
      expect(LOCK_PERMISSIONS.KT).toBeDefined();
      expect(LOCK_PERMISSIONS.Admin).toBeDefined();
      expect(LOCK_PERMISSIONS.Final).toBeDefined();
    });

    it('KT tier allows ACCOUNTANT and ADMIN to lock/unlock', () => {
      expect(LOCK_PERMISSIONS.KT.lock).toContain('ACCOUNTANT');
      expect(LOCK_PERMISSIONS.KT.lock).toContain('ADMIN');
      expect(LOCK_PERMISSIONS.KT.unlock).toContain('ACCOUNTANT');
      expect(LOCK_PERMISSIONS.KT.unlock).toContain('ADMIN');
    });

    it('Admin and Final tiers allow only ADMIN', () => {
      expect(LOCK_PERMISSIONS.Admin.lock).toEqual(['ADMIN']);
      expect(LOCK_PERMISSIONS.Final.lock).toEqual(['ADMIN']);
    });
  });
});
