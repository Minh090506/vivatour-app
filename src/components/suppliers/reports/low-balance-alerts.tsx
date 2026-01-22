'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, AlertCircle, Wallet } from 'lucide-react';
import type { SupplierBalanceAlert } from '@/types';

interface Props {
  alerts: SupplierBalanceAlert[] | null | undefined;
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
};

export const LowBalanceAlerts = memo(function LowBalanceAlerts({
  alerts,
  loading,
}: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts?.filter(a => a.severity === 'critical').length || 0;
  const warningCount = alerts?.filter(a => a.severity === 'warning').length || 0;

  return (
    <Card className={criticalCount > 0 ? 'border-red-200 bg-red-50/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
            Canh bao So du Thap
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {criticalCount} nghiem trong
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-3 w-3" />
                {warningCount} canh bao
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Wallet className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-muted-foreground">Tat ca NCC deu co so du tot</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.supplierId}
                className={`p-3 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/suppliers/${alert.supplierId}`}
                      className="font-medium text-primary hover:underline block truncate"
                    >
                      {alert.supplierCode}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      {alert.supplierName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold ${alert.balance < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {alert.balance < 0 ? '-' : ''}{formatCurrency(alert.balance)} đ
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {alert.paymentModel}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm mt-2 text-muted-foreground">
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
