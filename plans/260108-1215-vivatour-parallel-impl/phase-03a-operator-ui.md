# Phase 3A: Operator UI Components

**Owner**: Window 2
**Duration**: ~30 min
**Depends on**: Phase 2A (Operator API) complete
**Parallel with**: Phase 3B (Revenue UI)

---

## Overview

Update Operator UI components to support 3-tier lock system with tier badges, dialogs, and history panels.

---

## Task 3A.1: Lock Tier Badge Component (10 min)

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
  lockKTBy?: string | null;
  lockAdmin: boolean;
  lockAdminAt?: Date | null;
  lockAdminBy?: string | null;
  lockFinal: boolean;
  lockFinalAt?: Date | null;
  lockFinalBy?: string | null;
  showAll?: boolean; // Show all tiers or just active ones
}

interface TierInfo {
  tier: LockTier;
  locked: boolean;
  at?: Date | null;
  by?: string | null;
}

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

## Task 3A.2: Update Lock Dialog (15 min)

### File: `src/components/operators/operator-lock-dialog.tsx`

Update to support tier selection for batch locking.

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { LOCK_TIER_LABELS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';

interface OperatorLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (month: string, tier: LockTier) => Promise<void>;
}

interface PreviewData {
  month: string;
  tier: LockTier;
  count: number;
  operators: Array<{
    id: string;
    serviceName: string;
    serviceDate: string;
    totalCost: string;
  }>;
}

export function OperatorLockDialog({
  open,
  onOpenChange,
  onConfirm,
}: OperatorLockDialogProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [tier, setTier] = useState<LockTier>('KT');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/operators/lock-period?month=${month}&tier=${tier}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to preview');
      }

      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);

    try {
      await onConfirm(month, tier);
      onOpenChange(false);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lock failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPreview(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Khóa Operator theo tháng
          </DialogTitle>
          <DialogDescription>
            Chọn tháng và mức khóa để khóa tất cả operator trong kỳ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Tháng</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setPreview(null);
                }}
              />
            </div>

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
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {preview && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Số lượng:</span>
                <span className="text-lg font-bold">{preview.count}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {preview.count > 0
                  ? `Sẽ khóa ${preview.count} operator với mức ${LOCK_TIER_LABELS[tier]}`
                  : 'Không có operator nào cần khóa'}
              </p>

              {preview.count > 0 && preview.count <= 10 && (
                <div className="mt-2 space-y-1">
                  {preview.operators.map((op) => (
                    <div
                      key={op.id}
                      className="text-xs text-muted-foreground truncate"
                    >
                      • {op.serviceName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>

          {!preview ? (
            <Button onClick={handlePreview} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xem trước
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={confirming || preview.count === 0}
              variant="destructive"
            >
              {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận khóa
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Task 3A.3: Update History Panel (10 min)

### File: `src/components/operators/operator-history-panel.tsx`

Add support for new lock tier actions.

```tsx
// Add to existing action colors/icons mapping

const ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  // ... existing actions ...
  CREATE: { color: 'bg-blue-100 text-blue-800', icon: <Plus className="h-3 w-3" />, label: 'Tạo mới' },
  UPDATE: { color: 'bg-gray-100 text-gray-800', icon: <Edit className="h-3 w-3" />, label: 'Cập nhật' },
  APPROVE: { color: 'bg-emerald-100 text-emerald-800', icon: <Check className="h-3 w-3" />, label: 'Duyệt' },

  // Legacy lock actions
  LOCK: { color: 'bg-amber-100 text-amber-800', icon: <Lock className="h-3 w-3" />, label: 'Khóa' },
  UNLOCK: { color: 'bg-purple-100 text-purple-800', icon: <Unlock className="h-3 w-3" />, label: 'Mở khóa' },

  // 3-tier lock actions
  LOCK_KT: { color: 'bg-amber-100 text-amber-800', icon: <Lock className="h-3 w-3" />, label: 'Khóa KT' },
  UNLOCK_KT: { color: 'bg-amber-50 text-amber-700', icon: <Unlock className="h-3 w-3" />, label: 'Mở khóa KT' },
  LOCK_ADMIN: { color: 'bg-orange-100 text-orange-800', icon: <Lock className="h-3 w-3" />, label: 'Khóa Admin' },
  UNLOCK_ADMIN: { color: 'bg-orange-50 text-orange-700', icon: <Unlock className="h-3 w-3" />, label: 'Mở khóa Admin' },
  LOCK_FINAL: { color: 'bg-red-100 text-red-800', icon: <Lock className="h-3 w-3" />, label: 'Khóa Cuối' },
  UNLOCK_FINAL: { color: 'bg-red-50 text-red-700', icon: <Unlock className="h-3 w-3" />, label: 'Mở khóa Cuối' },
};

// Update the history entry rendering to show tier info
function renderHistoryEntry(entry: HistoryEntry) {
  const config = ACTION_CONFIG[entry.action] || {
    color: 'bg-gray-100 text-gray-800',
    icon: <Info className="h-3 w-3" />,
    label: entry.action,
  };

  // Check if this is a batch lock
  const isBatch = entry.changes?.batch === true;
  const tierName = entry.changes?.tier;

  return (
    <div key={entry.id} className="flex items-start gap-3 py-2">
      <div className={`rounded-full p-1.5 ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{config.label}</span>
          {isBatch && (
            <Badge variant="outline" className="text-xs">
              Hàng loạt
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {entry.userName} • {formatDate(entry.createdAt)}
        </p>
        {tierName && entry.changes?.month && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Tháng: {entry.changes.month}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## Task 3A.4: Update Detail Page Lock Section (10 min)

### File: `src/app/(dashboard)/operators/[id]/page.tsx`

Update lock indicator and unlock buttons for 3-tier system.

```tsx
// Import new components
import { LockTierBadge } from '@/components/operators/operator-lock-tier-badge';
import { LOCK_TIER_LABELS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';

// In the lock status section, replace old LockIndicator:

{/* Lock Status Section */}
<div className="space-y-3">
  <h3 className="font-medium">Trạng thái khóa</h3>

  <LockTierBadge
    lockKT={operator.lockKT}
    lockKTAt={operator.lockKTAt}
    lockKTBy={operator.lockKTBy}
    lockAdmin={operator.lockAdmin}
    lockAdminAt={operator.lockAdminAt}
    lockAdminBy={operator.lockAdminBy}
    lockFinal={operator.lockFinal}
    lockFinalAt={operator.lockFinalAt}
    lockFinalBy={operator.lockFinalBy}
    showAll={true}
  />

  {/* Unlock buttons based on current state and permissions */}
  {session?.user?.role === 'ADMIN' && (
    <div className="flex gap-2 mt-2">
      {operator.lockFinal && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleUnlock('Final')}
        >
          Mở khóa Cuối
        </Button>
      )}
      {operator.lockAdmin && !operator.lockFinal && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleUnlock('Admin')}
        >
          Mở khóa Admin
        </Button>
      )}
      {operator.lockKT && !operator.lockAdmin && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleUnlock('KT')}
        >
          Mở khóa KT
        </Button>
      )}
    </div>
  )}
</div>

// Update handleUnlock function:
const handleUnlock = async (tier: LockTier) => {
  try {
    const res = await fetch(`/api/operators/${operator.id}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Unlock failed');
    }

    // Refresh operator data
    router.refresh();
    toast.success(`Đã mở khóa ${LOCK_TIER_LABELS[tier]}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Lỗi mở khóa');
  }
};
```

---

## Verification Checklist

- [ ] LockTierBadge shows all 3 tiers
- [ ] LockTierBadgeCompact for table cells
- [ ] Lock dialog has tier selector
- [ ] Lock dialog previews correct operators per tier
- [ ] History panel shows tier-specific actions
- [ ] Detail page shows all lock tiers
- [ ] Unlock buttons respect tier order
- [ ] No TypeScript errors

---

## Component Exports

Add to `src/components/operators/index.ts` (if exists):

```typescript
export * from './operator-lock-tier-badge';
```
