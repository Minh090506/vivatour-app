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
import type { CostBySupplier } from '@/types';

interface Props {
  data: CostBySupplier[];
}

export function CostBySupplierTable({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi phí theo NCC</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Không có dữ liệu</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NCC</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead className="text-right">Tổng chi phí</TableHead>
                <TableHead className="text-right">TB/dịch vụ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, i) => (
                <TableRow key={item.supplierId || i}>
                  <TableCell>{item.supplierName}</TableCell>
                  <TableCell className="text-right">{item.count}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total)} ₫
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(item.count > 0 ? Math.round(item.total / item.count) : 0)} ₫
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
