'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { SaleItem, SalesSummary } from '@/types';

interface SalesSummaryTableProps {
  sales: SaleItem[];
  summary: SalesSummary;
}

export function SalesSummaryTable({ sales, summary }: SalesSummaryTableProps) {
  if (sales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Khong co du lieu tong hop
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Tong doanh thu" value={summary.totalRevenue} color="text-green-600" />
        <SummaryCard label="Tong chi phi" value={summary.totalCost} color="text-orange-600" />
        <SummaryCard label="Tong loi nhuan" value={summary.totalProfit} color="text-blue-600" />
        <div className="rounded-lg border p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">So booking</p>
          <p className="text-2xl font-bold">{summary.bookingCount}</p>
        </div>
      </div>

      {/* Sales Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ma Booking</TableHead>
            <TableHead>Khach hang</TableHead>
            <TableHead>Ngay bat dau</TableHead>
            <TableHead>Ngay ket thuc</TableHead>
            <TableHead className="text-right">Doanh thu</TableHead>
            <TableHead className="text-right">Chi phi</TableHead>
            <TableHead className="text-right">Loi nhuan</TableHead>
            <TableHead className="text-center">So lan thu</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.bookingCode}>
              <TableCell className="font-mono text-sm">
                <Link
                  href={`/operators/reports?bookingCode=${sale.bookingCode}`}
                  className="text-primary hover:underline"
                >
                  {sale.bookingCode}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{sale.customerName}</TableCell>
              <TableCell>
                {sale.startDate ? formatDate(sale.startDate) : '-'}
              </TableCell>
              <TableCell>
                {sale.endDate ? formatDate(sale.endDate) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {formatCurrency(sale.totalRevenue)}
              </TableCell>
              <TableCell className="text-right font-mono text-orange-600">
                {formatCurrency(sale.totalCost)}
              </TableCell>
              <TableCell className="text-right font-mono">
                <span className={sale.profit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                  {formatCurrency(sale.profit)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{sale.revenueCount}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Summary card component
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border p-4 bg-muted/50">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
