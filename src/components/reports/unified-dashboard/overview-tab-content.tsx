'use client';

import { useReports } from '@/hooks/use-reports';
import { useReportDate } from '@/contexts/report-date-context';
import { KPICards } from '@/components/reports/kpi-cards';
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart';
import { CostBreakdownChart } from '@/components/reports/cost-breakdown-chart';
import { FunnelChart } from '@/components/reports/funnel-chart';
import { OverviewSkeleton } from './report-skeleton';
import { ErrorFallback } from '@/components/ui/error-fallback';

/**
 * Overview tab content for unified dashboard.
 * Displays KPI cards, revenue trend, cost breakdown, and funnel charts.
 */
export function OverviewTabContent() {
  const { dateRange, customDates } = useReportDate();
  const { dashboard, trend, costBreakdown, funnel, loading, error, refetch } =
    useReports(dateRange, customDates);

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (error) {
    return (
      <ErrorFallback
        title="Lỗi tải tổng quan"
        message={error}
        onRetry={refetch}
        retryLabel="Tải lại"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards data={dashboard} loading={false} />

      {/* Revenue Trend */}
      <RevenueTrendChart data={trend} loading={false} />

      {/* Cost Breakdown & Funnel */}
      <div className="grid md:grid-cols-2 gap-6">
        <CostBreakdownChart data={costBreakdown} loading={false} />
        <FunnelChart data={funnel} loading={false} />
      </div>
    </div>
  );
}
