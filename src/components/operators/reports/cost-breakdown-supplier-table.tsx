'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CostBreakdownBySupplier } from '@/types';

interface Props {
  data: CostBreakdownBySupplier[];
  loading?: boolean;
}

export const CostBreakdownSupplierTable = memo(function CostBreakdownSupplierTable({
  data,
  loading,
}: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chi phí theo Nhà cung cấp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalCost = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Chi phí theo Nhà cung cấp
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Chi phí</TableHead>
                  <TableHead className="text-right">Đã thanh toán</TableHead>
                  <TableHead className="text-right">Còn nợ</TableHead>
                  <TableHead className="text-center">SL DV</TableHead>
                  <TableHead className="text-right">Tỷ lệ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const percentage = totalCost > 0 ? (item.total / totalCost) * 100 : 0;
                  return (
                    <TableRow key={item.supplierId || 'no-supplier'}>
                      <TableCell className="font-medium">
                        {item.supplierName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.total)} ₫
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(item.paidAmount)} ₫
                      </TableCell>
                      <TableCell className={`text-right ${item.debt > 0 ? 'text-red-600 font-medium' : ''}`}>
                        {formatCurrency(item.debt)} ₫
                      </TableCell>
                      <TableCell className="text-center">{item.count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
