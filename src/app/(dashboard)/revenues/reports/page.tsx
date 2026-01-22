'use client';

import { useState } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { useRevenueReports } from '@/hooks/use-revenue-reports';
import type { DateRangeOption, CustomDateRange } from '@/hooks/use-reports';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { RevenueByTypeChart } from '@/components/revenues/reports/revenue-by-type-chart';
import { RevenueBySourceChart } from '@/components/revenues/reports/revenue-by-source-chart';
import { CurrencyBreakdownTable } from '@/components/revenues/reports/currency-breakdown-table';
import { DollarSign, TrendingUp, CreditCard, ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function RevenueReportsPage() {
  const { isAdmin, isAccountant, isLoading: authLoading } = usePermission();
  const [dateRange, setDateRange] = useState<DateRangeOption>('last6Months');
  const [customDates, setCustomDates] = useState<CustomDateRange | undefined>();
  const { data, loading, error, refetch } = useRevenueReports(dateRange, customDates);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/revenues">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Bao cao Doanh thu
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">Phan tich doanh thu theo loai, nguon, va tien te</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/revenues/reports/payments">
              <Receipt className="h-4 w-4 mr-2" />
              Theo doi Thanh toan
            </Link>
          </Button>
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            customDates={customDates}
            onCustomDatesChange={setCustomDates}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tong doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatVND(data?.summary.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">VND</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">So giao dich</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : data?.summary.transactionCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">giao dich</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gia tri trung binh</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatVND(data?.summary.avgTransaction || 0)}
            </div>
            <p className="text-xs text-muted-foreground">VND/giao dich</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <RevenueByTypeChart data={data?.byType} loading={loading} />
        <RevenueBySourceChart data={data?.bySource} loading={loading} />
      </div>

      {/* Currency Breakdown */}
      <CurrencyBreakdownTable data={data?.byCurrency} loading={loading} />
    </div>
  );
}
