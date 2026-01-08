'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock, Unlock, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { LOCK_TIER_LABELS, LOCK_TIER_COLORS } from '@/config/lock-config';
import type { LockState } from '@/lib/lock-utils';

interface LockTierBadgeProps extends LockState {
  showTooltip?: boolean;
  compact?: boolean;
}

/**
 * Displays 3-tier lock status as a badge
 * Colors: KT=amber, Admin=orange, Final=red
 */
export function LockTierBadge({
  lockKT,
  lockAdmin,
  lockFinal,
  showTooltip = true,
  compact = false,
}: LockTierBadgeProps) {
  // Determine highest lock tier
  const highestTier = lockFinal ? 'Final' : lockAdmin ? 'Admin' : lockKT ? 'KT' : null;

  if (!highestTier) {
    return (
      <Badge variant="outline" className="text-gray-500 gap-1">
        <Unlock className="h-3 w-3" />
        {!compact && 'Mở'}
      </Badge>
    );
  }

  const color = LOCK_TIER_COLORS[highestTier];
  const label = LOCK_TIER_LABELS[highestTier];

  // Color classes based on tier
  const colorClasses = {
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  }[color] || 'bg-gray-100 text-gray-800';

  // Icon based on tier
  const Icon = highestTier === 'Final' ? ShieldAlert : highestTier === 'Admin' ? ShieldCheck : Shield;

  const badge = (
    <Badge variant="outline" className={`${colorClasses} gap-1`}>
      <Icon className="h-3 w-3" />
      {!compact && label}
    </Badge>
  );

  if (!showTooltip || compact) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              {lockKT ? <Lock className="h-3 w-3 text-amber-600" /> : <Unlock className="h-3 w-3 text-gray-400" />}
              <span className={lockKT ? 'text-amber-600' : 'text-gray-400'}>KT</span>
            </div>
            <div className="flex items-center gap-2">
              {lockAdmin ? <Lock className="h-3 w-3 text-orange-600" /> : <Unlock className="h-3 w-3 text-gray-400" />}
              <span className={lockAdmin ? 'text-orange-600' : 'text-gray-400'}>Admin</span>
            </div>
            <div className="flex items-center gap-2">
              {lockFinal ? <Lock className="h-3 w-3 text-red-600" /> : <Unlock className="h-3 w-3 text-gray-400" />}
              <span className={lockFinal ? 'text-red-600' : 'text-gray-400'}>Cuối</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version showing only icons for table cells
 */
export function LockTierBadgeCompact(props: LockState) {
  return <LockTierBadge {...props} compact showTooltip />;
}
