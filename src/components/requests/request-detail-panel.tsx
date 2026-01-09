'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RequestStatusBadge } from './request-status-badge';
import { RequestServicesTable } from './request-services-table';
import { RevenueTable, RevenueForm, RevenueSummaryCard } from '@/components/revenues';
import { usePermission } from '@/hooks/use-permission';
import { Edit, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Request, RequestStatus, Operator, User } from '@/types';

// Revenue type from API (includes all fields needed by both RevenueTable and RevenueForm)
interface RevenueFromApi {
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
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
  // Legacy field for backward compatibility
  isLocked?: boolean;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
  request?: {
    code: string;
    customerName: string;
    bookingCode?: string | null;
  };
}

// Extended request type with optional relations
interface RequestWithDetails extends Request {
  operators?: Operator[];
  seller?: User;
  _count?: { operators?: number; revenues?: number };
}

interface RequestDetailPanelProps {
  request: RequestWithDetails | null;
  isLoading: boolean;
  error?: string | null;
  onEditClick?: () => void;
  onRefresh: () => void;
}

/**
 * Skeleton loader for detail panel loading state
 */
function DetailSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="h-10 bg-muted rounded w-28 animate-pulse" />
      </div>

      <div className="h-32 bg-muted rounded animate-pulse" />
      <div className="h-40 bg-muted rounded animate-pulse" />
      <div className="h-40 bg-muted rounded animate-pulse" />
    </div>
  );
}

/**
 * Right panel showing full request details.
 * Shows empty state when no request selected.
 */
export function RequestDetailPanel({
  request,
  isLoading,
  error,
  onEditClick,
  onRefresh,
}: RequestDetailPanelProps) {
  // Permission hooks
  const { can, isAdmin } = usePermission();

  // Revenue state
  const [revenues, setRevenues] = useState<RevenueFromApi[]>([]);
  const [editingRevenue, setEditingRevenue] = useState<RevenueFromApi | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingRevenues, setLoadingRevenues] = useState(false);

  // Fetch revenues for this request
  const fetchRevenues = useCallback(async () => {
    if (!request?.id || !request?.bookingCode) {
      setRevenues([]);
      return;
    }
    setLoadingRevenues(true);
    try {
      const res = await fetch(`/api/revenues?requestId=${request.id}`);
      const data = await res.json();
      if (data.success) {
        setRevenues(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching revenues:', err);
    } finally {
      setLoadingRevenues(false);
    }
  }, [request?.id, request?.bookingCode]);

  // Fetch revenues when request changes
  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  // Revenue handlers
  const handleAddRevenue = useCallback(() => {
    setEditingRevenue(null);
    setDialogOpen(true);
  }, []);

  const handleEditRevenue = useCallback((revenue: RevenueFromApi) => {
    setEditingRevenue(revenue);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditingRevenue(null);
  }, []);

  const handleRevenueSuccess = useCallback(() => {
    handleDialogClose();
    fetchRevenues();
  }, [handleDialogClose, fetchRevenues]);

  // Loading state
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="text-lg font-medium text-destructive mb-2">
            Không thể tải chi tiết
          </p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // Empty state - no request selected
  if (!request) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Chọn yêu cầu từ danh sách</p>
          <p className="text-sm mt-1">để xem chi tiết</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header with ID, status, and edit button */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-mono">
              {request.bookingCode || request.rqid || request.code}
            </h2>
            <RequestStatusBadge status={request.status as RequestStatus} showStage />
          </div>
          <p className="text-muted-foreground">{request.customerName}</p>
        </div>
        {onEditClick && (
          <Button variant="outline" onClick={onEditClick}>
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Booking Code Banner - show prominently when has booking */}
      {request.bookingCode && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CardContent className="py-4">
            <p className="text-sm text-green-600 dark:text-green-400">Mã Booking</p>
            <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-300">
              {request.bookingCode}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <InfoRow label="Tên" value={request.customerName} />
          <InfoRow label="Liên hệ" value={request.contact} />
          <InfoRow label="WhatsApp" value={request.whatsapp || '-'} />
          <InfoRow label="Pax" value={String(request.pax)} />
          <InfoRow label="Quốc gia" value={request.country} />
          <InfoRow label="Nguồn" value={request.source} />
        </CardContent>
      </Card>

      {/* Tour Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Tour</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <InfoRow label="Số ngày" value={request.tourDays?.toString() || '-'} />
          <InfoRow
            label="Ngày bắt đầu"
            value={request.startDate ? formatDate(request.startDate) : '-'}
          />
          <InfoRow
            label="Ngày kết thúc"
            value={request.endDate ? formatDate(request.endDate) : '-'}
          />
          <InfoRow
            label="Doanh thu DK"
            value={request.expectedRevenue ? formatCurrency(request.expectedRevenue) + ' ₫' : '-'}
          />
          <InfoRow
            label="Chi phí DK"
            value={request.expectedCost ? formatCurrency(request.expectedCost) + ' ₫' : '-'}
          />
          <InfoRow label="Seller" value={request.seller?.name || '-'} />
        </CardContent>
      </Card>

      {/* Services Table - inline editable for bookings */}
      {request.bookingCode && (
        <Card>
          <CardHeader>
            <CardTitle>Dịch vụ ({request.operators?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestServicesTable
              requestId={request.id}
              operators={request.operators || []}
              onUpdate={onRefresh}
            />
          </CardContent>
        </Card>
      )}

      {/* Revenue Section - only for bookings with permission */}
      {request.bookingCode && can('revenue:view') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Doanh thu ({revenues.length})</CardTitle>
            {can('revenue:manage') && (
              <Button variant="outline" size="sm" onClick={handleAddRevenue}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm thu nhập
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRevenues ? (
              <div className="text-center py-4 text-muted-foreground">
                Đang tải dữ liệu...
              </div>
            ) : (
              <>
                {revenues.length > 0 && (
                  <RevenueSummaryCard revenues={revenues} />
                )}
                <RevenueTable
                  revenues={revenues}
                  onEdit={(rev) => handleEditRevenue(rev as RevenueFromApi)}
                  onRefresh={fetchRevenues}
                  canManage={can('revenue:manage')}
                  canUnlock={isAdmin}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue Dialog for add/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRevenue ? 'Chỉnh sửa thu nhập' : 'Thêm thu nhập mới'}
            </DialogTitle>
          </DialogHeader>
          <RevenueForm
            revenue={editingRevenue || undefined}
            requestId={request?.id}
            onSuccess={handleRevenueSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      {/* Notes Section */}
      {request.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{request.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Simple label/value row for info display
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
