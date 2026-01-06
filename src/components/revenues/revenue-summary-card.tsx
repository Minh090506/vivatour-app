'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingUp, Lock } from 'lucide-react';

interface Revenue {
  amountVND: number;
  paymentType: string;
  isLocked: boolean;
}

interface RevenueSummaryCardProps {
  revenues: Revenue[];
  className?: string;
}

export function RevenueSummaryCard({ revenues, className }: RevenueSummaryCardProps) {
  // Calculate totals
  const totalVND = revenues.reduce((sum, r) => {
    const amount = Number(r.amountVND) || 0;
    // Refunds are negative
    return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
  }, 0);

  const depositTotal = revenues
    .filter((r) => r.paymentType === 'DEPOSIT')
    .reduce((sum, r) => sum + (Number(r.amountVND) || 0), 0);

  const lockedTotal = revenues
    .filter((r) => r.isLocked)
    .reduce((sum, r) => {
      const amount = Number(r.amountVND) || 0;
      return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
    }, 0);

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng thu nhập</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalVND)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.length} giao dịch
          </p>
        </CardContent>
      </Card>

      {/* Deposit Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đặt cọc</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(depositTotal)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.filter((r) => r.paymentType === 'DEPOSIT').length} giao dịch
          </p>
        </CardContent>
      </Card>

      {/* Locked Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Đã khóa</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(lockedTotal)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.filter((r) => r.isLocked).length} giao dịch
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
