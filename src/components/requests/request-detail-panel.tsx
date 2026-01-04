'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RequestStatusBadge } from './request-status-badge';
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
}

/**
 * Right panel showing full request details.
 * Shows empty state when no request selected.
 */
export function RequestDetailPanel({
  request,
  isLoading,
  onEditClick,
}: RequestDetailPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Đang tải...
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

      {/* Services Summary - placeholder for Phase 4 inline table */}
      {request.bookingCode && request._count?.operators !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>Dịch vụ ({request._count.operators})</CardTitle>
          </CardHeader>
          <CardContent>
            {request._count.operators === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có dịch vụ nào</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {request._count.operators} dịch vụ đã thêm
              </p>
            )}
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
