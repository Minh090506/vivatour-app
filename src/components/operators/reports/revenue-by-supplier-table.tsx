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
import type { RevenueBySupplier } from '@/types';

interface Props {
  data: RevenueBySupplier[];
}

export function RevenueBySupplierTable({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân tích theo Nhà cung cấp</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Không có dữ liệu</p>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead className="text-right">Đã thanh toán</TableHead>
                  <TableHead className="text-right">Còn nợ</TableHead>
                  <TableHead className="text-right">SL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={item.supplierId || `no-supplier-${index}`}>
                    <TableCell className="font-medium">
                      {item.supplierName}
                    </TableCell>
                    <TableCell className="text-right">
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
