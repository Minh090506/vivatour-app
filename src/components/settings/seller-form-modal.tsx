'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { Seller } from '@/types';

interface SellerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seller: Seller | null; // null = create mode
  onSuccess: () => void;
}

interface FormData {
  telegramId: string;
  sellerName: string;
  sheetName: string;
  metaName: string;
  email: string;
  gender: 'MALE' | 'FEMALE';
  sellerCode: string;
  isActive: boolean;
}

const INITIAL_FORM_DATA: FormData = {
  telegramId: '',
  sellerName: '',
  sheetName: '',
  metaName: '',
  email: '',
  gender: 'MALE',
  sellerCode: '',
  isActive: true,
};

export function SellerFormModal({
  open,
  onOpenChange,
  seller,
  onSuccess,
}: SellerFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  const isEditMode = seller !== null;

  // Initialize form when modal opens
  const getFormDataFromSeller = useCallback(
    (s: Seller | null): FormData => {
      if (!s) return INITIAL_FORM_DATA;
      return {
        telegramId: s.telegramId,
        sellerName: s.sellerName,
        sheetName: s.sheetName,
        metaName: s.metaName || '',
        email: s.email || '',
        gender: s.gender,
        sellerCode: s.sellerCode,
        isActive: s.isActive,
      };
    },
    []
  );

  useEffect(() => {
    if (open) {
      setFormData(getFormDataFromSeller(seller));
    }
  }, [open, seller, getFormDataFromSeller]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    if (!formData.telegramId.trim()) {
      toast.error('Telegram ID không được để trống');
      return;
    }
    if (!formData.sellerName.trim()) {
      toast.error('Tên seller không được để trống');
      return;
    }
    if (!formData.sheetName.trim()) {
      toast.error('Tên sheet không được để trống');
      return;
    }
    if (!formData.sellerCode.trim()) {
      toast.error('Mã seller không được để trống');
      return;
    }
    if (!/^[A-Z]{1,2}$/.test(formData.sellerCode)) {
      toast.error('Mã seller phải là 1-2 ký tự in hoa (A-Z)');
      return;
    }

    setLoading(true);
    try {
      const url = isEditMode
        ? `/api/config/sellers/${seller.id}`
        : '/api/config/sellers';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: formData.telegramId.trim(),
          sellerName: formData.sellerName.trim(),
          sheetName: formData.sheetName.trim(),
          metaName: formData.metaName.trim() || null,
          email: formData.email.trim() || null,
          gender: formData.gender,
          sellerCode: formData.sellerCode.trim().toUpperCase(),
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || 'Có lỗi xảy ra');
        return;
      }

      toast.success(isEditMode ? 'Cập nhật seller thành công' : 'Tạo seller thành công');
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Sửa thông tin Seller' : 'Thêm Seller mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Telegram ID */}
          <div className="space-y-2">
            <Label htmlFor="telegramId">Telegram ID *</Label>
            <Input
              id="telegramId"
              value={formData.telegramId}
              onChange={(e) => updateField('telegramId', e.target.value)}
              placeholder="VD: 123456789"
              required
            />
          </div>

          {/* Seller Name & Code */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sellerName">Tên Seller *</Label>
              <Input
                id="sellerName"
                value={formData.sellerName}
                onChange={(e) => updateField('sellerName', e.target.value)}
                placeholder="VD: Ly - Jenny"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellerCode">Mã *</Label>
              <Input
                id="sellerCode"
                value={formData.sellerCode}
                onChange={(e) =>
                  updateField('sellerCode', e.target.value.toUpperCase())
                }
                placeholder="VD: J"
                maxLength={2}
                required
              />
            </div>
          </div>

          {/* Sheet Name */}
          <div className="space-y-2">
            <Label htmlFor="sheetName">Tên Sheet *</Label>
            <Input
              id="sheetName"
              value={formData.sheetName}
              onChange={(e) => updateField('sheetName', e.target.value)}
              placeholder="VD: Ly - Jenny"
              required
            />
          </div>

          {/* Meta Name */}
          <div className="space-y-2">
            <Label htmlFor="metaName">Tên Meta (Facebook)</Label>
            <Input
              id="metaName"
              value={formData.metaName}
              onChange={(e) => updateField('metaName', e.target.value)}
              placeholder="VD: Jenny Nguyen"
            />
          </div>

          {/* Email & Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="VD: jenny@vivatour.vn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính *</Label>
              <Select
                value={formData.gender}
                onValueChange={(v) => updateField('gender', v as 'MALE' | 'FEMALE')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Nam</SelectItem>
                  <SelectItem value="FEMALE">Nữ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                updateField('isActive', checked === true)
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Đang hoạt động
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
