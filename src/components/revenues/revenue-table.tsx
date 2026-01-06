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
