'use client';

import { memo, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { CURRENCIES } from '@/config/revenue-config';

interface CurrencyBreakdown {
  currency: string;
  foreignAmount: number;
  amountVND: number;
  count: number;
  percentage: number;
}

interface Props {
  data: CurrencyBreakdown[] | null | undefined;
  loading?: boolean;
}

function formatCurrency(value: number, currency: string): string {
  const config = CURRENCIES[currency as keyof typeof CURRENCIES];
  if (!config) return value.toLocaleString('vi-VN');

  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(value) + ' ' + currency;
}

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
}

export const CurrencyBreakdownTable = memo(function CurrencyBreakdownTable({
  data,
  loading,
}: Props) {
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.amountVND - a.amountVND);
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (!sortedData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phan bo theo Loai tien</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Khong co du lieu
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phan bo theo Loai tien</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loai tien</TableHead>
              <TableHead className="text-right">So giao dich</TableHead>
              <TableHead className="text-right">So tien goc</TableHead>
              <TableHead className="text-right">Quy doi VND</TableHead>
              <TableHead className="text-right">Ty le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.currency}>
                <TableCell>
                  <Badge variant="outline">{item.currency}</Badge>
                </TableCell>
                <TableCell className="text-right">{item.count}</TableCell>
                <TableCell className="text-right">
                  {item.currency === 'VND' ? '-' : formatCurrency(item.foreignAmount, item.currency)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatVND(item.amountVND)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{item.percentage}%</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
});
