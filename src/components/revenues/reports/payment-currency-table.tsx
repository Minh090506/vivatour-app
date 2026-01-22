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
import type { CurrencyBreakdown } from '@/hooks/use-payment-tracking';

interface Props {
  data: CurrencyBreakdown[] | null | undefined;
  loading?: boolean;
}

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export const PaymentCurrencyTable = memo(function PaymentCurrencyTable({
  data,
  loading,
}: Props) {
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

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phan tich theo Tien te</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            Khong co du lieu
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phan tich theo Tien te (VND, USD, EUR)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tien te</TableHead>
              <TableHead className="text-right">Du kien (VND)</TableHead>
              <TableHead className="text-right">Da nhan (VND)</TableHead>
              <TableHead className="text-right">Con thieu (VND)</TableHead>
              <TableHead className="text-center">Ty le thu</TableHead>
              <TableHead className="text-right">So Booking</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const collectionRate = item.expectedAmount > 0
                ? Math.round((item.receivedAmount / item.expectedAmount) * 100)
                : 0;
              return (
                <TableRow key={item.currency}>
                  <TableCell className="font-medium">
                    {item.symbol} {item.label}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(item.expectedAmount)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatVND(item.receivedAmount)}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatVND(item.remainingAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${collectionRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-10">
                        {collectionRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.bookingCount}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
});
