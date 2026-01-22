'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePermission } from '@/hooks/use-permission';
import { usePaymentTracking } from '@/hooks/use-payment-tracking';
import type { DateRangeOption, CustomDateRange } from '@/hooks/use-reports';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { PaymentTimelineChart } from '@/components/revenues/reports/payment-timeline-chart';
import { PaymentCurrencyTable } from '@/components/revenues/reports/payment-currency-table';
import { OverduePaymentsAlert } from '@/components/revenues/reports/overdue-payments-alert';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
} from 'lucide-react';

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function PaymentTrackingPage() {
  const { isAdmin, isAccountant, isLoading: authLoading } = usePermission();
  const [dateRange, setDateRange] = useState<DateRangeOption>('last6Months');
  const [customDates, setCustomDates] = useState<CustomDateRange | undefined>();
  const { data, loading, error, refetch } = usePaymentTracking(dateRange, customDates);

  // Permission check
  if (authLoading) {
    return <div className="text-center py-10">Dang tai...</div>;
  }

  if (!isAdmin && !isAccountant) {
    return (
      <ErrorFallback
        title="Khong co quyen truy cap"
        message="Ban can quyen Admin hoac Ke toan de xem bao cao."
      />
    );
  }

  if (error) {
    return (
      <ErrorFallback
        title="Loi tai bao cao"
        message={error}
        onRetry={refetch}
        retryLabel="Tai lai"
      />
    );
  }

  const summary = data?.summary;
  const collectionRate = summary?.collectionRate || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/revenues/reports">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Theo doi Thanh toan
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            So sanh tien du kien vs da nhan theo booking
          </p>
        </div>
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          customDates={customDates}
          onCustomDatesChange={setCustomDates}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Du kien thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatVND(summary?.totalExpectedRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? '-' : `${summary?.bookingCount || 0} booking`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Da nhan</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : formatVND(summary?.totalReceivedAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? '-' : `${summary?.paymentCount || 0} giao dich`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con thieu</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? '...' : formatVND(summary?.totalRemainingAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? '-' : `${summary?.overdueCount || 0} qua han`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ty le thu</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              collectionRate >= 80 ? 'text-green-600' :
              collectionRate >= 50 ? 'text-orange-600' : 'text-destructive'
            }`}>
              {loading ? '...' : `${collectionRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              da nhan / du kien
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alerts */}
      <OverduePaymentsAlert data={data?.overdueAlerts} loading={loading} />

      {/* Payment Timeline Chart */}
      <PaymentTimelineChart data={data?.timeline} loading={loading} />

      {/* Currency Breakdown */}
      <PaymentCurrencyTable data={data?.byCurrency} loading={loading} />
    </div>
  );
}
