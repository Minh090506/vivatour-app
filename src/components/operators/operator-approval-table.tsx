'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ApprovalQueueItem } from '@/types';

interface Props {
  items: ApprovalQueueItem[];
  onApprove: (ids: string[], paymentDate: Date) => Promise<void>;
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

const formatDate = (date: Date | string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('vi-VN');
};

export function OperatorApprovalTable({ items, onApprove, loading }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const handleBatchApprove = async () => {
    if (selected.size === 0) return;
    setApproving(true);
    try {
      await onApprove(Array.from(selected), new Date());
      setSelected(new Set());
    } finally {
      setApproving(false);
    }
  };

  const handleSingleApprove = async (id: string) => {
    setApproving(true);
    try {
      await onApprove([id], new Date());
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Đang tải...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Không có dịch vụ nào chờ duyệt
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <span className="text-sm">Đã chọn {selected.size} dịch vụ</span>
          <Button onClick={handleBatchApprove} disabled={approving} size="sm">
            {approving ? 'Đang xử lý...' : 'Duyệt tất cả'}
          </Button>
          <Button variant="outline" onClick={() => setSelected(new Set())} size="sm">
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selected.size === items.length && items.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>Ngày DV</TableHead>
            <TableHead>Dịch vụ</TableHead>
            <TableHead>NCC</TableHead>
            <TableHead className="text-right">Tổng CP</TableHead>
            <TableHead className="text-right">Đã TT</TableHead>
            <TableHead className="text-right">Còn nợ</TableHead>
            <TableHead>Hạn TT</TableHead>
            <TableHead className="text-center">Trạng thái</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={item.daysOverdue > 0 ? 'bg-red-50' : ''}
            >
              <TableCell>
                <Checkbox
                  checked={selected.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  disabled={item.isLocked}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{item.requestCode}</div>
                <div className="text-sm text-gray-500">{item.customerName}</div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(item.serviceDate)}
              </TableCell>
              <TableCell>
                <div>{item.serviceName}</div>
                <div className="text-sm text-gray-500">{item.serviceType}</div>
              </TableCell>
              <TableCell>{item.supplierName || '-'}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.totalCost)} ₫
              </TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(item.paidAmount || 0)} ₫
              </TableCell>
              <TableCell className={`text-right font-medium ${item.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(item.debt || 0)} ₫
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(item.paymentDeadline)}
              </TableCell>
              <TableCell className="text-center">
                {item.daysOverdue > 0 ? (
                  <Badge variant="destructive">Quá hạn {item.daysOverdue} ngày</Badge>
                ) : item.daysOverdue === 0 ? (
                  <Badge className="bg-yellow-500 hover:bg-yellow-500">Hôm nay</Badge>
                ) : (
                  <Badge variant="secondary">Còn {Math.abs(item.daysOverdue)} ngày</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={() => handleSingleApprove(item.id)}
                  disabled={item.isLocked || approving}
                >
                  Duyệt
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
