// ============================================
// Lock System Configuration
// Constants, Vietnamese labels, colors for 3-tier lock
// ============================================

// History action types for lock operations
export const LOCK_HISTORY_ACTIONS = {
  LOCK_KT: 'LOCK_KT',
  UNLOCK_KT: 'UNLOCK_KT',
  LOCK_ADMIN: 'LOCK_ADMIN',
  UNLOCK_ADMIN: 'UNLOCK_ADMIN',
  LOCK_FINAL: 'LOCK_FINAL',
  UNLOCK_FINAL: 'UNLOCK_FINAL',
} as const;

export type LockHistoryAction = (typeof LOCK_HISTORY_ACTIONS)[keyof typeof LOCK_HISTORY_ACTIONS];

// Vietnamese labels for lock tiers
export const LOCK_TIER_LABELS: Record<string, string> = {
  KT: 'Khóa KT',
  Admin: 'Khóa Admin',
  Final: 'Khóa Cuối',
};

// Lock tier colors for badges (Tailwind colors)
export const LOCK_TIER_COLORS: Record<string, string> = {
  KT: 'amber',
  Admin: 'orange',
  Final: 'red',
};

// History action labels (Vietnamese)
export const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  LOCK: 'Khóa', // Legacy
  UNLOCK: 'Mở khóa', // Legacy
  LOCK_KT: 'Khóa KT',
  UNLOCK_KT: 'Mở khóa KT',
  LOCK_ADMIN: 'Khóa Admin',
  UNLOCK_ADMIN: 'Mở khóa Admin',
  LOCK_FINAL: 'Khóa cuối',
  UNLOCK_FINAL: 'Mở khóa cuối',
  APPROVE: 'Duyệt thanh toán',
};

// History action colors
export const HISTORY_ACTION_COLORS: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOCK: 'amber',
  UNLOCK: 'purple',
  LOCK_KT: 'amber',
  UNLOCK_KT: 'purple',
  LOCK_ADMIN: 'orange',
  UNLOCK_ADMIN: 'purple',
  LOCK_FINAL: 'red',
  UNLOCK_FINAL: 'purple',
  APPROVE: 'emerald',
};

/**
 * Get Vietnamese label for lock tier
 */
export function getLockTierLabel(tier: string): string {
  return LOCK_TIER_LABELS[tier] || tier;
}

/**
 * Get color for lock tier badge
 */
export function getLockTierColor(tier: string): string {
  return LOCK_TIER_COLORS[tier] || 'gray';
}

/**
 * Get Vietnamese label for history action
 */
export function getHistoryActionLabel(action: string): string {
  return HISTORY_ACTION_LABELS[action] || action;
}

/**
 * Get color for history action
 */
export function getHistoryActionColor(action: string): string {
  return HISTORY_ACTION_COLORS[action] || 'gray';
}
