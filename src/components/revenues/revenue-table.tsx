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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Edit, Trash2, Lock, Unlock, MoreHorizontal, History } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/use-permission';
import { LockTierBadgeCompact } from '@/components/shared/lock-tier-badge';
import { RevenueLockDialog } from './revenue-lock-dialog';
import { RevenueHistoryPanel } from './revenue-history-panel';
import { LOCK_TIER_LABELS } from '@/config/lock-config';
import type { LockTier } from '@/lib/lock-utils';

// Payment type labels
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Dat coc',
  FULL_PAYMENT: 'Thanh toan du',
  PARTIAL: 'Mot phan',
  REFUND: 'Hoan tien',
};

const PAYMENT_SOURCE_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Chuyen khoan',
  CASH: 'Tien mat',
  CARD: 'The tin dung',
  PAYPAL: 'PayPal',
  WISE: 'Wise',
  OTHER: 'Khac',
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

interface RevenueTableProps {
  revenues: Revenue[];
  showRequest?: boolean;
  onEdit?: (revenue: Revenue) => void;
  onRefresh?: () => void;
  canManage?: boolean;
  canUnlock?: boolean;
}

export function RevenueTable({
  revenues,
  showRequest = false,
  onEdit,
  onRefresh,
  canManage = true,
  canUnlock = false,
}: RevenueTableProps) {
  const { isAdmin, isAccountant } = usePermission();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/revenues/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success('Da xoa thu nhap');
        onRefresh?.();
      } else {
        toast.error(data.error || 'Loi xoa thu nhap');
      }
    } catch {
      toast.error('Loi ket noi');
    } finally {
      setDeleting(null);
    }
  };

  if (revenues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chua co thu nhap nao
      </div>
    );
  }

  // Check if user can lock (ACCOUNTANT or ADMIN)
  const canLock = isAccountant || isAdmin;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showRequest && <TableHead>Booking</TableHead>}
          <TableHead>Ngay</TableHead>
          <TableHead>Loai</TableHead>
          <TableHead>Nguon</TableHead>
          <TableHead className="text-right">So tien</TableHead>
          <TableHead>Khoa</TableHead>
          {canManage && <TableHead className="text-right">Thao tac</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {revenues.map((revenue) => (
          <RevenueRow
            key={revenue.id}
            revenue={revenue}
            showRequest={showRequest}
            onEdit={onEdit}
            onRefresh={onRefresh}
            canManage={canManage}
            canLock={canLock}
            canUnlock={canUnlock || isAdmin}
            deleting={deleting}
            onDelete={handleDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}

interface RevenueRowProps {
  revenue: Revenue;
  showRequest: boolean;
  onEdit?: (revenue: Revenue) => void;
  onRefresh?: () => void;
  canManage: boolean;
  canLock: boolean;
  canUnlock: boolean;
  deleting: string | null;
  onDelete: (id: string) => void;
}

function RevenueRow({
  revenue,
  showRequest,
  onEdit,
  onRefresh,
  canManage,
  canLock,
  canUnlock,
  deleting,
  onDelete,
}: RevenueRowProps) {
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Check lock state - support both new 3-tier and legacy fields
  const lockKT = revenue.lockKT ?? revenue.isLocked ?? false;
  const lockAdmin = revenue.lockAdmin ?? false;
  const lockFinal = revenue.lockFinal ?? false;

  // Check if any lock is applied
  const isLocked = lockKT || lockAdmin || lockFinal;
  const isFullyLocked = lockFinal;

  // Determine if more tiers can be locked
  const canLockMore = !lockFinal;

  // Determine next tier that can be unlocked (reverse order)
  const nextUnlockTier: LockTier | null = lockFinal
    ? 'Final'
    : lockAdmin
    ? 'Admin'
    : lockKT
    ? 'KT'
    : null;

  const handleUnlock = async () => {
    if (!nextUnlockTier) return;

    setUnlocking(true);
    try {
      const res = await fetch(`/api/revenues/${revenue.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: nextUnlockTier }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Mo khoa that bai');
      }

      toast.success(`Da mo khoa ${LOCK_TIER_LABELS[nextUnlockTier]}`);
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Loi mo khoa');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <TableRow>
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
          {formatCurrency(Number(revenue.amountVND))} d
        </span>
      </TableCell>
      <TableCell>
        <LockTierBadgeCompact
          lockKT={lockKT}
          lockAdmin={lockAdmin}
          lockFinal={lockFinal}
        />
      </TableCell>
      {canManage && (
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit - disabled if any lock */}
              <DropdownMenuItem
                disabled={isLocked}
                onClick={() => onEdit?.(revenue)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Chinh sua
              </DropdownMenuItem>

              {/* Lock - if can lock more tiers */}
              {canLock && canLockMore && (
                <DropdownMenuItem onClick={() => setLockDialogOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  Khoa
                </DropdownMenuItem>
              )}

              {/* Unlock - if locked and has permission */}
              {canUnlock && nextUnlockTier && (
                <DropdownMenuItem onClick={handleUnlock} disabled={unlocking}>
                  <Unlock className="mr-2 h-4 w-4" />
                  Mo khoa {LOCK_TIER_LABELS[nextUnlockTier]}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* History */}
              <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                <History className="mr-2 h-4 w-4" />
                Lich su
              </DropdownMenuItem>

              {/* Delete - disabled if any lock */}
              {!isLocked && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Xoa
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xac nhan xoa</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ban co chac muon xoa thu nhap nay? Thao tac khong the hoan tac.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Huy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(revenue.id)}
                        disabled={deleting === revenue.id}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deleting === revenue.id ? 'Dang xoa...' : 'Xoa'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Lock Dialog */}
          <RevenueLockDialog
            open={lockDialogOpen}
            onOpenChange={setLockDialogOpen}
            revenueId={revenue.id}
            currentState={{ lockKT, lockAdmin, lockFinal }}
            onSuccess={() => onRefresh?.()}
          />

          {/* History Sheet */}
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Lich su thay doi</SheetTitle>
              </SheetHeader>
              <RevenueHistoryPanel revenueId={revenue.id} />
            </SheetContent>
          </Sheet>
        </TableCell>
      )}
    </TableRow>
  );
}
