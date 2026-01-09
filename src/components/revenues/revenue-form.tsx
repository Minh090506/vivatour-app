'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { usePermission } from '@/hooks/use-permission';
import { safeFetch, safePost, safePut } from '@/lib/api/fetch-utils';

// Payment types (inline to avoid build-time dependency)
const PAYMENT_TYPES = {
  DEPOSIT: { label: 'Đặt cọc' },
  FULL_PAYMENT: { label: 'Thanh toán đủ' },
  PARTIAL: { label: 'Thanh toán một phần' },
  REFUND: { label: 'Hoàn tiền' },
} as const;

const PAYMENT_SOURCES = {
  BANK_TRANSFER: { label: 'Chuyển khoản' },
  CASH: { label: 'Tiền mặt' },
  CARD: { label: 'Thẻ tín dụng' },
  PAYPAL: { label: 'PayPal' },
  WISE: { label: 'Wise' },
  OTHER: { label: 'Khác' },
} as const;

type PaymentTypeKey = keyof typeof PAYMENT_TYPES;
type PaymentSourceKey = keyof typeof PAYMENT_SOURCES;

interface Request {
  id: string;
  code: string;
  customerName: string;
  bookingCode?: string | null;
}

interface RevenueData {
  id: string;
  requestId: string;
  paymentDate: Date | string;
  paymentType: string;
  foreignAmount?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  amountVND: number;
  paymentSource: string;
  notes?: string | null;
  // 3-tier lock fields
  lockKT?: boolean;
  lockAdmin?: boolean;
  lockFinal?: boolean;
  // Legacy field for backward compatibility
  isLocked?: boolean;
}

interface RevenueFormProps {
  revenue?: RevenueData;
  requestId?: string; // Pre-selected request
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RevenueForm({ revenue, requestId, onSuccess, onCancel }: RevenueFormProps) {
  const { userId } = usePermission();
  const isEditing = !!revenue;

  // Form state
  const [formData, setFormData] = useState({
    requestId: revenue?.requestId || requestId || '',
    paymentDate: revenue?.paymentDate
      ? new Date(revenue.paymentDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    paymentType: revenue?.paymentType || '',
    paymentSource: revenue?.paymentSource || '',
    notes: revenue?.notes || '',
  });

  const [currencyData, setCurrencyData] = useState({
    currency: revenue?.currency || 'VND',
    foreignAmount: revenue?.foreignAmount ? Number(revenue.foreignAmount) : null,
    exchangeRate: revenue?.exchangeRate ? Number(revenue.exchangeRate) : null,
    amountVND: revenue?.amountVND ? Number(revenue.amountVND) : 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Fetch requests with booking codes
  useEffect(() => {
    const fetchRequests = async () => {
      setLoadingRequests(true);
      const { data, error } = await safeFetch<Request[]>('/api/requests?stage=OUTCOME&limit=100');
      if (error) {
        console.error('Error fetching requests:', error);
      } else {
        setRequests(data || []);
      }
      setLoadingRequests(false);
    };
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.requestId) {
      setError('Vui long chon Booking');
      setLoading(false);
      return;
    }
    if (!formData.paymentType) {
      setError('Vui long chon loai thanh toan');
      setLoading(false);
      return;
    }
    if (!formData.paymentSource) {
      setError('Vui long chon nguon thanh toan');
      setLoading(false);
      return;
    }
    if (currencyData.amountVND <= 0) {
      setError('So tien VND phai > 0');
      setLoading(false);
      return;
    }

    const body = {
      requestId: formData.requestId,
      paymentDate: formData.paymentDate,
      paymentType: formData.paymentType,
      paymentSource: formData.paymentSource,
      currency: currencyData.currency,
      foreignAmount: currencyData.foreignAmount,
      exchangeRate: currencyData.exchangeRate,
      amountVND: currencyData.amountVND,
      notes: formData.notes?.trim() || null,
      userId: userId || 'unknown',
    };

    const { error: apiError } = isEditing
      ? await safePut(`/api/revenues/${revenue.id}`, body)
      : await safePost('/api/revenues', body);

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return;
    }

    setLoading(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loadingRequests) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  // Check if any lock tier is active (3-tier or legacy)
  const isLocked = revenue?.lockKT || revenue?.lockAdmin || revenue?.lockFinal || revenue?.isLocked;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {isLocked && (
        <div className="bg-amber-50 text-amber-600 p-4 rounded-lg">
          Thu nhập đã khóa - không thể chỉnh sửa
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
              disabled={isEditing || !!requestId || isLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn Booking" />
              </SelectTrigger>
              <SelectContent>
                {requests.length === 0 ? (
                  <SelectItem value="none" disabled>Không có Booking</SelectItem>
                ) : (
                  requests.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.bookingCode || req.code} - {req.customerName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Ngày thanh toán *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => updateField('paymentDate', e.target.value)}
                disabled={isLocked}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Loại thanh toán *</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(v) => updateField('paymentType', v)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_TYPES) as PaymentTypeKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PAYMENT_TYPES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentSource">Nguồn thanh toán *</Label>
            <Select
              value={formData.paymentSource}
              onValueChange={(v) => updateField('paymentSource', v)}
              disabled={isLocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn nguồn" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_SOURCES) as PaymentSourceKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PAYMENT_SOURCES[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Amount Info */}
      <Card>
        <CardHeader>
          <CardTitle>Số tiền</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrencyInput
            value={currencyData}
            onChange={setCurrencyData}
            disabled={isLocked}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Ghi chú</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Ghi chú về thanh toán..."
            rows={3}
            disabled={isLocked}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {!isLocked && (
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo thu nhập'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
