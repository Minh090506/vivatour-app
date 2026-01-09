'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import {
  requestFormSchema,
  type RequestFormErrors,
  parseIntegerInput,
  parseNumericInput,
} from '@/lib/validations/request-validation';
import { cn } from '@/lib/utils';
import { safePositiveInt, parseOptionalInt, parseOptionalFloat } from '@/lib/utils/parse-utils';

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

// FormField wrapper component with error display
function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
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
  const [fieldErrors, setFieldErrors] = useState<RequestFormErrors>({});

  // Auto-calculate endDate display
  const calculatedEndDate = useMemo(() => {
    if (formData.startDate && formData.tourDays) {
      const end = calculateEndDate(new Date(formData.startDate), formData.tourDays);
      return formatDateInput(end);
    }
    return '';
  }, [formData.startDate, formData.tourDays]);

  // Validate single field
  const validateField = useCallback((field: keyof RequestFormData, value: unknown) => {
    // Create partial data for field validation
    const testData = { ...formData, [field]: value };
    const result = requestFormSchema.safeParse(testData);

    if (!result.success) {
      const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
      if (fieldError) {
        setFieldErrors((prev) => ({ ...prev, [field]: fieldError.message }));
        return false;
      }
    }
    // Clear error if valid
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field as keyof RequestFormErrors];
      return next;
    });
    return true;
  }, [formData]);

  // Handle blur - validate field
  const handleBlur = useCallback((field: keyof RequestFormData) => {
    validateField(field, formData[field]);
  }, [formData, validateField]);

  // Handle field change - clear error on edit
  const handleChange = useCallback(<K extends keyof RequestFormData>(field: K, value: RequestFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field as keyof RequestFormErrors]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof RequestFormErrors];
        return next;
      });
    }
    // Clear general error
    if (error) setError('');
  }, [fieldErrors, error]);

  // Check if form has errors
  const hasErrors = Object.keys(fieldErrors).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Prepare data with proper type conversions
    const dataToValidate = {
      ...formData,
      pax: parseIntegerInput(formData.pax, 1) ?? 1,
      tourDays: parseIntegerInput(formData.tourDays, null),
      expectedRevenue: parseNumericInput(formData.expectedRevenue, null),
      expectedCost: parseNumericInput(formData.expectedCost, null),
      // Convert empty strings to undefined for optional date fields
      startDate: formData.startDate || undefined,
      whatsapp: formData.whatsapp || undefined,
      notes: formData.notes || undefined,
    };

    // Validate with Zod
    const result = requestFormSchema.safeParse(dataToValidate);

    if (!result.success) {
      // Extract field-level errors
      const errors: RequestFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RequestFormErrors;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      setError('Vui lòng kiểm tra lại thông tin');
      return;
    }

    setLoading(true);
    try {
      // Submit validated data
      await onSubmit(result.data as RequestFormData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Helper for input className with error state
  const inputClassName = (field: keyof RequestFormErrors) =>
    cn(fieldErrors[field] && 'border-destructive focus-visible:ring-destructive');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      )}

      {/* Customer Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Tên khách" required error={fieldErrors.customerName}>
            <Input
              value={formData.customerName}
              onChange={(e) => handleChange('customerName', e.target.value)}
              onBlur={() => handleBlur('customerName')}
              placeholder="Nguyen Van A"
              className={inputClassName('customerName')}
            />
          </FormField>
          <FormField label="Liên hệ" required error={fieldErrors.contact}>
            <Input
              value={formData.contact}
              onChange={(e) => handleChange('contact', e.target.value)}
              onBlur={() => handleBlur('contact')}
              placeholder="email@example.com hoặc SĐT"
              className={inputClassName('contact')}
            />
          </FormField>
          <FormField label="WhatsApp" error={fieldErrors.whatsapp}>
            <Input
              value={formData.whatsapp || ''}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              onBlur={() => handleBlur('whatsapp')}
              placeholder="+84..."
              className={inputClassName('whatsapp')}
            />
          </FormField>
          <FormField label="Số khách (Pax)" required error={fieldErrors.pax}>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.pax}
              onChange={(e) => handleChange('pax', safePositiveInt(e.target.value, 1))}
              onBlur={() => handleBlur('pax')}
              className={inputClassName('pax')}
            />
          </FormField>
          <FormField label="Quốc gia" required error={fieldErrors.country}>
            <Input
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              onBlur={() => handleBlur('country')}
              placeholder="USA, UK, France..."
              className={inputClassName('country')}
            />
          </FormField>
          <FormField label="Nguồn" required error={fieldErrors.source}>
            <Input
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
              onBlur={() => handleBlur('source')}
              placeholder="TripAdvisor, Zalo, Email..."
              className={inputClassName('source')}
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
          <FormField label="Số ngày" error={fieldErrors.tourDays}>
            <Input
              type="number"
              min="1"
              max="365"
              value={formData.tourDays || ''}
              onChange={(e) => handleChange('tourDays', parseOptionalInt(e.target.value))}
              onBlur={() => handleBlur('tourDays')}
              className={inputClassName('tourDays')}
            />
          </FormField>
          <FormField label="Ngày bắt đầu" error={fieldErrors.startDate}>
            <Input
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => handleChange('startDate', e.target.value)}
              onBlur={() => handleBlur('startDate')}
              className={inputClassName('startDate')}
            />
          </FormField>
          <FormField label="Ngày kết thúc (tự động)">
            <Input type="date" value={calculatedEndDate} disabled className="bg-muted" />
          </FormField>
          <FormField label="Doanh thu dự kiến" error={fieldErrors.expectedRevenue}>
            <Input
              type="number"
              min="0"
              value={formData.expectedRevenue || ''}
              onChange={(e) => handleChange('expectedRevenue', parseOptionalFloat(e.target.value))}
              onBlur={() => handleBlur('expectedRevenue')}
              placeholder="VND"
              className={inputClassName('expectedRevenue')}
            />
          </FormField>
          <FormField label="Chi phí dự kiến" error={fieldErrors.expectedCost}>
            <Input
              type="number"
              min="0"
              value={formData.expectedCost || ''}
              onChange={(e) => handleChange('expectedCost', parseOptionalFloat(e.target.value))}
              onBlur={() => handleBlur('expectedCost')}
              placeholder="VND"
              className={inputClassName('expectedCost')}
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
          <FormField label="Trạng thái" required error={fieldErrors.status}>
            <Select
              value={formData.status}
              onValueChange={(v) => handleChange('status', v as RequestStatus)}
            >
              <SelectTrigger className={inputClassName('status')}>
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
          </FormField>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ghi chú</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Ghi chú" error={fieldErrors.notes}>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              onBlur={() => handleBlur('notes')}
              placeholder="Ghi chú thêm..."
              rows={4}
              maxLength={1000}
              className={inputClassName('notes')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {(formData.notes?.length || 0)}/1000 ký tự
            </p>
          </FormField>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={loading || hasErrors}>
          {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  );
}
