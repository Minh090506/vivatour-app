'use client';

import { useReportDate } from '@/contexts/report-date-context';
import { useRevenueReports } from '@/hooks/use-revenue-reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueByTypeChart } from '@/components/revenues/reports/revenue-by-type-chart';
import { RevenueBySourceChart } from '@/components/revenues/reports/revenue-by-source-chart';
import { CurrencyBreakdownTable } from '@/components/revenues/reports/currency-breakdown-table';
import { RevenueSkeleton } from './report-skeleton';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { DollarSign, TrendingUp, CreditCard } from 'lucide-react';

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Revenue tab content for unified dashboard.
 * Displays revenue by type, source, and currency breakdown.
 */
export function RevenueTabContent() {
  const { dateRange, customDates } = useReportDate();
  const { data, loading, error, refetch } = useRevenueReports(dateRange, customDates);

  if (loading) {
    return <RevenueSkeleton />;
  }

  if (error) {
    return (
      <ErrorFallback
        title="Lỗi tải báo cáo doanh thu"
        message={error}
        onRetry={refetch}
        retryLabel="Tải lại"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatVND(data?.summary.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">VND</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số giao dịch</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.summary.transactionCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">giao dịch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giá trị trung bình</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatVND(data?.summary.avgTransaction || 0)}
            </div>
            <p className="text-xs text-muted-foreground">VND/giao dịch</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <RevenueByTypeChart data={data?.byType} loading={false} />
        <RevenueBySourceChart data={data?.bySource} loading={false} />
      </div>

      {/* Currency Breakdown */}
      <CurrencyBreakdownTable data={data?.byCurrency} loading={false} />
    </div>
  );
}
