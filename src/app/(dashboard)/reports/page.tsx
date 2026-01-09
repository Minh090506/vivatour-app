'use client';

import { useState } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { useReports, type DateRangeOption } from '@/hooks/use-reports';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { KPICards } from '@/components/reports/kpi-cards';
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart';
import { CostBreakdownChart } from '@/components/reports/cost-breakdown-chart';
import { FunnelChart } from '@/components/reports/funnel-chart';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const { isAdmin, isAccountant, isLoading: authLoading } = usePermission();
  const [dateRange, setDateRange] = useState<DateRangeOption>('last6Months');
  const { dashboard, trend, costBreakdown, funnel, loading, error, refetch } =
    useReports(dateRange);

  // Permission check
  if (authLoading) {
    return <div className="text-center py-10">Đang tải...</div>;
  }

  if (!isAdmin && !isAccountant) {
    return (
      <ErrorFallback
        title="Không có quyền truy cập"
        message="Bạn cần quyền Admin hoặc Kế toán để xem báo cáo."
      />
    );
  }

  if (error) {
    return (
      <ErrorFallback
        title="Lỗi tải báo cáo"
        message={error}
        onRetry={refetch}
        retryLabel="Tải lại"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Báo cáo Tổng quan
          </h1>
          <p className="text-muted-foreground">Phân tích hiệu suất kinh doanh</p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <KPICards data={dashboard} loading={loading} />

      {/* Revenue Trend */}
      <RevenueTrendChart data={trend} loading={loading} />

      {/* Cost Breakdown & Funnel */}
      <div className="grid md:grid-cols-2 gap-6">
        <CostBreakdownChart data={costBreakdown} loading={loading} />
        <FunnelChart data={funnel} loading={loading} />
      </div>
    </div>
  );
}
