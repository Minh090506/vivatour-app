'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { FollowUpStatus } from '@/types';

interface FollowUpStatusFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: FollowUpStatus | null;
  onSuccess: () => void;
}

// Zod schema for validation
const formSchema = z.object({
  status: z.string().min(1, 'Tên trạng thái không được để trống'),
  daysToFollowup: z.number().min(0, 'Số ngày phải >= 0'),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function FollowUpStatusFormModal({
  open,
  onOpenChange,
  status,
  onSuccess,
}: FollowUpStatusFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');

  const isEditMode = status !== null && status !== undefined;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: '',
      daysToFollowup: 0,
      isActive: true,
    },
  });

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      if (status) {
        form.reset({
          status: status.status,
          daysToFollowup: status.daysToFollowup,
          isActive: status.isActive,
        });
        setAliases(status.aliases || []);
      } else {
        form.reset({
          status: '',
          daysToFollowup: 0,
          isActive: true,
        });
        setAliases([]);
      }
      setAliasInput('');
    }
  }, [open, status, form]);

  const handleAliasKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && aliasInput.trim()) {
      e.preventDefault();
      const trimmed = aliasInput.trim();
      if (!aliases.includes(trimmed)) {
        setAliases([...aliases, trimmed]);
        setAliasInput('');
      } else {
        toast.error('Alias đã tồn tại');
      }
    }
  };

  const removeAlias = (index: number) => {
    setAliases(aliases.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const url = isEditMode
        ? `/api/config/follow-up-statuses/${status.id}`
        : '/api/config/follow-up-statuses';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: data.status.trim(),
          aliases: aliases,
          daysToFollowup: data.daysToFollowup,
          isActive: data.isActive,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || 'Có lỗi xảy ra');
        return;
      }

      toast.success(
        isEditMode ? 'Cập nhật trạng thái thành công' : 'Tạo trạng thái thành công'
      );
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Sửa trạng thái' : 'Thêm trạng thái mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Status Name */}
          <div className="space-y-2">
            <Label htmlFor="status">Tên trạng thái *</Label>
            <Input
              id="status"
              {...form.register('status')}
              placeholder="VD: Mới"
              autoComplete="off"
            />
            {form.formState.errors.status && (
              <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
            )}
          </div>

          {/* Aliases */}
          <div className="space-y-2">
            <Label htmlFor="aliases">
              Aliases
              <span className="ml-2 text-xs text-muted-foreground">(Nhấn Enter để thêm)</span>
            </Label>
            <Input
              id="aliases"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={handleAliasKeyDown}
              placeholder="VD: mới, new, moi"
              autoComplete="off"
            />
            {aliases.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {aliases.map((alias, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
                  >
                    {alias}
                    <button
                      type="button"
                      onClick={() => removeAlias(index)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Days to Follow-up */}
          <div className="space-y-2">
            <Label htmlFor="daysToFollowup">Số ngày follow-up *</Label>
            <Input
              id="daysToFollowup"
              type="number"
              min="0"
              {...form.register('daysToFollowup', { valueAsNumber: true })}
              placeholder="VD: 3"
            />
            {form.formState.errors.daysToFollowup && (
              <p className="text-sm text-destructive">
                {form.formState.errors.daysToFollowup.message}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={form.watch('isActive')}
              onCheckedChange={(checked) => form.setValue('isActive', checked === true)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Đang hoạt động
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
