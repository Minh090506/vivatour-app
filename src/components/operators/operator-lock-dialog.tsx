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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Lock, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OperatorLockDialog({ open, onOpenChange, onSuccess }: Props) {
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  // Get default month (previous month)
  const getDefaultMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const handlePreview = async () => {
    if (!month) return;

    try {
      const res = await fetch(`/api/operators/lock-period?month=${month}`);
      const data = await res.json();
      if (data.success) {
        setPreviewCount(data.data.unlocked);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLock = async () => {
    if (!month) return;

    setLoading(true);
    try {
      const res = await fetch('/api/operators/lock-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          // Note: userId is extracted from session on server side
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã khóa ${data.data.count} dịch vụ kỳ ${month}`);
        onOpenChange(false);
        setMonth('');
        setPreviewCount(null);
        onSuccess?.();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi khóa kỳ');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setMonth('');
      setPreviewCount(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Khóa Kỳ Kế Toán
          </DialogTitle>
          <DialogDescription>
            Khóa tất cả dịch vụ trong kỳ để ngăn chỉnh sửa sau khi đã đối soát.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="month">Kỳ cần khóa</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPreviewCount(null);
              }}
              placeholder={getDefaultMonth()}
            />
          </div>

          {month && previewCount === null && (
            <Button variant="outline" onClick={handlePreview}>
              Xem trước
            </Button>
          )}

          {previewCount !== null && (
            <div className="p-4 bg-yellow-50 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  {previewCount} dịch vụ sẽ bị khóa
                </p>
                <p className="text-sm text-yellow-700">
                  Sau khi khóa, chỉ Admin mới có thể mở khóa từng dịch vụ.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleLock}
            disabled={!month || loading}
            variant="destructive"
          >
            {loading ? 'Đang khóa...' : 'Khóa kỳ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
