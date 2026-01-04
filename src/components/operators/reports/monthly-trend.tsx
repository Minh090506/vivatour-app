'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { CostByMonth } from '@/types';

interface Props {
  data: CostByMonth[];
}

// Format YYYY-MM to Vietnamese month label
function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  return `Tháng ${parseInt(m)}/${year}`;
}

export function MonthlyTrend({ data }: Props) {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu hướng theo tháng</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Không có dữ liệu</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tháng</TableHead>
                <TableHead className="text-right">Số dịch vụ</TableHead>
                <TableHead className="text-right">Tổng chi phí</TableHead>
                <TableHead className="text-right">% Tổng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const percentage = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
                return (
                  <TableRow key={item.month}>
                    <TableCell className="font-medium">{formatMonth(item.month)}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)} ₫
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {percentage}%
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Total row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Tổng cộng</TableCell>
                <TableCell className="text-right">{totalCount}</TableCell>
                <TableCell className="text-right">{formatCurrency(total)} ₫</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
