'use client';

import { Badge } from '@/components/ui/badge';
import { Lock, LockOpen } from 'lucide-react';
import { LOCK_TIER_LABELS, LOCK_TIER_COLORS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';

interface LockTierBadgeProps {
  lockKT: boolean;
  lockKTAt?: Date | string | null;
  lockKTBy?: string | null;
  lockAdmin: boolean;
  lockAdminAt?: Date | string | null;
  lockAdminBy?: string | null;
  lockFinal: boolean;
  lockFinalAt?: Date | string | null;
  lockFinalBy?: string | null;
  showAll?: boolean; // Show all tiers or just active ones
}

interface TierInfo {
  tier: LockTier;
  locked: boolean;
  at?: Date | string | null;
  by?: string | null;
}

/**
 * Full lock tier badge showing all 3 lock tiers
 */
export function LockTierBadge({
  lockKT,
  lockKTAt,
  lockKTBy,
  lockAdmin,
  lockAdminAt,
  lockAdminBy,
  lockFinal,
  lockFinalAt,
  lockFinalBy,
  showAll = false,
}: LockTierBadgeProps) {
  const tiers: TierInfo[] = [
    { tier: 'KT', locked: lockKT, at: lockKTAt, by: lockKTBy },
    { tier: 'Admin', locked: lockAdmin, at: lockAdminAt, by: lockAdminBy },
    { tier: 'Final', locked: lockFinal, at: lockFinalAt, by: lockFinalBy },
  ];

  const activeTiers = tiers.filter((t) => t.locked);
  const displayTiers = showAll ? tiers : activeTiers;

  if (displayTiers.length === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <LockOpen className="h-3 w-3" />
        Chưa khóa
      </Badge>
    );
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleString('vi-VN');
  };

  return (
    <div className="flex flex-wrap gap-1">
      {displayTiers.map((tierInfo) => {
        const color = LOCK_TIER_COLORS[tierInfo.tier];
        const label = LOCK_TIER_LABELS[tierInfo.tier];

        if (!tierInfo.locked && !showAll) return null;

        const colorClass = tierInfo.locked
          ? color === 'amber'
            ? 'bg-amber-500 hover:bg-amber-600 text-white'
            : color === 'orange'
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          : 'text-muted-foreground border-dashed';

        return (
          <Badge
            key={tierInfo.tier}
            variant={tierInfo.locked ? 'default' : 'outline'}
            className={`gap-1 ${colorClass}`}
            title={
              tierInfo.locked && tierInfo.at
                ? `Khóa lúc: ${formatDate(tierInfo.at)}${tierInfo.by ? `\nBởi: ${tierInfo.by}` : ''}`
                : undefined
            }
          >
            {tierInfo.locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <LockOpen className="h-3 w-3" />
            )}
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

/**
 * Compact version for table cells - shows only highest active tier
 */
export function LockTierBadgeCompact({
  lockKT,
  lockAdmin,
  lockFinal,
}: Pick<LockTierBadgeProps, 'lockKT' | 'lockAdmin' | 'lockFinal'>) {
  const highestTier: LockTier | null = lockFinal
    ? 'Final'
    : lockAdmin
      ? 'Admin'
      : lockKT
        ? 'KT'
        : null;

  if (!highestTier) {
    return <LockOpen className="h-4 w-4 text-muted-foreground" />;
  }

  const color = LOCK_TIER_COLORS[highestTier];
  const colorClass =
    color === 'amber'
      ? 'text-amber-500'
      : color === 'orange'
        ? 'text-orange-500'
        : 'text-red-500';

  return (
    <div className={`flex items-center gap-1 ${colorClass}`} title={`Khóa ${LOCK_TIER_LABELS[highestTier]}`}>
      <Lock className="h-4 w-4" />
      <span className="text-xs font-medium">{highestTier}</span>
    </div>
  );
}

/**
 * Single tier badge - for showing specific tier status
 */
export function SingleTierBadge({
  tier,
  isLocked,
  size = 'default',
}: {
  tier: LockTier;
  isLocked: boolean;
  size?: 'default' | 'sm';
}) {
  const color = LOCK_TIER_COLORS[tier];
  const label = LOCK_TIER_LABELS[tier];

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : '';

  const colorClass = isLocked
    ? color === 'amber'
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : color === 'orange'
        ? 'bg-orange-500 hover:bg-orange-600 text-white'
        : 'bg-red-500 hover:bg-red-600 text-white'
    : 'text-muted-foreground';

  return (
    <Badge
      variant={isLocked ? 'default' : 'outline'}
      className={`gap-1 ${colorClass} ${sizeClass}`}
    >
      {isLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
      {label}
    </Badge>
  );
}
