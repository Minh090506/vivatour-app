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
import type { LockTier, LockState } from '@/lib/lock-utils';

interface RevenueLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenueId: string;
  currentState: LockState;
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

  // Determine which tiers can be locked (sequential progression)
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
        throw new Error(data.error || 'Khóa thất bại');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khóa thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError(null);
      // Reset to next available tier
      if (canLockKT) setTier('KT');
      else if (canLockAdmin) setTier('Admin');
      else if (canLockFinal) setTier('Final');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
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
