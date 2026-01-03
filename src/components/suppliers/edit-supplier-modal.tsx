'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_KEYS,
  SUPPLIER_LOCATIONS,
  SUPPLIER_LOCATION_KEYS,
  PAYMENT_MODELS,
  CUSTOM_LOCATION,
} from '@/config/supplier-config';
import type { Supplier, PaymentModel } from '@/types';

interface EditSupplierModalProps {
  supplier: Supplier;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  type: string;
  location: string;
  paymentModel: PaymentModel;
  creditLimit: string;
  paymentTermDays: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  bankAccount: string;
  isActive: boolean;
  notes: string;
}

export function EditSupplierModal({ supplier, onSuccess }: EditSupplierModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize form data from supplier
  const getInitialFormData = useCallback((): FormData => ({
    name: supplier.name,
    type: supplier.type,
    location: supplier.location || '',
    paymentModel: supplier.paymentModel,
    creditLimit: supplier.creditLimit?.toString() || '',
    paymentTermDays: supplier.paymentTermDays?.toString() || '',
    contactName: supplier.contactName || '',
    contactPhone: supplier.contactPhone || '',
    contactEmail: supplier.contactEmail || '',
    bankAccount: supplier.bankAccount || '',
    isActive: supplier.isActive,
    notes: supplier.notes || '',
  }), [supplier]);

  const [formData, setFormData] = useState<FormData>(getInitialFormData);

  // Reset form when dialog opens with fresh supplier data
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
    }
  }, [open, getInitialFormData]);

  // Check if location is custom (not in predefined list)
  const isCustomLocation = formData.location === CUSTOM_LOCATION ||
    (formData.location && !(formData.location in SUPPLIER_LOCATIONS));

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    if (!formData.name.trim()) {
      toast.error('Tên NCC không được để trống');
      return;
    }
    if (!formData.type) {
      toast.error('Vui lòng chọn loại NCC');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          location: formData.location || null,
          paymentModel: formData.paymentModel,
          creditLimit: formData.creditLimit ? parseInt(formData.creditLimit, 10) : null,
          paymentTermDays: formData.paymentTermDays ? parseInt(formData.paymentTermDays, 10) : null,
          contactName: formData.contactName.trim() || null,
          contactPhone: formData.contactPhone.trim() || null,
          contactEmail: formData.contactEmail.trim() || null,
          bankAccount: formData.bankAccount.trim() || null,
          isActive: formData.isActive,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || 'Có lỗi xảy ra');
        return;
      }

      toast.success('Cập nhật NCC thành công');
      setOpen(false);
      onSuccess();
    } catch {
      toast.error('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" /> Sửa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa thông tin NCC</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên NCC *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="VD: An Khánh Hotel"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Loại NCC *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => updateField('type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại NCC" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_TYPE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {SUPPLIER_TYPES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location & Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Địa phương</Label>
              <Select
                value={formData.location || 'none'}
                onValueChange={(v) => updateField('location', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn địa phương" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Không chọn --</SelectItem>
                  {SUPPLIER_LOCATION_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {SUPPLIER_LOCATIONS[key].label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_LOCATION}>Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentModel">Hình thức thanh toán *</Label>
              <Select
                value={formData.paymentModel}
                onValueChange={(v) => updateField('paymentModel', v as PaymentModel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_MODELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Credit fields - conditional */}
          {formData.paymentModel === 'CREDIT' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Hạn mức công nợ</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => updateField('creditLimit', e.target.value)}
                  placeholder="100000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTermDays">Số ngày thanh toán</Label>
                <Input
                  id="paymentTermDays"
                  type="number"
                  value={formData.paymentTermDays}
                  onChange={(e) => updateField('paymentTermDays', e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Người liên hệ</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => updateField('contactName', e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Số điện thoại</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => updateField('contactPhone', e.target.value)}
                placeholder="0901234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                placeholder="contact@supplier.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Tài khoản ngân hàng</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => updateField('bankAccount', e.target.value)}
                placeholder="0123456789 - Vietcombank"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="isActive">Trạng thái</Label>
            <Select
              value={formData.isActive ? 'true' : 'false'}
              onValueChange={(v) => updateField('isActive', v === 'true')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Đang hoạt động</SelectItem>
                <SelectItem value="false">Ngừng hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Ghi chú về NCC..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
