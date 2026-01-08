// ============================================
// Lock System Utilities for VivaTour
// 3-tier lock: KT (Accountant) → Admin → Final
// ============================================

import type { Role } from '@prisma/client';

// Lock tier definitions
export const LOCK_TIERS = ['KT', 'Admin', 'Final'] as const;
export type LockTier = (typeof LOCK_TIERS)[number];

// Lock tier order (for progression validation)
export const LOCK_TIER_ORDER: Record<LockTier, number> = {
  KT: 1,
  Admin: 2,
  Final: 3,
};

// Permissions per tier per action
export const LOCK_PERMISSIONS: Record<
  LockTier,
  { lock: Role[]; unlock: Role[] }
> = {
  KT: {
    lock: ['ACCOUNTANT', 'ADMIN'],
    unlock: ['ACCOUNTANT', 'ADMIN'],
  },
  Admin: {
    lock: ['ADMIN'],
    unlock: ['ADMIN'],
  },
  Final: {
    lock: ['ADMIN'],
    unlock: ['ADMIN'],
  },
};

/**
 * Check if role can perform lock action on tier
 */
export function canLock(role: Role, tier: LockTier): boolean {
  return LOCK_PERMISSIONS[tier].lock.includes(role);
}

/**
 * Check if role can perform unlock action on tier
 */
export function canUnlock(role: Role, tier: LockTier): boolean {
  return LOCK_PERMISSIONS[tier].unlock.includes(role);
}

/**
 * Lock state interface matching DB fields
 */
export interface LockState {
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
}

/**
 * Get current highest lock tier from record
 */
export function getCurrentLockTier(state: LockState): LockTier | null {
  if (state.lockFinal) return 'Final';
  if (state.lockAdmin) return 'Admin';
  if (state.lockKT) return 'KT';
  return null;
}

/**
 * Check if next tier can be locked (sequential progression)
 */
export function canLockTier(state: LockState, tier: LockTier): boolean {
  const tierOrder = LOCK_TIER_ORDER[tier];

  // For tier 1 (KT), always can lock if not already locked
  if (tierOrder === 1) {
    return !state.lockKT;
  }

  // For tier 2 (Admin), tier 1 must be locked
  if (tierOrder === 2) {
    return state.lockKT && !state.lockAdmin;
  }

  // For tier 3 (Final), tier 2 must be locked
  if (tierOrder === 3) {
    return state.lockAdmin && !state.lockFinal;
  }

  return false;
}

/**
 * Check if tier can be unlocked (reverse order)
 */
export function canUnlockTier(state: LockState, tier: LockTier): boolean {
  const tierOrder = LOCK_TIER_ORDER[tier];

  // For tier 3 (Final), can unlock if locked
  if (tierOrder === 3) {
    return state.lockFinal;
  }

  // For tier 2 (Admin), tier 3 must be unlocked first
  if (tierOrder === 2) {
    return state.lockAdmin && !state.lockFinal;
  }

  // For tier 1 (KT), tier 2 must be unlocked first
  if (tierOrder === 1) {
    return state.lockKT && !state.lockAdmin;
  }

  return false;
}

/**
 * Check if record is editable (no locks applied)
 */
export function isEditable(state: LockState): boolean {
  return !state.lockKT && !state.lockAdmin && !state.lockFinal;
}

/**
 * Get lock tier fields for database update
 */
export function getLockFields(
  tier: LockTier,
  userId: string,
  lock: boolean
): Record<string, boolean | Date | string | null> {
  const now = new Date();
  const tierKey = `lock${tier}`;

  if (lock) {
    return {
      [tierKey]: true,
      [`${tierKey}At`]: now,
      [`${tierKey}By`]: userId,
    };
  } else {
    return {
      [tierKey]: false,
      [`${tierKey}At`]: null,
      [`${tierKey}By`]: null,
    };
  }
}

/**
 * Get history action name for lock operation
 */
export function getLockHistoryAction(tier: LockTier, lock: boolean): string {
  return lock ? `LOCK_${tier.toUpperCase()}` : `UNLOCK_${tier.toUpperCase()}`;
}

/**
 * Get all active lock tiers for a record
 */
export function getActiveLockTiers(state: LockState): LockTier[] {
  const tiers: LockTier[] = [];
  if (state.lockKT) tiers.push('KT');
  if (state.lockAdmin) tiers.push('Admin');
  if (state.lockFinal) tiers.push('Final');
  return tiers;
}

/**
 * Check if any lock is active
 */
export function hasAnyLock(state: LockState): boolean {
  return state.lockKT || state.lockAdmin || state.lockFinal;
}
