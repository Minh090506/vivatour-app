# Phase 1-B: Revenue UI (Frontend)

**Duration**: ~1 hour
**Parallelization**: Can run alongside Phase 1-A (no shared files)
**Dependencies**: None (uses config types that will exist after Phase 1-A)

---

## File Ownership (Exclusive to This Phase)

| File | Operation |
|------|-----------|
| `src/components/revenues/revenue-form.tsx` | CREATE |
| `src/components/revenues/revenue-table.tsx` | CREATE |
| `src/components/revenues/revenue-summary-card.tsx` | CREATE |
| `src/components/revenues/index.ts` | CREATE |
| `src/components/ui/currency-input.tsx` | CREATE |

---

## Step 1: Create Shared Currency Input Component

**File**: `src/components/ui/currency-input.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Inline config to avoid build-time dependency on Phase 1-A
const CURRENCIES = {
  VND: { label: 'VND', symbol: '₫', decimals: 0 },
  USD: { label: 'USD', symbol: '$', decimals: 2 },
  EUR: { label: 'EUR', symbol: '€', decimals: 2 },
  GBP: { label: 'GBP', symbol: '£', decimals: 2 },
  AUD: { label: 'AUD', symbol: 'A$', decimals: 2 },
  JPY: { label: 'JPY', symbol: '¥', decimals: 0 },
  SGD: { label: 'SGD', symbol: 'S$', decimals: 2 },
  THB: { label: 'THB', symbol: '฿', decimals: 2 },
} as const;

type CurrencyKey = keyof typeof CURRENCIES;
const CURRENCY_KEYS = Object.keys(CURRENCIES) as CurrencyKey[];

const DEFAULT_EXCHANGE_RATES: Record<CurrencyKey, number> = {
  VND: 1,
  USD: 25000,
  EUR: 27000,
  GBP: 32000,
  AUD: 16500,
  JPY: 165,
  SGD: 18500,
  THB: 700,
};

interface CurrencyInputProps {
  value: {
    currency: string;
    foreignAmount: number | null;
    exchangeRate: number | null;
    amountVND: number;
  };
  onChange: (value: {
    currency: string;
    foreignAmount: number | null;
    exchangeRate: number | null;
    amountVND: number;
  }) => void;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, disabled }: CurrencyInputProps) {
  const currency = (value.currency || 'VND') as CurrencyKey;
  const isVND = currency === 'VND';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency === 'VND') {
      // Switching to VND, clear foreign fields
      onChange({
        currency: 'VND',
        foreignAmount: null,
        exchangeRate: null,
        amountVND: value.amountVND || 0,
      });
    } else {
      // Switching to foreign currency, set default rate
      const defaultRate = DEFAULT_EXCHANGE_RATES[newCurrency as CurrencyKey] || 25000;
      const foreignAmount = value.foreignAmount || 0;
      onChange({
        currency: newCurrency,
        foreignAmount,
        exchangeRate: defaultRate,
        amountVND: Math.round(foreignAmount * defaultRate),
      });
    }
  };

  const handleAmountChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;

    if (isVND) {
      onChange({
        ...value,
        amountVND: numAmount,
      });
    } else {
      const rate = value.exchangeRate || DEFAULT_EXCHANGE_RATES[currency];
      onChange({
        ...value,
        foreignAmount: numAmount,
        amountVND: Math.round(numAmount * rate),
      });
    }
  };

  const handleRateChange = (rate: string) => {
    const numRate = parseFloat(rate) || 0;
    const foreignAmount = value.foreignAmount || 0;
    onChange({
      ...value,
      exchangeRate: numRate,
      amountVND: Math.round(foreignAmount * numRate),
    });
  };

  const handleVNDDirectChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    onChange({
      ...value,
      amountVND: numAmount,
    });
  };

  return (
    <div className="space-y-4">
      {/* Currency Selector */}
      <div className="space-y-2">
        <Label>Loại tiền</Label>
        <Select value={currency} onValueChange={handleCurrencyChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {CURRENCIES[key].symbol} {CURRENCIES[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isVND ? (
        /* VND Direct Input */
        <div className="space-y-2">
          <Label htmlFor="amountVND">Số tiền (VND) *</Label>
          <Input
            id="amountVND"
            type="number"
            value={value.amountVND || ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="10000000"
            disabled={disabled}
          />
          {value.amountVND > 0 && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(value.amountVND)} ₫
            </p>
          )}
        </div>
      ) : (
        /* Foreign Currency Input */
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="foreignAmount">Số tiền ({currency}) *</Label>
            <Input
              id="foreignAmount"
              type="number"
              step={CURRENCIES[currency].decimals > 0 ? '0.01' : '1'}
              value={value.foreignAmount || ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="1000"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exchangeRate">Tỷ giá *</Label>
            <Input
              id="exchangeRate"
              type="number"
              value={value.exchangeRate || ''}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder={String(DEFAULT_EXCHANGE_RATES[currency])}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* VND Result (for foreign currency) */}
      {!isVND && (
        <div className="space-y-2">
          <Label htmlFor="amountVNDResult">Quy đổi VND</Label>
          <Input
            id="amountVNDResult"
            type="number"
            value={value.amountVND || ''}
            onChange={(e) => handleVNDDirectChange(e.target.value)}
            className="bg-gray-100 font-bold"
            disabled={disabled}
          />
          {value.amountVND > 0 && (
            <p className="text-sm font-medium text-primary">
              {formatCurrency(value.amountVND)} ₫
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Step 2: Create Revenue Form Component

**File**: `src/components/revenues/revenue-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';

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
  isLocked?: boolean;
}

interface RevenueFormProps {
  revenue?: RevenueData;
  requestId?: string; // Pre-selected request
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RevenueForm({ revenue, requestId, onSuccess, onCancel }: RevenueFormProps) {
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
      try {
        const res = await fetch('/api/requests?stage=OUTCOME&limit=100');
        const data = await res.json();
        if (data.success) {
          setRequests(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching requests:', err);
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.requestId) {
        setError('Vui lòng chọn Booking');
        setLoading(false);
        return;
      }
      if (!formData.paymentType) {
        setError('Vui lòng chọn loại thanh toán');
        setLoading(false);
        return;
      }
      if (!formData.paymentSource) {
        setError('Vui lòng chọn nguồn thanh toán');
        setLoading(false);
        return;
      }
      if (currencyData.amountVND <= 0) {
        setError('Số tiền VND phải > 0');
        setLoading(false);
        return;
      }

      const url = isEditing ? `/api/revenues/${revenue.id}` : '/api/revenues';
      const method = isEditing ? 'PUT' : 'POST';

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
        userId: 'system', // TODO: Get from auth
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
      }
    } catch {
      setError('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loadingRequests) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  const isLocked = revenue?.isLocked;

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
```

---

## Step 3: Create Revenue Table Component

**File**: `src/components/revenues/revenue-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, Lock, Unlock } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

// Payment type labels
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Đặt cọc',
  FULL_PAYMENT: 'Thanh toán đủ',
  PARTIAL: 'Một phần',
  REFUND: 'Hoàn tiền',
};

const PAYMENT_SOURCE_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản',
  CASH: 'Tiền mặt',
  CARD: 'Thẻ tín dụng',
  PAYPAL: 'PayPal',
  WISE: 'Wise',
  OTHER: 'Khác',
};

interface Revenue {
  id: string;
  paymentDate: Date | string;
  paymentType: string;
  foreignAmount?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  amountVND: number;
  paymentSource: string;
  notes?: string | null;
  isLocked: boolean;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
  request?: {
    code: string;
    customerName: string;
    bookingCode?: string | null;
  };
}

interface RevenueTableProps {
  revenues: Revenue[];
  showRequest?: boolean; // Show request column (for standalone page)
  onEdit?: (revenue: Revenue) => void;
  onRefresh?: () => void;
  canManage?: boolean; // Has revenue:manage permission
  canUnlock?: boolean; // Is ADMIN
}

export function RevenueTable({
  revenues,
  showRequest = false,
  onEdit,
  onRefresh,
  canManage = true,
  canUnlock = false,
}: RevenueTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [locking, setLocking] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/revenues/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success('Đã xóa thu nhập');
        onRefresh?.();
      } else {
        toast.error(data.error || 'Lỗi xóa thu nhập');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setDeleting(null);
    }
  };

  const handleLock = async (id: string) => {
    setLocking(id);
    try {
      const res = await fetch(`/api/revenues/${id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'system' }), // TODO: Get from auth
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Đã khóa thu nhập');
        onRefresh?.();
      } else {
        toast.error(data.error || 'Lỗi khóa thu nhập');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLocking(null);
    }
  };

  const handleUnlock = async (id: string) => {
    setLocking(id);
    try {
      const res = await fetch(`/api/revenues/${id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'system' }), // TODO: Get from auth
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Đã mở khóa thu nhập');
        onRefresh?.();
      } else {
        toast.error(data.error || 'Lỗi mở khóa thu nhập');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLocking(null);
    }
  };

  if (revenues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có thu nhập nào
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showRequest && <TableHead>Booking</TableHead>}
          <TableHead>Ngày</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Nguồn</TableHead>
          <TableHead className="text-right">Số tiền</TableHead>
          <TableHead>Trạng thái</TableHead>
          {canManage && <TableHead className="text-right">Thao tác</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {revenues.map((revenue) => (
          <TableRow key={revenue.id}>
            {showRequest && (
              <TableCell className="font-mono text-sm">
                {revenue.request?.bookingCode || revenue.request?.code}
              </TableCell>
            )}
            <TableCell>{formatDate(revenue.paymentDate)}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {PAYMENT_TYPE_LABELS[revenue.paymentType] || revenue.paymentType}
              </Badge>
            </TableCell>
            <TableCell>
              {PAYMENT_SOURCE_LABELS[revenue.paymentSource] || revenue.paymentSource}
            </TableCell>
            <TableCell className="text-right font-mono">
              {revenue.currency && revenue.currency !== 'VND' && (
                <span className="text-muted-foreground text-xs block">
                  {formatCurrency(Number(revenue.foreignAmount))} {revenue.currency}
                </span>
              )}
              <span className="font-medium">
                {formatCurrency(Number(revenue.amountVND))} ₫
              </span>
            </TableCell>
            <TableCell>
              {revenue.isLocked ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  <Lock className="w-3 h-3 mr-1" />
                  Đã khóa
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600">
                  Mở
                </Badge>
              )}
            </TableCell>
            {canManage && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {/* Edit button */}
                  {!revenue.isLocked && onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(revenue)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Lock/Unlock button */}
                  {revenue.isLocked ? (
                    canUnlock && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnlock(revenue.id)}
                        disabled={locking === revenue.id}
                      >
                        <Unlock className="w-4 h-4" />
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLock(revenue.id)}
                      disabled={locking === revenue.id}
                    >
                      <Lock className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Delete button */}
                  {!revenue.isLocked && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc muốn xóa thu nhập này? Thao tác không thể hoàn tác.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(revenue.id)}
                            disabled={deleting === revenue.id}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleting === revenue.id ? 'Đang xóa...' : 'Xóa'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Step 4: Create Revenue Summary Card

**File**: `src/components/revenues/revenue-summary-card.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingUp, Lock } from 'lucide-react';

interface Revenue {
  amountVND: number;
  paymentType: string;
  isLocked: boolean;
}

interface RevenueSummaryCardProps {
  revenues: Revenue[];
  className?: string;
}

export function RevenueSummaryCard({ revenues, className }: RevenueSummaryCardProps) {
  // Calculate totals
  const totalVND = revenues.reduce((sum, r) => {
    const amount = Number(r.amountVND) || 0;
    // Refunds are negative
    return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
  }, 0);

  const depositTotal = revenues
    .filter((r) => r.paymentType === 'DEPOSIT')
    .reduce((sum, r) => sum + (Number(r.amountVND) || 0), 0);

  const lockedTotal = revenues
    .filter((r) => r.isLocked)
    .reduce((sum, r) => {
      const amount = Number(r.amountVND) || 0;
      return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
    }, 0);

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng thu nhập</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalVND)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.length} giao dịch
          </p>
        </CardContent>
      </Card>

      {/* Deposit Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đặt cọc</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(depositTotal)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.filter((r) => r.paymentType === 'DEPOSIT').length} giao dịch
          </p>
        </CardContent>
      </Card>

      {/* Locked Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đã khóa</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(lockedTotal)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.filter((r) => r.isLocked).length} giao dịch
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Step 5: Create Index Export

**File**: `src/components/revenues/index.ts`

```typescript
export { RevenueForm } from './revenue-form';
export { RevenueTable } from './revenue-table';
export { RevenueSummaryCard } from './revenue-summary-card';
```

---

## Success Criteria

- [ ] CurrencyInput handles VND and foreign currencies
- [ ] CurrencyInput auto-calculates VND from foreign + rate
- [ ] RevenueForm creates/edits revenues
- [ ] RevenueForm shows lock warning when locked
- [ ] RevenueTable displays revenues with lock status
- [ ] RevenueTable has lock/unlock/edit/delete actions
- [ ] RevenueSummaryCard shows totals
- [ ] All Vietnamese labels throughout

---

## Conflict Prevention

This phase creates NEW files only:
- `src/components/revenues/` directory (NEW)
- `src/components/ui/currency-input.tsx` (NEW)

NO existing files modified - safe for parallel execution with Phase 1-A.
