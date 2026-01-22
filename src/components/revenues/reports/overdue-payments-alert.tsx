'use client';

import { memo } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OverdueAlert } from '@/hooks/use-payment-tracking';

interface Props {
  data: OverdueAlert[] | null | undefined;
  loading?: boolean;
}

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function getUrgencyBadge(daysOverdue: number) {
  if (daysOverdue >= 30) {
    return <Badge variant="destructive">Qua han {daysOverdue} ngay</Badge>;
  }
  if (daysOverdue >= 14) {
    return <Badge className="bg-orange-500 hover:bg-orange-600">Qua han {daysOverdue} ngay</Badge>;
  }
  return <Badge variant="secondary">Qua han {daysOverdue} ngay</Badge>;
}

export const OverduePaymentsAlert = memo(function OverduePaymentsAlert({
  data,
  loading,
}: Props) {
  if (loading) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-green-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <AlertTriangle className="h-5 w-5" />
            Khong co thanh toan qua han
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Tat ca cac booking da duoc thanh toan day du hoac chua den han.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Canh bao: {data.length} Booking qua han thanh toan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Khach hang</TableHead>
                <TableHead className="text-right">Du kien</TableHead>
                <TableHead className="text-right">Da nhan</TableHead>
                <TableHead className="text-right">Con thieu</TableHead>
                <TableHead>Tinh trang</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.requestId}>
                  <TableCell className="font-medium">
                    {item.bookingCode || '-'}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {item.customerName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(item.expectedRevenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatVND(item.receivedAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {formatVND(item.remainingAmount)}
                  </TableCell>
                  <TableCell>
                    {getUrgencyBadge(item.daysOverdue)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/requests/${item.requestId}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});
