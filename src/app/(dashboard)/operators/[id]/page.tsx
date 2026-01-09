'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ClipboardList,
  Edit,
  Trash2,
  Calendar,
  Building2,
  CreditCard,
  FileText,
  Unlock,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { OperatorForm } from '@/components/operators/operator-form';
import { OperatorHistoryPanel } from '@/components/operators/operator-history-panel';
import { LockIndicator } from '@/components/operators/lock-indicator';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { safeFetch, safeDelete, safePost } from '@/lib/api/fetch-utils';
import { toast } from 'sonner';
import { SERVICE_TYPES, PAYMENT_STATUSES, type ServiceTypeKey, type PaymentStatusKey } from '@/config/operator-config';
import type { OperatorHistoryEntry } from '@/types';

interface OperatorDetail {
  id: string;
  requestId: string;
  supplierId: string | null;
  serviceDate: string | Date;
  serviceType: string;
  serviceName: string;
  supplier: string | null;
  costBeforeTax: number;
  vat: number | null;
  totalCost: number;
  paymentStatus: string;
  paidAmount: number;
  debt: number;  // Computed: totalCost - paidAmount
  paymentDeadline: Date | string | null;
  paymentDate: Date | null;
  bankAccount: string | null;
  notes: string | null;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  isArchived: boolean;
  archivedAt: Date | null;
  userId: string;
  sheetRowIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
  request?: { code: string; customerName: string; status: string };
  supplierRef?: { code: string; name: string; paymentModel: string; bankAccount: string };
  history?: OperatorHistoryEntry[];
}

interface PageParams {
  id: string;
}

export default function OperatorDetailPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);
  const router = useRouter();

  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);

  // AbortController ref for race condition prevention
  const abortRef = useRef<AbortController | null>(null);

  // Safe params validation
  const isValidId = id && typeof id === 'string' && id.length > 0;

  useEffect(() => {
    if (isValidId) {
      // Cancel previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      fetchOperator(abortRef.current.signal);
    } else {
      setError('ID không hợp lệ');
      setLoading(false);
    }

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isValidId]);

  const fetchOperator = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await safeFetch<OperatorDetail>(
      `/api/operators/${id}`,
      { signal }
    );

    // Ignore if aborted
    if (signal?.aborted) return;

    if (fetchError) {
      setError(fetchError);
      setOperator(null);
    } else if (data) {
      setOperator(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error: deleteError } = await safeDelete<void>(`/api/operators/${id}`);

    if (deleteError) {
      toast.error(deleteError);
      setDeleteDialogOpen(false);
    } else {
      router.push('/operators');
    }
    setDeleting(false);
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    const { data, error: unlockError } = await safePost<{ success: boolean }>(
      `/api/operators/${id}/unlock`,
      { userId: 'current-user' }
    );

    if (unlockError) {
      toast.error(unlockError);
    } else if (data) {
      toast.success('Đã mở khóa dịch vụ');
      fetchOperator();
    }
    setUnlocking(false);
  };

  const handleUnarchive = async () => {
    setUnarchiving(true);
    const { data, error: unarchiveError } = await safePost<{ success: boolean; message: string }>(
      '/api/operators/unarchive',
      { ids: [id] }
    );

    if (unarchiveError) {
      toast.error(unarchiveError);
    } else if (data) {
      toast.success('Đã khôi phục dịch vụ');
      fetchOperator();
    }
    setUnarchiving(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES[type as ServiceTypeKey]?.label || type;
  };

  const getPaymentStatusInfo = (status: string) => {
    return PAYMENT_STATUSES[status as PaymentStatusKey] || { label: status, color: 'gray' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/operators">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Chi tiết dịch vụ</h1>
        </div>
        <ErrorFallback
          title="Lỗi tải dịch vụ"
          message={error || 'Không tìm thấy dịch vụ'}
          onRetry={isValidId ? fetchOperator : undefined}
          onBack={() => router.push('/operators')}
          backLabel="Về danh sách"
          retryLabel="Thử lại"
        />
      </div>
    );
  }

  const paymentInfo = getPaymentStatusInfo(operator.paymentStatus);

  // Edit mode
  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Chỉnh sửa dịch vụ
            </h1>
            <p className="text-muted-foreground">{operator.serviceName}</p>
          </div>
        </div>

        <OperatorForm
          operator={operator}
          onSuccess={() => {
            setIsEditing(false);
            fetchOperator();
          }}
        />
      </div>
    );
  }

  // View mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/operators">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              {operator.serviceName}
              {operator.isArchived && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                  <Archive className="h-3 w-3 mr-1" />
                  Đã lưu trữ
                </Badge>
              )}
            </h1>
            <LockIndicator
              isLocked={operator.isLocked}
              lockedAt={operator.lockedAt}
              lockedBy={operator.lockedBy}
            />
            <p className="text-muted-foreground">
              Booking: {operator.request?.code || operator.requestId.slice(0, 8)}
              {operator.request?.customerName && ` - ${operator.request.customerName}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {operator.isArchived ? (
            <Button variant="outline" onClick={handleUnarchive} disabled={unarchiving}>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              {unarchiving ? 'Đang khôi phục...' : 'Khôi phục'}
            </Button>
          ) : operator.isLocked ? (
            <Button variant="outline" onClick={handleUnlock} disabled={unlocking}>
              <Unlock className="mr-2 h-4 w-4" />
              {unlocking ? 'Đang mở...' : 'Mở khóa'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Sửa
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Thông tin dịch vụ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Loại dịch vụ</p>
                  <Badge variant="outline" className="mt-1">
                    {getServiceTypeLabel(operator.serviceType)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ngày dịch vụ</p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(operator.serviceDate)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tên dịch vụ</p>
                <p className="font-medium mt-1">{operator.serviceName}</p>
              </div>

              {operator.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Ghi chú</p>
                  <p className="mt-1 text-muted-foreground">{operator.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Nhà cung cấp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tên NCC</p>
                  {operator.supplierRef ? (
                    <Link
                      href={`/suppliers/${operator.supplierId}`}
                      className="font-medium text-primary hover:underline mt-1 block"
                    >
                      {operator.supplierRef.code} - {operator.supplierRef.name}
                    </Link>
                  ) : (
                    <p className="font-medium mt-1">{operator.supplier || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">TK Ngân hàng</p>
                  <p className="font-medium mt-1">
                    {operator.bankAccount || operator.supplierRef?.bankAccount || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Chi phí & Thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Chi phí trước thuế</p>
                  <p className="font-medium mt-1">{formatCurrency(operator.costBeforeTax)} ₫</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">VAT</p>
                  <p className="font-medium mt-1">
                    {operator.vat ? `${formatCurrency(operator.vat)} ₫` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                  <p className="font-bold text-lg text-primary mt-1">
                    {formatCurrency(operator.totalCost)} ₫
                  </p>
                </div>
              </div>

              <hr />

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Trạng thái TT</p>
                  <Badge
                    variant="outline"
                    className={`mt-1
                      ${paymentInfo.color === 'green' && 'border-green-500 text-green-600 bg-green-50'}
                      ${paymentInfo.color === 'yellow' && 'border-yellow-500 text-yellow-600 bg-yellow-50'}
                      ${paymentInfo.color === 'orange' && 'border-orange-500 text-orange-600 bg-orange-50'}
                    `}
                  >
                    {paymentInfo.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã thanh toán</p>
                  <p className="font-medium mt-1 text-green-600">
                    {formatCurrency(operator.paidAmount || 0)} ₫
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Còn nợ</p>
                  <p className={`font-bold mt-1 ${operator.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(operator.debt || 0)} ₫
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hạn thanh toán</p>
                  <p className="font-medium mt-1">{formatDate(operator.paymentDeadline)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - History */}
        <div>
          <OperatorHistoryPanel history={operator.history || []} />
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa dịch vụ &quot;{operator.serviceName}&quot;?
              <br />
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
