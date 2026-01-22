'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportDate } from '@/contexts/report-date-context';
import { CostByServiceChart } from '@/components/operators/reports/cost-by-service-chart';
import { CostBySupplierTable } from '@/components/operators/reports/cost-by-supplier-table';
import { MonthlyTrend } from '@/components/operators/reports/monthly-trend';
import { PaymentStatusCards } from '@/components/operators/reports/payment-status-cards';
import { ProfitReportTable } from '@/components/operators/reports/profit-report-table';
import { ProfitChart } from '@/components/operators/reports/profit-chart';
import { OperatorSkeleton } from './report-skeleton';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { safeFetch } from '@/lib/api/fetch-utils';
import { formatCurrency } from '@/lib/utils';
import { SERVICE_TYPES } from '@/config/operator-config';
import type {
  OperatorCostReport,
  PaymentStatusReport,
  ProfitReport,
  Supplier,
} from '@/types';

type SubTab = 'cost' | 'profit';

/**
 * Operator tab content for unified dashboard.
 * Shows cost analysis and profit reports with sub-tabs.
 */
export function OperatorTabContent() {
  const { dateRange, customDates } = useReportDate();
  const [subTab, setSubTab] = useState<SubTab>('cost');
  const [costReport, setCostReport] = useState<OperatorCostReport | null>(null);
  const [paymentReport, setPaymentReport] = useState<PaymentStatusReport | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch suppliers for filter dropdown
  useEffect(() => {
    safeFetch<Supplier[]>('/api/suppliers').then(result => {
      if (result.data) setSuppliers(result.data);
    });
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Build date params
    const costParams = new URLSearchParams();
    if (dateRange === 'custom' && customDates?.startDate) {
      costParams.set('fromDate', customDates.startDate);
      if (customDates.endDate) costParams.set('toDate', customDates.endDate);
    }

    const profitParams = new URLSearchParams();
    if (dateRange === 'custom' && customDates?.startDate) {
      profitParams.set('startDate', customDates.startDate);
      if (customDates.endDate) profitParams.set('endDate', customDates.endDate);
    }

    const [costResult, paymentResult, profitResult] = await Promise.all([
      safeFetch<OperatorCostReport>(`/api/reports/operator-costs?${costParams}`),
      safeFetch<PaymentStatusReport>('/api/reports/operator-payments'),
      safeFetch<ProfitReport>(`/api/reports/profit?${profitParams}`),
    ]);

    if (costResult.error || paymentResult.error || profitResult.error) {
      setError(costResult.error || paymentResult.error || profitResult.error || 'Lỗi tải dữ liệu');
    }

    if (costResult.data) setCostReport(costResult.data);
    if (paymentResult.data) setPaymentReport(paymentResult.data);
    if (profitResult.data) setProfitReport(profitResult.data);

    setLoading(false);
  }, [dateRange, customDates]);

  useEffect(() => {
    // Don't fetch if custom dates not provided
    if (dateRange === 'custom' && (!customDates?.startDate || !customDates?.endDate)) {
      return;
    }
    fetchReports();
  }, [fetchReports, dateRange, customDates]);

  if (loading) {
    return <OperatorSkeleton />;
  }

  if (error) {
    return (
      <ErrorFallback
        title="Lỗi tải báo cáo điều hành"
        message={error}
        onRetry={fetchReports}
        retryLabel="Tải lại"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment status cards */}
      {paymentReport && <PaymentStatusCards data={paymentReport} />}

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="cost">Chi phí</TabsTrigger>
          <TabsTrigger value="profit">Lợi nhuận</TabsTrigger>
        </TabsList>

        {/* Cost Tab */}
        <TabsContent value="cost" className="mt-4 space-y-6">
          {costReport && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(costReport.summary.totalCost)} ₫
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Số dịch vụ</p>
                    <p className="text-2xl font-bold">{costReport.summary.totalCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Chi phí TB/dịch vụ</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(costReport.summary.avgCost)} ₫
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-sm">Loại dịch vụ</Label>
                  <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tất cả</SelectItem>
                      {Object.entries(SERVICE_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nested tabs for breakdown views */}
              <Tabs defaultValue="service">
                <TabsList>
                  <TabsTrigger value="service">Theo loại DV</TabsTrigger>
                  <TabsTrigger value="supplier">Theo NCC</TabsTrigger>
                  <TabsTrigger value="month">Theo tháng</TabsTrigger>
                </TabsList>

                <TabsContent value="service" className="mt-4">
                  <CostByServiceChart
                    data={costReport.byServiceType}
                    totalCost={costReport.summary.totalCost}
                  />
                </TabsContent>

                <TabsContent value="supplier" className="mt-4">
                  <CostBySupplierTable data={costReport.bySupplier} />
                </TabsContent>

                <TabsContent value="month" className="mt-4">
                  <MonthlyTrend data={costReport.byMonth} />
                </TabsContent>
              </Tabs>
            </>
          )}

          {costReport && costReport.summary.totalCount === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Không có dữ liệu chi phí trong khoảng thời gian đã chọn
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Profit Tab */}
        <TabsContent value="profit" className="mt-4 space-y-6">
          {profitReport && (
            <>
              <ProfitChart data={profitReport.bookings} />
              <ProfitReportTable
                data={profitReport.bookings}
                summary={profitReport.summary}
              />
            </>
          )}

          {profitReport && profitReport.summary.bookingCount === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Không có dữ liệu lợi nhuận trong khoảng thời gian đã chọn
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
