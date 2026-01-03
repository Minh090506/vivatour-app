'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPLIER_TYPES, type Supplier, type PaymentModel } from '@/types';

interface SupplierFormProps {
  supplier?: Supplier;
  onSuccess?: () => void;
}

export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const router = useRouter();
  const isEditing = !!supplier;

  const [formData, setFormData] = useState({
    code: supplier?.code || '',
    name: supplier?.name || '',
    type: supplier?.type || '',
    paymentModel: supplier?.paymentModel || 'PREPAID' as PaymentModel,
    creditLimit: supplier?.creditLimit?.toString() || '',
    paymentTermDays: supplier?.paymentTermDays?.toString() || '',
    contactName: supplier?.contactName || '',
    contactPhone: supplier?.contactPhone || '',
    contactEmail: supplier?.contactEmail || '',
    bankAccount: supplier?.bankAccount || '',
    isActive: supplier?.isActive ?? true,
    notes: supplier?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing ? `/api/suppliers/${supplier.id}` : '/api/suppliers';
      const method = isEditing ? 'PUT' : 'POST';

      const body = {
        ...formData,
        creditLimit: formData.creditLimit ? parseInt(formData.creditLimit) : null,
        paymentTermDays: formData.paymentTermDays ? parseInt(formData.paymentTermDays) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Có lỗi xảy ra');
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/suppliers/${data.data.id}`);
      }
    } catch {
      setError('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Mã NCC *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder="VD: VNA-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tên NCC *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Vietnam Airlines"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Loại NCC *</Label>
              <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại NCC" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentModel">Hình thức thanh toán *</Label>
              <Select
                value={formData.paymentModel}
                onValueChange={(v) => updateField('paymentModel', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREPAID">Trả trước (Deposit pool)</SelectItem>
                  <SelectItem value="PAY_PER_USE">Thanh toán theo đơn</SelectItem>
                  <SelectItem value="CREDIT">Công nợ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin liên hệ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Status & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Ghi chú về NCC..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo NCC'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
