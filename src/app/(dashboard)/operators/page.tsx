'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ClipboardList, Lock, RefreshCw, Archive, ArchiveRestore } from 'lucide-react';
import { OperatorListFilters } from '@/components/operators/operator-list-filters';
import { OperatorLockDialog } from '@/components/operators/operator-lock-dialog';
import { SERVICE_TYPES, PAYMENT_STATUSES, type ServiceTypeKey, type PaymentStatusKey } from '@/config/operator-config';
import { safeFetch, safePost } from '@/lib/api/fetch-utils';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { toast } from 'sonner';
import type { OperatorFilters } from '@/types';

interface OperatorListItem {
  id: string;
  requestId: string;
  supplierId: string | null;
  serviceDate: string | Date;
  serviceType: string;
  serviceName: string;
  supplier: string | null;
  totalCost: number;
  paidAmount: number;
  paymentStatus: string;
  isLocked: boolean;
  isArchived: boolean;
  request?: { code: string; customerName: string };
  supplierRef?: { code: string; name: string };
}

interface OperatorListResponse {
  data: OperatorListItem[];
  total: number;
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<OperatorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<OperatorFilters>({
    search: '',
    serviceType: '',
    paymentStatus: '',
    fromDate: '',
    toDate: '',
    isLocked: undefined,
    includeArchived: false,
  });
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();

    if (filters.search) params.set('search', filters.search);
    if (filters.serviceType) params.set('serviceType', filters.serviceType);
    if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (filters.isLocked !== undefined) params.set('isLocked', String(filters.isLocked));
    if (filters.includeArchived) params.set('includeArchived', 'true');

    const { data, error: fetchError } = await safeFetch<OperatorListResponse>(
      `/api/operators?${params}`
    );

    if (fetchError) {
      setError(fetchError);
      setOperators([]);
      setTotal(0);
    } else if (data) {
      setOperators(data.data || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  // Archive completed operators (paidAmount >= totalCost)
  const handleAutoArchive = async () => {
    setArchiving(true);
    const { data, error } = await safePost<{ archivedCount: number; message: string }>(
      '/api/operators/archive',
      { autoArchive: true }
    );
    if (error) {
      toast.error(error);
    } else if (data) {
      toast.success(data.message);
      fetchOperators();
    }
    setArchiving(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES[type as ServiceTypeKey]?.label || type;
  };

  const getPaymentStatusInfo = (status: string) => {
    return PAYMENT_STATUSES[status as PaymentStatusKey] || { label: status, color: 'gray' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Quản lý Điều hành
          </h1>
          <p className="text-muted-foreground">Chi phí dịch vụ theo Booking</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoArchive}
            disabled={archiving}
            title="Tự động lưu trữ dịch vụ đã hoàn thành thanh toán của tháng trước"
          >
            <Archive className="mr-2 h-4 w-4" />
            {archiving ? 'Đang xử lý...' : 'Lưu trữ đã hoàn thành'}
          </Button>
          <Button variant="outline" onClick={() => setLockDialogOpen(true)}>
            <Lock className="mr-2 h-4 w-4" /> Khóa kỳ
          </Button>
          <Button asChild>
            <Link href="/operators/create">
              <Plus className="mr-2 h-4 w-4" /> Thêm dịch vụ
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <OperatorListFilters filters={filters} onFilterChange={setFilters} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Danh sách dịch vụ ({total})</CardTitle>
          {error && (
            <Button variant="outline" size="sm" onClick={fetchOperators}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorFallback
              title="Lỗi tải danh sách"
              message={error}
              onRetry={fetchOperators}
              retryLabel="Tải lại"
            />
          ) : loading ? (
            <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
          ) : operators.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Chưa có dịch vụ nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Ngày DV</TableHead>
                  <TableHead>Loại DV</TableHead>
                  <TableHead>Tên dịch vụ</TableHead>
                  <TableHead>NCC</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((op) => {
                  const paymentInfo = getPaymentStatusInfo(op.paymentStatus);
                  return (
                    <TableRow key={op.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/requests/${op.requestId}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {op.request?.code || op.requestId.slice(0, 8)}
                          </Link>
                          {op.request?.customerName && (
                            <p className="text-xs text-muted-foreground">
                              {op.request.customerName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(op.serviceDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getServiceTypeLabel(op.serviceType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/operators/${op.id}`}
                          className="font-medium hover:underline"
                        >
                          {op.serviceName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {op.supplierRef ? (
                          <Link
                            href={`/suppliers/${op.supplierId}`}
                            className="text-primary hover:underline"
                          >
                            {op.supplierRef.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {op.supplier || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(op.totalCost)} ₫
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                            ${paymentInfo.color === 'green' && 'border-green-500 text-green-600 bg-green-50'}
                            ${paymentInfo.color === 'yellow' && 'border-yellow-500 text-yellow-600 bg-yellow-50'}
                            ${paymentInfo.color === 'orange' && 'border-orange-500 text-orange-600 bg-orange-50'}
                          `}
                        >
                          {paymentInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {op.isArchived && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              <ArchiveRestore className="h-3 w-3 mr-1" />
                              Đã lưu trữ
                            </Badge>
                          )}
                          {op.isLocked && (
                            <span title="Đã khóa sổ">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lock Period Dialog */}
      <OperatorLockDialog
        open={lockDialogOpen}
        onOpenChange={setLockDialogOpen}
        onSuccess={fetchOperators}
      />
    </div>
  );
}
