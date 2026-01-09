'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { CostByServiceChart } from '@/components/operators/reports/cost-by-service-chart';
import { CostBySupplierTable } from '@/components/operators/reports/cost-by-supplier-table';
import { MonthlyTrend } from '@/components/operators/reports/monthly-trend';
import { PaymentStatusCards } from '@/components/operators/reports/payment-status-cards';
import { ProfitReportTable } from '@/components/operators/reports/profit-report-table';
import { ProfitChart } from '@/components/operators/reports/profit-chart';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { safeFetch } from '@/lib/api/fetch-utils';
import { formatCurrency } from '@/lib/utils';
import type { OperatorCostReport, PaymentStatusReport, ProfitReport } from '@/types';

type ReportTab = 'cost' | 'profit';

export default function OperatorReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('cost');
  const [costReport, setCostReport] = useState<OperatorCostReport | null>(null);
  const [paymentReport, setPaymentReport] = useState<PaymentStatusReport | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reports function
  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    const costParams = new URLSearchParams();
    if (fromDate) costParams.set('fromDate', fromDate);
    if (toDate) costParams.set('toDate', toDate);

    const profitParams = new URLSearchParams();
    if (fromDate) profitParams.set('startDate', fromDate);
    if (toDate) profitParams.set('endDate', toDate);

    const [costResult, paymentResult, profitResult] = await Promise.all([
      safeFetch<OperatorCostReport>(`/api/reports/operator-costs?${costParams}`),
      safeFetch<PaymentStatusReport>('/api/reports/operator-payments'),
      safeFetch<ProfitReport>(`/api/reports/profit?${profitParams}`),
    ]);

    // Handle errors
    if (costResult.error || paymentResult.error || profitResult.error) {
      setError(costResult.error || paymentResult.error || profitResult.error);
    }

    // Set data if available
    if (costResult.data) setCostReport(costResult.data);
    if (paymentResult.data) setPaymentReport(paymentResult.data);
    if (profitResult.data) setProfitReport(profitResult.data);

    setLoading(false);
  };

  // Initial load and when date filters change
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Báo Cáo Điều Hành
          </h1>
          <p className="text-muted-foreground">Phân tích chi phí và lợi nhuận theo booking</p>
        </div>
        <Button variant="outline" onClick={fetchReports} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Main Report Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="cost" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Chi phí
          </TabsTrigger>
          <TabsTrigger value="profit" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Lợi nhuận
          </TabsTrigger>
        </TabsList>

        {/* Date filters */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40"
                />
              </div>
              {(fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Đang tải báo cáo...
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <ErrorFallback
            title="Lỗi tải báo cáo"
            message={error}
            onRetry={fetchReports}
            retryLabel="Tải lại"
          />
        )}

        {/* Cost Report Tab */}
        <TabsContent value="cost" className="mt-4 space-y-6">
          {/* Payment status */}
          {paymentReport && <PaymentStatusCards data={paymentReport} />}

          {/* Cost report content */}
          {!loading && !error && costReport && (
            <>
              {/* Summary */}
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

          {/* Empty state */}
          {!loading && !error && costReport && costReport.summary.totalCount === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Không có dữ liệu chi phí trong khoảng thời gian đã chọn
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Profit Report Tab */}
        <TabsContent value="profit" className="mt-4 space-y-6">
          {!loading && !error && profitReport && (
            <>
              {/* Profit Chart */}
              <ProfitChart data={profitReport.bookings} />

              {/* Profit Table */}
              <ProfitReportTable
                data={profitReport.bookings}
                summary={profitReport.summary}
              />
            </>
          )}

          {/* Empty state */}
          {!loading && !error && profitReport && profitReport.summary.bookingCount === 0 && (
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
