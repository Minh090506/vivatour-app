'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_KEYS,
  SUPPLIER_LOCATIONS,
  SUPPLIER_LOCATION_KEYS,
  PAYMENT_MODELS,
  CUSTOM_LOCATION,
  generateSupplierCode,
  type SupplierTypeKey,
  type SupplierLocationKey,
} from '@/config/supplier-config';
import type { Supplier, PaymentModel } from '@/types';

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
    location: supplier?.location || '',
    customLocation: '',
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
  const [generatedCode, setGeneratedCode] = useState('');

  // Check if location is custom (not in predefined list)
  const isCustomLocation = formData.location === CUSTOM_LOCATION ||
    (formData.location && !(formData.location in SUPPLIER_LOCATIONS));

  // Generate code when type, name, or location changes
  const fetchGeneratedCode = useCallback(async () => {
    if (!formData.type || !formData.name || isEditing) return;

    try {
      const locationParam = isCustomLocation ? '' : formData.location;
      const params = new URLSearchParams({
        type: formData.type,
        name: formData.name,
        ...(locationParam && { location: locationParam }),
      });

      const res = await fetch(`/api/suppliers/generate-code?${params}`);
      const data = await res.json();

      if (data.success) {
        setGeneratedCode(data.data.code);
      }
    } catch (err) {
      console.error('Error generating code:', err);
      // Fallback to client-side generation
      const code = generateSupplierCode(
        formData.type as SupplierTypeKey,
        formData.name,
        isCustomLocation ? null : formData.location as SupplierLocationKey,
        1
      );
      setGeneratedCode(code);
    }
  }, [formData.type, formData.name, formData.location, isCustomLocation, isEditing]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchGeneratedCode();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchGeneratedCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing ? `/api/suppliers/${supplier.id}` : '/api/suppliers';
      const method = isEditing ? 'PUT' : 'POST';

      // Determine final location value
      let finalLocation: string | undefined = formData.location || undefined;
      if (formData.location === CUSTOM_LOCATION && formData.customLocation) {
        finalLocation = formData.customLocation;
      } else if (!formData.location || formData.location === 'none') {
        finalLocation = undefined;
      }

      const body = {
        code: isEditing ? formData.code : generatedCode, // Use generated code for new suppliers
        name: formData.name,
        type: formData.type,
        location: finalLocation,
        paymentModel: formData.paymentModel,
        creditLimit: formData.creditLimit ? parseInt(formData.creditLimit) : null,
        paymentTermDays: formData.paymentTermDays ? parseInt(formData.paymentTermDays) : null,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        bankAccount: formData.bankAccount,
        isActive: formData.isActive,
        notes: formData.notes,
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
          {/* Type and Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Loại NCC *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => updateField('type', v)}
                disabled={isEditing}
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
          </div>

          {/* Location row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Địa phương</Label>
              <Select
                value={formData.location || 'none'}
                onValueChange={(v) => {
                  updateField('location', v === 'none' ? '' : v);
                  if (v !== CUSTOM_LOCATION) {
                    updateField('customLocation', '');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn địa phương (tùy chọn)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Không chọn --</SelectItem>
                  {SUPPLIER_LOCATION_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {SUPPLIER_LOCATIONS[key].label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_LOCATION}>Khác (nhập tay)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom location input */}
            {formData.location === CUSTOM_LOCATION && (
              <div className="space-y-2">
                <Label htmlFor="customLocation">Địa phương khác</Label>
                <Input
                  id="customLocation"
                  value={formData.customLocation}
                  onChange={(e) => updateField('customLocation', e.target.value)}
                  placeholder="Nhập tên địa phương"
                />
              </div>
            )}

            {/* Generated Code Display */}
            {!isEditing && formData.location !== CUSTOM_LOCATION && (
              <div className="space-y-2">
                <Label>Mã NCC (tự động)</Label>
                <Input
                  value={generatedCode || 'Nhập loại và tên để tạo mã...'}
                  readOnly
                  className="bg-gray-100 font-mono"
                />
              </div>
            )}
          </div>

          {/* Show code for editing or after custom location */}
          {(isEditing || formData.location === CUSTOM_LOCATION) && (
            <div className="space-y-2">
              <Label>Mã NCC {isEditing ? '' : '(tự động)'}</Label>
              <Input
                value={isEditing ? formData.code : (generatedCode || 'Nhập loại và tên để tạo mã...')}
                readOnly
                className="bg-gray-100 font-mono"
              />
            </div>
          )}

          {/* Payment model row */}
          <div className="grid grid-cols-2 gap-4">
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
                  {Object.entries(PAYMENT_MODELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
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
        <Button type="submit" disabled={loading || (!isEditing && !generatedCode)}>
          {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo NCC'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
