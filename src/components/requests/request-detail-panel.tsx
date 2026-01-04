'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RequestStatusBadge } from './request-status-badge';
import { RequestServicesTable } from './request-services-table';
import { Edit, Loader2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Request, RequestStatus, Operator, User } from '@/types';

// Extended request type with optional relations
interface RequestWithDetails extends Request {
  operators?: Operator[];
  seller?: User;
  _count?: { operators?: number; revenues?: number };
}

interface RequestDetailPanelProps {
  request: RequestWithDetails | null;
  isLoading: boolean;
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
  onEditClick,
  onRefresh,
}: RequestDetailPanelProps) {
  // Loading state
  if (isLoading) {
    return <DetailSkeleton />;
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
