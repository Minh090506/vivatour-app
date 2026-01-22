'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { RevenueByServiceType } from '@/types';

interface Props {
  data: RevenueByServiceType[];
}

export function RevenueByServiceTable({ data }: Props) {
  const total = data.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân tích theo Loại dịch vụ</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Không có dữ liệu</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại dịch vụ</TableHead>
                <TableHead className="text-right">Tổng chi phí</TableHead>
                <TableHead className="text-right">Đã thanh toán</TableHead>
                <TableHead className="text-right">Còn nợ</TableHead>
                <TableHead className="text-right">SL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const percentage = total > 0 ? (item.totalCost / total) * 100 : 0;
                return (
                  <TableRow key={item.type}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{item.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalCost)} ₫
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(item.paidAmount)} ₫
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.debt)} ₫
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.count}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
