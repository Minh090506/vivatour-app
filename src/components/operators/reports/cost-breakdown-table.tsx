'use client';

import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, TableIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SERVICE_TYPES } from '@/config/operator-config';
import type { CostBreakdownByBooking } from '@/types';

interface Props {
  data: CostBreakdownByBooking[];
  loading?: boolean;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'on-budget':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          Trong ngân sách
        </Badge>
      );
    case 'slight-over':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Minus className="h-3 w-3 mr-1" />
          Vượt nhẹ
        </Badge>
      );
    case 'over-budget':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          Vượt ngân sách
        </Badge>
      );
    default:
      return null;
  }
}

function BookingRow({ item }: { item: CostBreakdownByBooking }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasServices = item.services.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="hover:bg-muted/50">
        <TableCell>
          {hasServices && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </TableCell>
        <TableCell className="font-medium">{item.bookingCode}</TableCell>
        <TableCell className="max-w-[200px] truncate" title={item.customerName}>
          {item.customerName}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(item.expectedCost)} ₫
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(item.actualCost)} ₫
        </TableCell>
        <TableCell className={`text-right font-medium ${
          item.variance > 0 ? 'text-red-600' : item.variance < 0 ? 'text-green-600' : ''
        }`}>
          {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)} ₫
          <span className="text-xs text-muted-foreground ml-1">
            ({item.variancePercent}%)
          </span>
        </TableCell>
        <TableCell className="text-center">
          {item.services.length}
        </TableCell>
        <TableCell>{getStatusBadge(item.status)}</TableCell>
      </TableRow>

      {hasServices && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={8} className="p-0">
              <div className="p-4 pl-12">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Chi tiết dịch vụ:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {item.services.map((service, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm bg-white p-2 rounded border"
                    >
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {SERVICE_TYPES[service.type as keyof typeof SERVICE_TYPES]?.label || service.type}
                        </Badge>
                        <span className="truncate max-w-[150px]" title={service.name}>
                          {service.name}
                        </span>
                      </span>
                      <span className="font-medium whitespace-nowrap">
                        {formatCurrency(service.cost)} ₫
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export const CostBreakdownTable = memo(function CostBreakdownTable({
  data,
  loading,
}: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5" />
            Chi tiết Chênh lệch theo Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableIcon className="h-5 w-5" />
          Chi tiết Chênh lệch theo Booking
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
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Mã Booking</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Dự kiến</TableHead>
                  <TableHead className="text-right">Thực tế</TableHead>
                  <TableHead className="text-right">Chênh lệch</TableHead>
                  <TableHead className="text-center">SL DV</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <BookingRow key={item.bookingCode} item={item} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
