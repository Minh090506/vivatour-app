'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { Lock, Loader2, AlertCircle, Info } from 'lucide-react';
import { LOCK_TIER_LABELS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';
import type { Role } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  userRole?: Role; // To control which tiers are visible
}

interface PreviewData {
  month: string;
  tier: LockTier;
  count: number;
  operators: Array<{
    id: string;
    serviceName: string;
    serviceDate: string;
    totalCost: number;
  }>;
}

export function OperatorLockDialog({ open, onOpenChange, onSuccess, userRole = 'ACCOUNTANT' }: Props) {
  // Default month to current month
  const getDefaultMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [month, setMonth] = useState(getDefaultMonth);
  const [tier, setTier] = useState<LockTier>('KT');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available tiers based on role
  const availableTiers: LockTier[] =
    userRole === 'ADMIN' ? ['KT', 'Admin', 'Final'] : ['KT'];

  const handlePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/operators/lock-period?month=${month}&tier=${tier}`
      );
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Không thể xem trước');
      }

      setPreview({
        month,
        tier,
        count: data.data.count,
        operators: data.data.operators || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xem trước');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch('/api/operators/lock-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, tier }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Không thể khóa');
      }

      toast.success(
        `Đã khóa ${data.data.count} dịch vụ với mức ${LOCK_TIER_LABELS[tier]}`
      );
      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khóa');
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setPreview(null);
      setError(null);
      setMonth(getDefaultMonth());
      setTier('KT');
    }, 200);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN').format(value);

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
                  {availableTiers.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LOCK_TIER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tier info */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              {tier === 'KT' && (
                <>
                  <strong>Khóa KT:</strong> Khóa các operator chưa có khóa nào.
                  KT và Admin đều có thể mở khóa.
                </>
              )}
              {tier === 'Admin' && (
                <>
                  <strong>Khóa Admin:</strong> Khóa các operator đã khóa KT nhưng chưa khóa Admin.
                  Chỉ Admin có thể mở khóa.
                </>
              )}
              {tier === 'Final' && (
                <>
                  <strong>Khóa Cuối:</strong> Khóa vĩnh viễn các operator đã khóa Admin.
                  Chỉ Admin có thể mở khóa.
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {preview && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Số lượng cần khóa:</span>
                <span className="text-lg font-bold">{preview.count}</span>
              </div>

              {preview.count > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Sẽ khóa {preview.count} operator với mức{' '}
                    <strong>{LOCK_TIER_LABELS[tier]}</strong>
                  </p>

                  {/* Show preview list if count <= 10 */}
                  {preview.operators.length > 0 && preview.operators.length <= 10 && (
                    <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                      {preview.operators.map((op) => (
                        <div
                          key={op.id}
                          className="text-xs text-muted-foreground flex justify-between"
                        >
                          <span className="truncate flex-1">{op.serviceName}</span>
                          <span className="ml-2 shrink-0">
                            {formatCurrency(op.totalCost)} ₫
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Không có operator nào cần khóa với mức {LOCK_TIER_LABELS[tier]}.
                  {tier !== 'KT' && ' Có thể cần khóa tier thấp hơn trước.'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>

          {!preview ? (
            <Button onClick={handlePreview} disabled={loading || !month}>
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
