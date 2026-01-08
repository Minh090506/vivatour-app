'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Plus, Edit, Trash2, Lock, Unlock, CheckCircle, Users } from 'lucide-react';
import { HISTORY_ACTIONS, type HistoryActionKey } from '@/config/operator-config';
import type { OperatorHistoryEntry } from '@/types';

interface OperatorHistoryPanelProps {
  history: OperatorHistoryEntry[];
}

// Icon mapping for all action types (including 3-tier locks)
const ACTION_ICONS: Record<string, typeof Plus> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  LOCK: Lock,
  UNLOCK: Unlock,
  LOCK_KT: Lock,
  UNLOCK_KT: Unlock,
  LOCK_ADMIN: Lock,
  UNLOCK_ADMIN: Unlock,
  LOCK_FINAL: Lock,
  UNLOCK_FINAL: Unlock,
  APPROVE: CheckCircle,
};

export function OperatorHistoryPanel({ history }: OperatorHistoryPanelProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFieldName = (field: string): string => {
    const fieldLabels: Record<string, string> = {
      serviceName: 'Tên dịch vụ',
      serviceType: 'Loại dịch vụ',
      serviceDate: 'Ngày dịch vụ',
      supplier: 'Nhà cung cấp',
      supplierId: 'ID NCC',
      costBeforeTax: 'Chi phí trước thuế',
      vat: 'VAT',
      totalCost: 'Tổng chi phí',
      paymentDeadline: 'Hạn thanh toán',
      paymentStatus: 'Trạng thái TT',
      paidAmount: 'Số tiền đã TT',
      paidAt: 'Ngày thanh toán',
      bankAccount: 'TK ngân hàng',
      notes: 'Ghi chú',
      isLocked: 'Khóa sổ',
      lockedAt: 'Ngày khóa',
      lockedBy: 'Người khóa',
      // 3-tier lock fields
      lockKT: 'Khóa KT',
      lockKTAt: 'Ngày khóa KT',
      lockKTBy: 'Người khóa KT',
      lockAdmin: 'Khóa Admin',
      lockAdminAt: 'Ngày khóa Admin',
      lockAdminBy: 'Người khóa Admin',
      lockFinal: 'Khóa Cuối',
      lockFinalAt: 'Ngày khóa Cuối',
      lockFinalBy: 'Người khóa Cuối',
      tier: 'Mức khóa',
      batch: 'Hàng loạt',
      month: 'Tháng',
      created: 'Tạo mới',
      deleted: 'Xóa',
    };
    return fieldLabels[field] || field;
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(trống)';
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    if (typeof value === 'number') {
      return new Intl.NumberFormat('vi-VN').format(value);
    }
    if (typeof value === 'string') {
      // Check if date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toLocaleDateString('vi-VN');
      }
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getActionInfo = (action: string) => {
    const actionKey = action as HistoryActionKey;
    return HISTORY_ACTIONS[actionKey] || { label: action, color: 'gray' };
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || Edit;
    return <Icon className="h-4 w-4" />;
  };

  // Check if action is a tier-specific lock action
  const isTierLockAction = (action: string): boolean => {
    return ['LOCK_KT', 'UNLOCK_KT', 'LOCK_ADMIN', 'UNLOCK_ADMIN', 'LOCK_FINAL', 'UNLOCK_FINAL'].includes(action);
  };

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Lịch sử thay đổi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Chưa có lịch sử thay đổi
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Lịch sử thay đổi ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {history.map((entry) => {
              const actionInfo = getActionInfo(entry.action);
              const changes = entry.changes as Record<string, unknown>;
              const isBatchLock = changes?.batch === true;
              const tierFromChanges = changes?.tier as string | undefined;
              const monthFromChanges = changes?.month as string | undefined;

              return (
                <div
                  key={entry.id}
                  className="border-l-2 border-muted pl-4 pb-4 relative"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-muted flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-muted" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`
                        ${actionInfo.color === 'green' && 'border-green-500 text-green-600'}
                        ${actionInfo.color === 'blue' && 'border-blue-500 text-blue-600'}
                        ${actionInfo.color === 'red' && 'border-red-500 text-red-600'}
                        ${actionInfo.color === 'amber' && 'border-amber-500 text-amber-600'}
                        ${actionInfo.color === 'orange' && 'border-orange-500 text-orange-600'}
                        ${actionInfo.color === 'purple' && 'border-purple-500 text-purple-600'}
                        ${actionInfo.color === 'emerald' && 'border-emerald-500 text-emerald-600'}
                      `}
                    >
                      {getActionIcon(entry.action)}
                      <span className="ml-1">{actionInfo.label}</span>
                    </Badge>

                    {/* Batch indicator */}
                    {isBatchLock && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Users className="h-3 w-3" />
                        Hàng loạt
                      </Badge>
                    )}

                    <span className="text-sm text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>

                  {/* User */}
                  <p className="text-sm text-muted-foreground mb-2">
                    Bởi: <span className="font-medium">{entry.userId}</span>
                  </p>

                  {/* Tier-specific info for lock actions */}
                  {isTierLockAction(entry.action) && monthFromChanges && (
                    <div className="text-xs text-muted-foreground mb-2 bg-muted/50 rounded px-2 py-1 inline-block">
                      Tháng: {monthFromChanges}
                      {tierFromChanges && ` • Tier: ${tierFromChanges}`}
                    </div>
                  )}

                  {/* Changes - filter out tier/batch/month for tier locks */}
                  {changes && Object.keys(changes).length > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      {Object.entries(changes)
                        .filter(([field]) => {
                          // For tier lock actions, skip displaying these meta fields
                          if (isTierLockAction(entry.action)) {
                            return !['tier', 'batch', 'month'].includes(field);
                          }
                          return true;
                        })
                        .map(([field, change]) => {
                          // Handle both {before, after} format and direct values
                          const changeObj = change as { before?: unknown; after?: unknown } | unknown;
                          const hasBothValues = changeObj && typeof changeObj === 'object' && 'before' in changeObj;

                          return (
                            <div key={field} className="text-sm">
                              <span className="font-medium">{formatFieldName(field)}:</span>{' '}
                              {entry.action === 'CREATE' || entry.action === 'DELETE' || !hasBothValues ? (
                                <span className="text-muted-foreground">
                                  {formatValue(hasBothValues ? (changeObj as { after?: unknown }).after || (changeObj as { before?: unknown }).before : change)}
                                </span>
                              ) : (
                                <>
                                  <span className="line-through text-red-500/70">
                                    {formatValue((changeObj as { before: unknown }).before)}
                                  </span>
                                  {' → '}
                                  <span className="text-green-600">
                                    {formatValue((changeObj as { after: unknown }).after)}
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
