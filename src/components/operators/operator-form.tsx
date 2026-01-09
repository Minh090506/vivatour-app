'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SERVICE_TYPES, SERVICE_TYPE_KEYS, DEFAULT_VAT_RATE } from '@/config/operator-config';
import type { Supplier } from '@/types';
import {
  validateOperatorForm,
  type OperatorFormErrors,
  parseOperatorNumericInput,
} from '@/lib/validations/operator-validation';

interface Request {
  id: string;
  code: string;
  customerName: string;
  status: string;
}

// Minimal operator data needed for the form
interface OperatorData {
  id: string;
  requestId: string;
  supplierId?: string | null;
  supplier?: string | null;
  serviceDate: Date | string;
  serviceType: string;
  serviceName: string;
  costBeforeTax: number;
  vat?: number | null;
  totalCost: number;
  paidAmount?: number;
  paymentDeadline?: Date | string | null;
  bankAccount?: string | null;
  notes?: string | null;
}

interface OperatorFormProps {
  operator?: OperatorData;
  requestId?: string; // Pre-selected request
  onSuccess?: () => void;
}

export function OperatorForm({ operator, requestId, onSuccess }: OperatorFormProps) {
  const router = useRouter();
  const isEditing = !!operator;

  // Form state
  const [formData, setFormData] = useState({
    requestId: operator?.requestId || requestId || '',
    supplierId: operator?.supplierId || '',
    supplier: operator?.supplier || '',
    serviceDate: operator?.serviceDate
      ? new Date(operator.serviceDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    serviceType: operator?.serviceType || '',
    serviceName: operator?.serviceName || '',
    costBeforeTax: operator?.costBeforeTax?.toString() || '',
    vat: operator?.vat?.toString() || '',
    totalCost: operator?.totalCost?.toString() || '',
    paymentDeadline: operator?.paymentDeadline
      ? new Date(operator.paymentDeadline).toISOString().split('T')[0]
      : '',
    paidAmount: operator?.paidAmount?.toString() || '0',
    bankAccount: operator?.bankAccount || '',
    notes: operator?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<OperatorFormErrors>({});

  // Data for dropdowns
  const [requests, setRequests] = useState<Request[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch F5 requests and suppliers
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [reqRes, supRes] = await Promise.all([
          fetch('/api/requests?status=F5&limit=100'),
          fetch('/api/suppliers?isActive=true'),
        ]);

        const [reqData, supData] = await Promise.all([
          reqRes.json(),
          supRes.json(),
        ]);

        if (reqData.success) setRequests(reqData.data || []);
        if (supData.success) setSuppliers(supData.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Auto-calculate totalCost when costBeforeTax or vat changes
  const calculateTotal = useCallback(() => {
    const cost = parseFloat(formData.costBeforeTax) || 0;
    const vatAmount = parseFloat(formData.vat) || 0;
    const total = cost + vatAmount;
    setFormData((prev) => ({ ...prev, totalCost: total.toString() }));
  }, [formData.costBeforeTax, formData.vat]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  // Auto-fill VAT when costBeforeTax changes (default 10%)
  const handleCostChange = (value: string) => {
    const cost = parseFloat(value) || 0;
    const vatAmount = Math.round(cost * DEFAULT_VAT_RATE / 100);
    setFormData((prev) => ({
      ...prev,
      costBeforeTax: value,
      vat: vatAmount.toString(),
    }));
  };

  // Auto-fill supplier name and bank account when supplier selected
  const handleSupplierChange = (supplierId: string) => {
    if (supplierId === 'none') {
      setFormData((prev) => ({ ...prev, supplierId: '', supplier: '', bankAccount: '' }));
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    if (selectedSupplier) {
      setFormData((prev) => ({
        ...prev,
        supplierId,
        supplier: selectedSupplier.name,
        bankAccount: selectedSupplier.bankAccount || prev.bankAccount,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      // Build data for validation
      const dataToValidate = {
        requestId: formData.requestId,
        serviceDate: formData.serviceDate,
        serviceType: formData.serviceType,
        serviceName: formData.serviceName,
        supplierId: formData.supplierId || null,
        supplier: formData.supplier || null,
        costBeforeTax: parseOperatorNumericInput(formData.costBeforeTax, 0),
        vat: formData.vat ? parseOperatorNumericInput(formData.vat, 0) : null,
        totalCost: parseOperatorNumericInput(formData.totalCost, 0),
        paidAmount: parseOperatorNumericInput(formData.paidAmount, 0),
        paymentDeadline: formData.paymentDeadline || null,
        bankAccount: formData.bankAccount || null,
        notes: formData.notes || null,
      };

      // Client-side validation with Zod
      const validation = validateOperatorForm(dataToValidate);
      if (!validation.success) {
        setFieldErrors(validation.errors || {});
        setError('Vui lòng kiểm tra lại thông tin');
        setLoading(false);
        return;
      }

      const url = isEditing ? `/api/operators/${operator.id}` : '/api/operators';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToValidate),
      });

      const data = await res.json();

      if (!data.success) {
        // Handle field-level errors from API
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        setError(data.error || 'Có lỗi xảy ra');
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/operators/${data.data.id}`);
      }
    } catch {
      setError('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Clear field error when user starts typing
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field as keyof OperatorFormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  if (loadingData) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Booking Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requestId">Booking *</Label>
            <Select
              value={formData.requestId}
              onValueChange={(v) => updateField('requestId', v)}
              disabled={isEditing || !!requestId}
            >
              <SelectTrigger className={fieldErrors.requestId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Chọn Booking (F5)" />
              </SelectTrigger>
              <SelectContent>
                {requests.length === 0 ? (
                  <SelectItem value="none" disabled>Không có Booking F5</SelectItem>
                ) : (
                  requests.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.code} - {req.customerName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {fieldErrors.requestId && (
              <p className="text-sm text-red-500">{fieldErrors.requestId}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Chỉ hiển thị Booking đã xác nhận (F5)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Service Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin dịch vụ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceDate">Ngày dịch vụ *</Label>
              <Input
                id="serviceDate"
                type="date"
                value={formData.serviceDate}
                onChange={(e) => updateField('serviceDate', e.target.value)}
                className={fieldErrors.serviceDate ? 'border-red-500' : ''}
                required
              />
              {fieldErrors.serviceDate && (
                <p className="text-sm text-red-500">{fieldErrors.serviceDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceType">Loại dịch vụ *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(v) => updateField('serviceType', v)}
              >
                <SelectTrigger className={fieldErrors.serviceType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Chọn loại dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {SERVICE_TYPES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.serviceType && (
                <p className="text-sm text-red-500">{fieldErrors.serviceType}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceName">Tên dịch vụ *</Label>
            <Input
              id="serviceName"
              value={formData.serviceName}
              onChange={(e) => updateField('serviceName', e.target.value)}
              placeholder="VD: Khách sạn Mường Thanh - 2 đêm"
              className={fieldErrors.serviceName ? 'border-red-500' : ''}
              required
            />
            {fieldErrors.serviceName && (
              <p className="text-sm text-red-500">{fieldErrors.serviceName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierId">Nhà cung cấp</Label>
              <Select
                value={formData.supplierId || 'none'}
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn NCC (tùy chọn)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Nhập tay --</SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.code} - {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Tên NCC {!formData.supplierId && '*'}</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => updateField('supplier', e.target.value)}
                placeholder="Nhập tên NCC nếu không chọn"
                disabled={!!formData.supplierId}
                className={fieldErrors.supplier ? 'border-red-500' : ''}
              />
              {fieldErrors.supplier && (
                <p className="text-sm text-red-500">{fieldErrors.supplier}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Info */}
      <Card>
        <CardHeader>
          <CardTitle>Chi phí</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costBeforeTax">Chi phí trước thuế *</Label>
              <Input
                id="costBeforeTax"
                type="number"
                value={formData.costBeforeTax}
                onChange={(e) => handleCostChange(e.target.value)}
                placeholder="1000000"
                className={fieldErrors.costBeforeTax ? 'border-red-500' : ''}
                required
              />
              {fieldErrors.costBeforeTax && (
                <p className="text-sm text-red-500">{fieldErrors.costBeforeTax}</p>
              )}
              {formData.costBeforeTax && !fieldErrors.costBeforeTax && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(parseFloat(formData.costBeforeTax) || 0)} ₫
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">VAT ({DEFAULT_VAT_RATE}%)</Label>
              <Input
                id="vat"
                type="number"
                value={formData.vat}
                onChange={(e) => updateField('vat', e.target.value)}
                placeholder="100000"
              />
              {formData.vat && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(parseFloat(formData.vat) || 0)} ₫
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalCost">Tổng chi phí</Label>
              <Input
                id="totalCost"
                type="number"
                value={formData.totalCost}
                onChange={(e) => updateField('totalCost', e.target.value)}
                className={`bg-gray-100 font-bold ${fieldErrors.totalCost ? 'border-red-500' : ''}`}
              />
              {fieldErrors.totalCost && (
                <p className="text-sm text-red-500">{fieldErrors.totalCost}</p>
              )}
              {formData.totalCost && !fieldErrors.totalCost && (
                <p className="text-sm font-medium text-primary">
                  {formatCurrency(parseFloat(formData.totalCost) || 0)} ₫
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDeadline">Hạn thanh toán</Label>
              <Input
                id="paymentDeadline"
                type="date"
                value={formData.paymentDeadline}
                onChange={(e) => updateField('paymentDeadline', e.target.value)}
                className={fieldErrors.paymentDeadline ? 'border-red-500' : ''}
              />
              {fieldErrors.paymentDeadline && (
                <p className="text-sm text-red-500">{fieldErrors.paymentDeadline}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAmount">Đã thanh toán</Label>
              <Input
                id="paidAmount"
                type="number"
                min="0"
                max={formData.totalCost}
                value={formData.paidAmount}
                onChange={(e) => updateField('paidAmount', e.target.value)}
                placeholder="0"
                className={fieldErrors.paidAmount ? 'border-red-500' : ''}
              />
              {fieldErrors.paidAmount && (
                <p className="text-sm text-red-500">{fieldErrors.paidAmount}</p>
              )}
              {formData.paidAmount && parseFloat(formData.paidAmount) > 0 && !fieldErrors.paidAmount && (
                <p className="text-sm text-green-600">
                  {formatCurrency(parseFloat(formData.paidAmount))} ₫
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Còn nợ</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-gray-100 flex items-center">
                <span className={`font-medium ${
                  (parseFloat(formData.totalCost) || 0) - (parseFloat(formData.paidAmount) || 0) > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {formatCurrency(
                    Math.max(0, (parseFloat(formData.totalCost) || 0) - (parseFloat(formData.paidAmount) || 0))
                  )} ₫
                </span>
              </div>
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Ghi chú về dịch vụ..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo dịch vụ'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Hủy
        </Button>
      </div>
    </form>
  );
}
