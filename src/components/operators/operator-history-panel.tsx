'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Plus, Edit, Trash2, Lock, Unlock, CheckCircle } from 'lucide-react';
import { HISTORY_ACTIONS, type HistoryActionKey } from '@/config/operator-config';
import type { OperatorHistoryEntry } from '@/types';

interface OperatorHistoryPanelProps {
  history: OperatorHistoryEntry[];
}

const ACTION_ICONS: Record<HistoryActionKey, typeof Plus> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  LOCK: Lock,
  UNLOCK: Unlock,
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
    const Icon = ACTION_ICONS[action as HistoryActionKey] || Edit;
    return <Icon className="h-4 w-4" />;
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
              const changes = entry.changes as Record<string, { before: unknown; after: unknown }>;

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
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={`
                        ${actionInfo.color === 'green' && 'border-green-500 text-green-600'}
                        ${actionInfo.color === 'blue' && 'border-blue-500 text-blue-600'}
                        ${actionInfo.color === 'red' && 'border-red-500 text-red-600'}
                        ${actionInfo.color === 'amber' && 'border-amber-500 text-amber-600'}
                        ${actionInfo.color === 'purple' && 'border-purple-500 text-purple-600'}
                        ${actionInfo.color === 'emerald' && 'border-emerald-500 text-emerald-600'}
                      `}
                    >
                      {getActionIcon(entry.action)}
                      <span className="ml-1">{actionInfo.label}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>

                  {/* User */}
                  <p className="text-sm text-muted-foreground mb-2">
                    Bởi: <span className="font-medium">{entry.userId}</span>
                  </p>

                  {/* Changes */}
                  {changes && Object.keys(changes).length > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      {Object.entries(changes).map(([field, change]) => (
                        <div key={field} className="text-sm">
                          <span className="font-medium">{formatFieldName(field)}:</span>{' '}
                          {entry.action === 'CREATE' || entry.action === 'DELETE' ? (
                            <span className="text-muted-foreground">
                              {formatValue(change.after || change.before)}
                            </span>
                          ) : (
                            <>
                              <span className="line-through text-red-500/70">
                                {formatValue(change.before)}
                              </span>
                              {' → '}
                              <span className="text-green-600">
                                {formatValue(change.after)}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
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
