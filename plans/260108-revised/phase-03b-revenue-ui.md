# Phase 3B: Revenue UI Components

**Owner**: Window 3
**Duration**: ~15 min
**Depends on**: Phase 2B (Revenue API) complete
**Parallel with**: Phase 3A (Operator UI)

---

## Overview

Add Revenue UI components for 3-tier lock system including history panel and lock dialog.

---

## Task 3B.1: Revenue History Panel (8 min)

### File: `src/components/revenues/revenue-history-panel.tsx` (NEW)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Lock,
  Unlock,
  Plus,
  Edit,
  Trash,
  Info,
  History,
} from 'lucide-react';
import { HISTORY_ACTION_LABELS } from '@/config/lock-config';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  revenueId: string;
  action: string;
  changes: Record<string, unknown>;
  userId: string;
  userName: string;
  createdAt: string;
}

interface RevenueHistoryPanelProps {
  revenueId: string;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  CREATE: {
    color: 'bg-blue-100 text-blue-800',
    icon: <Plus className="h-3 w-3" />,
  },
  UPDATE: {
    color: 'bg-gray-100 text-gray-800',
    icon: <Edit className="h-3 w-3" />,
  },
  DELETE: {
    color: 'bg-red-100 text-red-800',
    icon: <Trash className="h-3 w-3" />,
  },
  LOCK_KT: {
    color: 'bg-amber-100 text-amber-800',
    icon: <Lock className="h-3 w-3" />,
  },
  UNLOCK_KT: {
    color: 'bg-amber-50 text-amber-700',
    icon: <Unlock className="h-3 w-3" />,
  },
  LOCK_ADMIN: {
    color: 'bg-orange-100 text-orange-800',
    icon: <Lock className="h-3 w-3" />,
  },
  UNLOCK_ADMIN: {
    color: 'bg-orange-50 text-orange-700',
    icon: <Unlock className="h-3 w-3" />,
  },
  LOCK_FINAL: {
    color: 'bg-red-100 text-red-800',
    icon: <Lock className="h-3 w-3" />,
  },
  UNLOCK_FINAL: {
    color: 'bg-red-50 text-red-700',
    icon: <Unlock className="h-3 w-3" />,
  },
};

function formatDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: vi,
    });
  } catch {
    return dateStr;
  }
}

export function RevenueHistoryPanel({ revenueId }: RevenueHistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/revenues/${revenueId}/history`);
        if (!res.ok) {
          throw new Error('Failed to fetch history');
        }
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [revenueId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Chưa có lịch sử
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="p-4 space-y-3">
        {history.map((entry) => {
          const config = ACTION_CONFIG[entry.action] || {
            color: 'bg-gray-100 text-gray-800',
            icon: <Info className="h-3 w-3" />,
          };
          const label =
            HISTORY_ACTION_LABELS[entry.action] || entry.action;

          return (
            <div key={entry.id} className="flex items-start gap-3">
              <div className={`rounded-full p-1.5 ${config.color}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.userName} • {formatDate(entry.createdAt)}
                </p>
                {entry.changes?.tier && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {entry.changes.tier as string}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
```

---

## Task 3B.2: Revenue Lock Dialog (5 min)

### File: `src/components/revenues/revenue-lock-dialog.tsx` (NEW)

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { LOCK_TIER_LABELS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';

interface RevenueLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenueId: string;
  currentState: {
    lockKT: boolean;
    lockAdmin: boolean;
    lockFinal: boolean;
  };
  onSuccess: () => void;
}

export function RevenueLockDialog({
  open,
  onOpenChange,
  revenueId,
  currentState,
  onSuccess,
}: RevenueLockDialogProps) {
  const [tier, setTier] = useState<LockTier>('KT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which tiers can be locked
  const canLockKT = !currentState.lockKT;
  const canLockAdmin = currentState.lockKT && !currentState.lockAdmin;
  const canLockFinal = currentState.lockAdmin && !currentState.lockFinal;

  const handleLock = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/revenues/${revenueId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lock failed');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lock failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Khóa Doanh thu
          </DialogTitle>
          <DialogDescription>
            Chọn mức khóa để áp dụng cho bản ghi này
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tier">Mức khóa</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as LockTier)}>
              <SelectTrigger id="tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KT" disabled={!canLockKT}>
                  {LOCK_TIER_LABELS.KT}
                  {!canLockKT && ' (đã khóa)'}
                </SelectItem>
                <SelectItem value="Admin" disabled={!canLockAdmin}>
                  {LOCK_TIER_LABELS.Admin}
                  {currentState.lockAdmin && ' (đã khóa)'}
                  {!currentState.lockKT && ' (cần khóa KT trước)'}
                </SelectItem>
                <SelectItem value="Final" disabled={!canLockFinal}>
                  {LOCK_TIER_LABELS.Final}
                  {currentState.lockFinal && ' (đã khóa)'}
                  {!currentState.lockAdmin && ' (cần khóa Admin trước)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleLock} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Task 3B.3: Update Revenue Table (2 min)

### File: `src/components/revenues/revenue-table.tsx`

Update lock column to use tier badge. Key changes:

```tsx
// Add imports
import { LockTierBadgeCompact } from '@/components/operators/operator-lock-tier-badge';

// Update the lock status column (find existing isLocked column)
{
  accessorKey: 'lockStatus',
  header: 'Khóa',
  cell: ({ row }) => (
    <LockTierBadgeCompact
      lockKT={row.original.lockKT}
      lockAdmin={row.original.lockAdmin}
      lockFinal={row.original.lockFinal}
    />
  ),
}

// Note: If lock column uses isLocked, keep it for backward compat
// and add new column for tier display, or replace entirely
```

---

## Verification Checklist

- [ ] RevenueHistoryPanel loads and displays history
- [ ] RevenueHistoryPanel shows tier-specific action colors
- [ ] RevenueLockDialog shows available tiers
- [ ] RevenueLockDialog respects progression rules
- [ ] Revenue table shows lock tier badge
- [ ] No TypeScript errors

---

## Component Exports

```typescript
// src/components/revenues/index.ts (if exists)
export * from './revenue-history-panel';
export * from './revenue-lock-dialog';
```

---

## Usage in Revenue Page

Example integration in revenue list or detail:

```tsx
// In row actions dropdown
import { RevenueLockDialog } from './revenue-lock-dialog';
import { RevenueHistoryPanel } from './revenue-history-panel';

// State
const [lockDialogOpen, setLockDialogOpen] = useState(false);
const [historyOpen, setHistoryOpen] = useState(false);

// Dialog
<RevenueLockDialog
  open={lockDialogOpen}
  onOpenChange={setLockDialogOpen}
  revenueId={row.id}
  currentState={{
    lockKT: row.lockKT,
    lockAdmin: row.lockAdmin,
    lockFinal: row.lockFinal,
  }}
  onSuccess={onRefresh}
/>

// History Sheet
<Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Lịch sử thay đổi</SheetTitle>
    </SheetHeader>
    <RevenueHistoryPanel revenueId={row.id} />
  </SheetContent>
</Sheet>
```
