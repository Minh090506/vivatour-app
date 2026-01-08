# Phase 3A: Operator UI Components

**Owner**: Window 2
**Duration**: ~15 min
**Depends on**: Phase 2A (Operator API) complete
**Parallel with**: Phase 3B (Revenue UI)

---

## Overview

Update Operator UI components to support 3-tier lock system with tier badges and updated dialogs.

---

## Task 3A.1: Lock Tier Badge Component (8 min)

### File: `src/components/operators/operator-lock-tier-badge.tsx` (NEW)

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Lock, LockOpen } from 'lucide-react';
import { LOCK_TIER_LABELS, LOCK_TIER_COLORS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';

interface LockTierBadgeProps {
  lockKT: boolean;
  lockKTAt?: Date | null;
  lockAdmin: boolean;
  lockAdminAt?: Date | null;
  lockFinal: boolean;
  lockFinalAt?: Date | null;
  showAll?: boolean; // Show all tiers or just active ones
}

interface TierInfo {
  tier: LockTier;
  locked: boolean;
  at?: Date | null;
}

export function LockTierBadge({
  lockKT,
  lockKTAt,
  lockAdmin,
  lockAdminAt,
  lockFinal,
  lockFinalAt,
  showAll = false,
}: LockTierBadgeProps) {
  const tiers: TierInfo[] = [
    { tier: 'KT', locked: lockKT, at: lockKTAt },
    { tier: 'Admin', locked: lockAdmin, at: lockAdminAt },
    { tier: 'Final', locked: lockFinal, at: lockFinalAt },
  ];

  const activeTiers = tiers.filter((t) => t.locked);
  const displayTiers = showAll ? tiers : activeTiers;

  if (displayTiers.length === 0 || (!showAll && activeTiers.length === 0)) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <LockOpen className="h-3 w-3" />
        Chưa khóa
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {displayTiers.map((tierInfo) => {
        const color = LOCK_TIER_COLORS[tierInfo.tier];
        const label = LOCK_TIER_LABELS[tierInfo.tier];

        if (!tierInfo.locked && !showAll) return null;

        return (
          <Badge
            key={tierInfo.tier}
            variant={tierInfo.locked ? 'default' : 'outline'}
            className={`gap-1 ${
              tierInfo.locked
                ? color === 'amber'
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : color === 'orange'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-red-500 hover:bg-red-600'
                : 'text-muted-foreground'
            }`}
            title={
              tierInfo.locked && tierInfo.at
                ? `Khóa lúc: ${new Date(tierInfo.at).toLocaleString('vi-VN')}`
                : undefined
            }
          >
            <Lock className="h-3 w-3" />
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

/**
 * Compact version for table cells
 */
export function LockTierBadgeCompact({
  lockKT,
  lockAdmin,
  lockFinal,
}: Pick<LockTierBadgeProps, 'lockKT' | 'lockAdmin' | 'lockFinal'>) {
  const highestTier = lockFinal ? 'Final' : lockAdmin ? 'Admin' : lockKT ? 'KT' : null;

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
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Lock className="h-4 w-4" />
      <span className="text-xs font-medium">{highestTier}</span>
    </div>
  );
}
```

---

## Task 3A.2: Update Lock Dialog (5 min)

### File: `src/components/operators/operator-lock-dialog.tsx`

Add tier selection to existing dialog. Key changes:

```tsx
// Add imports
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LOCK_TIER_LABELS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';

// Add tier state
const [tier, setTier] = useState<LockTier>('KT');

// Update preview fetch
const handlePreview = async () => {
  const res = await fetch(
    `/api/operators/lock-period?month=${month}&tier=${tier}`
  );
  // ...
};

// Update confirm call
const handleConfirm = async () => {
  await onConfirm(month, tier);
  // ...
};

// Add tier selector to dialog content (after month input)
<div className="space-y-2">
  <Label htmlFor="tier">Mức khóa</Label>
  <Select
    value={tier}
    onValueChange={(v) => {
      setTier(v as LockTier);
      setPreview(null);
    }}
  >
    <SelectTrigger id="tier">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="KT">{LOCK_TIER_LABELS.KT}</SelectItem>
      <SelectItem value="Admin">{LOCK_TIER_LABELS.Admin}</SelectItem>
      <SelectItem value="Final">{LOCK_TIER_LABELS.Final}</SelectItem>
    </SelectContent>
  </Select>
</div>

// Update onConfirm prop type
interface OperatorLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (month: string, tier: LockTier) => Promise<void>;
}
```

---

## Task 3A.3: Update History Panel (2 min)

### File: `src/components/operators/operator-history-panel.tsx`

Add tier-specific action colors. Find ACTION_CONFIG and add:

```tsx
// Add to ACTION_CONFIG object
const ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  // ... existing actions ...

  // 3-tier lock actions
  LOCK_KT: { color: 'bg-amber-100 text-amber-800', icon: <Lock className="h-3 w-3" />, label: 'Khóa KT' },
  UNLOCK_KT: { color: 'bg-amber-50 text-amber-700', icon: <Unlock className="h-3 w-3" />, label: 'Mở khóa KT' },
  LOCK_ADMIN: { color: 'bg-orange-100 text-orange-800', icon: <Lock className="h-3 w-3" />, label: 'Khóa Admin' },
  UNLOCK_ADMIN: { color: 'bg-orange-50 text-orange-700', icon: <Unlock className="h-3 w-3" />, label: 'Mở khóa Admin' },
  LOCK_FINAL: { color: 'bg-red-100 text-red-800', icon: <Lock className="h-3 w-3" />, label: 'Khóa Cuối' },
  UNLOCK_FINAL: { color: 'bg-red-50 text-red-700', icon: <Unlock className="h-3 w-3" />, label: 'Mở khóa Cuối' },
};

// Import Unlock icon at top
import { Lock, Unlock } from 'lucide-react';
```

---

## Verification Checklist

- [ ] LockTierBadge shows all 3 tiers when showAll=true
- [ ] LockTierBadgeCompact shows highest tier only
- [ ] Lock dialog has tier selector
- [ ] Lock dialog previews correct operators per tier
- [ ] History panel shows tier-specific actions with colors
- [ ] No TypeScript errors

---

## Component Exports

Ensure these are exported from components if using barrel exports:

```typescript
// src/components/operators/index.ts (if exists)
export * from './operator-lock-tier-badge';
```

---

## Usage Examples

### LockTierBadge in Detail Page
```tsx
<LockTierBadge
  lockKT={operator.lockKT}
  lockKTAt={operator.lockKTAt}
  lockAdmin={operator.lockAdmin}
  lockAdminAt={operator.lockAdminAt}
  lockFinal={operator.lockFinal}
  lockFinalAt={operator.lockFinalAt}
  showAll={true}
/>
```

### LockTierBadgeCompact in Table
```tsx
<LockTierBadgeCompact
  lockKT={row.lockKT}
  lockAdmin={row.lockAdmin}
  lockFinal={row.lockFinal}
/>
```
