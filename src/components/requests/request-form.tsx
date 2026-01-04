'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  REQUEST_STAGES,
  REQUEST_STAGE_KEYS,
  getStatusesByStage,
  REQUEST_STATUSES,
} from '@/config/request-config';
import type { Request, RequestFormData, RequestStatus } from '@/types';

// Client-safe utility - calculate end date from start + tourDays
function calculateEndDate(startDate: Date, tourDays: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + tourDays - 1);
  return end;
}

interface RequestFormProps {
  initialData?: Partial<Request>;
  onSubmit: (data: RequestFormData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

// Helper: format date for input field (YYYY-MM-DD)
function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// FormField wrapper component
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function RequestForm({ initialData, onSubmit, onCancel, isEditing = false }: RequestFormProps) {
  const [formData, setFormData] = useState<RequestFormData>({
    customerName: initialData?.customerName || '',
    contact: initialData?.contact || '',
    whatsapp: initialData?.whatsapp || '',
    pax: initialData?.pax || 1,
    country: initialData?.country || '',
    source: initialData?.source || '',
    status: initialData?.status || 'DANG_LL_CHUA_TL',
    tourDays: initialData?.tourDays || undefined,
    startDate: initialData?.startDate ? formatDateInput(initialData.startDate) : '',
    expectedRevenue: initialData?.expectedRevenue || undefined,
    expectedCost: initialData?.expectedCost || undefined,
    notes: initialData?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate endDate display
  const calculatedEndDate = useMemo(() => {
    if (formData.startDate && formData.tourDays) {
      const end = calculateEndDate(new Date(formData.startDate), formData.tourDays);
      return formatDateInput(end);
    }
    return '';
  }, [formData.startDate, formData.tourDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.customerName || !formData.contact || !formData.country || !formData.source) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {/* Customer Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Tên khách" required>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Nguyen Van A"
            />
          </FormField>
          <FormField label="Liên hệ" required>
            <Input
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="email@example.com hoặc SĐT"
            />
          </FormField>
          <FormField label="WhatsApp">
            <Input
              value={formData.whatsapp || ''}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="+84..."
            />
          </FormField>
          <FormField label="Số khách (Pax)" required>
            <Input
              type="number"
              min="1"
              value={formData.pax}
              onChange={(e) => setFormData({ ...formData, pax: parseInt(e.target.value) || 1 })}
            />
          </FormField>
          <FormField label="Quốc gia" required>
            <Input
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="USA, UK, France..."
            />
          </FormField>
          <FormField label="Nguồn" required>
            <Input
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="TripAdvisor, Zalo, Email..."
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Tour Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Tour</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Số ngày">
            <Input
              type="number"
              min="1"
              value={formData.tourDays || ''}
              onChange={(e) =>
                setFormData({ ...formData, tourDays: e.target.value ? parseInt(e.target.value) : undefined })
              }
            />
          </FormField>
          <FormField label="Ngày bắt đầu">
            <Input
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </FormField>
          <FormField label="Ngày kết thúc (tự động)">
            <Input type="date" value={calculatedEndDate} disabled className="bg-muted" />
          </FormField>
          <FormField label="Doanh thu dự kiến">
            <Input
              type="number"
              value={formData.expectedRevenue || ''}
              onChange={(e) =>
                setFormData({ ...formData, expectedRevenue: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              placeholder="VND"
            />
          </FormField>
          <FormField label="Chi phí dự kiến">
            <Input
              type="number"
              value={formData.expectedCost || ''}
              onChange={(e) =>
                setFormData({ ...formData, expectedCost: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              placeholder="VND"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Status Section */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as RequestStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_STAGE_KEYS.map((stage) => (
                <SelectGroup key={stage}>
                  <SelectLabel>{REQUEST_STAGES[stage].label}</SelectLabel>
                  {getStatusesByStage(stage).map((status) => (
                    <SelectItem key={status} value={status}>
                      {REQUEST_STATUSES[status].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ghi chú</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ghi chú thêm..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  );
}
