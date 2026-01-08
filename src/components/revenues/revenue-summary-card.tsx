'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingUp, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Revenue {
  amountVND: number;
  paymentType: string;
  // 3-tier lock fields
  lockKT?: boolean;
  lockAdmin?: boolean;
  lockFinal?: boolean;
  // Legacy field for backward compatibility
  isLocked?: boolean;
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

  // Helper to check if any lock is active
  const hasAnyLock = (r: Revenue) =>
    r.lockKT || r.lockAdmin || r.lockFinal || r.isLocked;

  // Calculate lock tier totals
  const lockedKTTotal = revenues
    .filter((r) => r.lockKT && !r.lockAdmin && !r.lockFinal)
    .reduce((sum, r) => {
      const amount = Number(r.amountVND) || 0;
      return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
    }, 0);

  const lockedAdminTotal = revenues
    .filter((r) => r.lockAdmin && !r.lockFinal)
    .reduce((sum, r) => {
      const amount = Number(r.amountVND) || 0;
      return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
    }, 0);

  const lockedFinalTotal = revenues
    .filter((r) => r.lockFinal)
    .reduce((sum, r) => {
      const amount = Number(r.amountVND) || 0;
      return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
    }, 0);

  // Total locked (any tier)
  const totalLocked = revenues
    .filter(hasAnyLock)
    .reduce((sum, r) => {
      const amount = Number(r.amountVND) || 0;
      return r.paymentType === 'REFUND' ? sum - amount : sum + amount;
    }, 0);

  // Count by tier
  const countKT = revenues.filter((r) => r.lockKT && !r.lockAdmin && !r.lockFinal).length;
  const countAdmin = revenues.filter((r) => r.lockAdmin && !r.lockFinal).length;
  const countFinal = revenues.filter((r) => r.lockFinal).length;
  const totalLockedCount = revenues.filter(hasAnyLock).length;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tong thu nhap</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalVND)} d
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.length} giao dich
          </p>
        </CardContent>
      </Card>

      {/* Deposit Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dat coc</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(depositTotal)} d
          </div>
          <p className="text-xs text-muted-foreground">
            {revenues.filter((r) => r.paymentType === 'DEPOSIT').length} giao dich
          </p>
        </CardContent>
      </Card>

      {/* Locked by Tier - Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Da khoa</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(totalLocked)} d
          </div>
          <p className="text-xs text-muted-foreground">
            {totalLockedCount} giao dich
          </p>
        </CardContent>
      </Card>

      {/* Lock Tier Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Phan bo khoa</CardTitle>
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-amber-600" />
                <span className="text-amber-600">KT</span>
              </div>
              <span className="font-medium">{countKT}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-orange-600" />
                <span className="text-orange-600">Admin</span>
              </div>
              <span className="font-medium">{countAdmin}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-red-600" />
                <span className="text-red-600">Cuoi</span>
              </div>
              <span className="font-medium">{countFinal}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
