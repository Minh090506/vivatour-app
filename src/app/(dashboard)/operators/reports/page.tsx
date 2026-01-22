'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, RefreshCw, TrendingUp, Wallet, PieChart } from 'lucide-react';
import { ExportOperatorDropdown } from '@/components/operators/reports/export-operator-dropdown';
import { CostByServiceChart } from '@/components/operators/reports/cost-by-service-chart';
import { CostBySupplierTable } from '@/components/operators/reports/cost-by-supplier-table';
import { MonthlyTrend } from '@/components/operators/reports/monthly-trend';
import { PaymentStatusCards } from '@/components/operators/reports/payment-status-cards';
import { ProfitReportTable } from '@/components/operators/reports/profit-report-table';
import { ProfitChart } from '@/components/operators/reports/profit-chart';
import { RevenueStackedBarChart } from '@/components/operators/reports/revenue-stacked-bar-chart';
import { RevenueByServiceTable } from '@/components/operators/reports/revenue-by-service-table';
import { RevenueBySupplierTable } from '@/components/operators/reports/revenue-by-supplier-table';
import { CostBreakdownPieChart } from '@/components/operators/reports/cost-breakdown-pie-chart';
import { CostBreakdownTable } from '@/components/operators/reports/cost-breakdown-table';
import { CostBreakdownSupplierTable } from '@/components/operators/reports/cost-breakdown-supplier-table';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { safeFetch } from '@/lib/api/fetch-utils';
import { formatCurrency } from '@/lib/utils';
import { SERVICE_TYPES } from '@/config/operator-config';
import type {
  OperatorCostReport,
  PaymentStatusReport,
  ProfitReport,
  OperatorRevenueReport,
  CostBreakdownReport,
  Supplier,
} from '@/types';

type ReportTab = 'cost' | 'profit' | 'revenue' | 'breakdown';

export default function OperatorReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('cost');
  const [costReport, setCostReport] = useState<OperatorCostReport | null>(null);
  const [paymentReport, setPaymentReport] = useState<PaymentStatusReport | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [revenueReport, setRevenueReport] = useState<OperatorRevenueReport | null>(null);
  const [breakdownReport, setBreakdownReport] = useState<CostBreakdownReport | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  // Revenue/Breakdown tab specific filters
  const [revenueServiceType, setRevenueServiceType] = useState('');
  const [revenueSupplierId, setRevenueSupplierId] = useState('');
  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch suppliers for filter dropdown
  useEffect(() => {
    const fetchSuppliers = async () => {
      const result = await safeFetch<Supplier[]>('/api/suppliers');
      if (result.data) setSuppliers(result.data);
    };
    fetchSuppliers();
  }, []);

  // Fetch cost and profit reports
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

  // Fetch revenue report separately (has its own filters)
  const fetchRevenueReport = async () => {
    setRevenueLoading(true);

    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (revenueServiceType) params.set('serviceType', revenueServiceType);
    if (revenueSupplierId) params.set('supplierId', revenueSupplierId);

    const result = await safeFetch<OperatorRevenueReport>(
      `/api/operator/reports/revenue?${params}`
    );

    if (result.data) setRevenueReport(result.data);
    setRevenueLoading(false);
  };

  // Fetch cost breakdown report (has its own filters)
  const fetchBreakdownReport = async () => {
    setBreakdownLoading(true);

    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (revenueServiceType) params.set('serviceType', revenueServiceType);
    if (revenueSupplierId) params.set('supplierId', revenueSupplierId);

    const result = await safeFetch<CostBreakdownReport>(
      `/api/operator/reports/cost-breakdown?${params}`
    );

    if (result.data) setBreakdownReport(result.data);
    setBreakdownLoading(false);
  };

  // Initial load and when date filters change
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  // Fetch revenue when tab is active or filters change
  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fromDate, toDate, revenueServiceType, revenueSupplierId]);

  // Fetch breakdown when tab is active or filters change
  useEffect(() => {
    if (activeTab === 'breakdown') {
      fetchBreakdownReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fromDate, toDate, revenueServiceType, revenueSupplierId]);

  // Clear revenue-specific filters
  const clearRevenueFilters = () => {
    setRevenueServiceType('');
    setRevenueSupplierId('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Báo Cáo Điều Hành
          </h1>
          <p className="text-muted-foreground">Phân tích chi phí, thanh toán và lợi nhuận</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportOperatorDropdown
            activeTab={activeTab}
            costReport={costReport}
            profitReport={profitReport}
            revenueReport={revenueReport}
            breakdownReport={breakdownReport}
            loading={loading || revenueLoading || breakdownLoading}
          />
          <Button
            variant="outline"
            onClick={() => {
              fetchReports();
              if (activeTab === 'revenue') fetchRevenueReport();
              if (activeTab === 'breakdown') fetchBreakdownReport();
            }}
            disabled={loading || revenueLoading || breakdownLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || revenueLoading || breakdownLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Main Report Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="cost" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Chi phí
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Phân tích CP
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Thanh toán
          </TabsTrigger>
          <TabsTrigger value="profit" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Lợi nhuận
          </TabsTrigger>
        </TabsList>

        {/* Date filters - shared across tabs */}
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

              {/* Revenue/Breakdown-specific filters */}
              {(activeTab === 'revenue' || activeTab === 'breakdown') && (
                <>
                  <div className="space-y-2">
                    <Label>Loại dịch vụ</Label>
                    <Select value={revenueServiceType} onValueChange={setRevenueServiceType}>
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
                  <div className="space-y-2">
                    <Label>Nhà cung cấp</Label>
                    <Select value={revenueSupplierId} onValueChange={setRevenueSupplierId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tất cả</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(fromDate || toDate || ((activeTab === 'revenue' || activeTab === 'breakdown') && (revenueServiceType || revenueSupplierId))) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    if (activeTab === 'revenue' || activeTab === 'breakdown') clearRevenueFilters();
                  }}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && activeTab !== 'revenue' && activeTab !== 'breakdown' && (
          <div className="text-center py-8 text-muted-foreground">
            Đang tải báo cáo...
          </div>
        )}

        {/* Error state */}
        {!loading && error && activeTab !== 'revenue' && activeTab !== 'breakdown' && (
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

        {/* Cost Breakdown Report Tab */}
        <TabsContent value="breakdown" className="mt-4 space-y-6">
          {/* Loading state */}
          {breakdownLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải phân tích chi phí...
            </div>
          )}

          {!breakdownLoading && breakdownReport && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Chi phí dự kiến</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(breakdownReport.summary.totalExpectedCost)} ₫
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Chi phí thực tế</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(breakdownReport.summary.totalActualCost)} ₫
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Chênh lệch</p>
                    <p className={`text-2xl font-bold ${
                      breakdownReport.summary.totalVariance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {breakdownReport.summary.totalVariance > 0 ? '+' : ''}
                      {formatCurrency(breakdownReport.summary.totalVariance)} ₫
                      <span className="text-sm ml-1">
                        ({breakdownReport.summary.variancePercent}%)
                      </span>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Số Booking</p>
                    <p className="text-2xl font-bold">{breakdownReport.summary.bookingCount}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pie Chart + Supplier Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CostBreakdownPieChart
                  data={breakdownReport.byServiceType}
                  totalCost={breakdownReport.summary.totalActualCost}
                />
                <CostBreakdownSupplierTable data={breakdownReport.bySupplier} />
              </div>

              {/* Booking Breakdown Table */}
              <CostBreakdownTable data={breakdownReport.byBooking} />
            </>
          )}

          {/* Empty state */}
          {!breakdownLoading && breakdownReport && breakdownReport.summary.totalCount === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Không có dữ liệu phân tích trong khoảng thời gian đã chọn
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Revenue Report Tab (NEW) */}
        <TabsContent value="revenue" className="mt-4 space-y-6">
          {/* Loading state */}
          {revenueLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải báo cáo thanh toán...
            </div>
          )}

          {!revenueLoading && revenueReport && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(revenueReport.summary.totalCost)} ₫
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Đã thanh toán</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(revenueReport.summary.paidAmount)} ₫
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Còn nợ</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(revenueReport.summary.debt)} ₫
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Số dịch vụ</p>
                    <p className="text-2xl font-bold">{revenueReport.summary.totalCount}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Stacked Bar Chart */}
              <RevenueStackedBarChart data={revenueReport.byMonth} />

              {/* Sub tabs for detailed breakdown */}
              <Tabs defaultValue="service">
                <TabsList>
                  <TabsTrigger value="service">Theo loại DV</TabsTrigger>
                  <TabsTrigger value="supplier">Theo NCC</TabsTrigger>
                </TabsList>

                <TabsContent value="service" className="mt-4">
                  <RevenueByServiceTable data={revenueReport.byServiceType} />
                </TabsContent>

                <TabsContent value="supplier" className="mt-4">
                  <RevenueBySupplierTable data={revenueReport.bySupplier} />
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* Empty state */}
          {!revenueLoading && revenueReport && revenueReport.summary.totalCount === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Không có dữ liệu thanh toán trong khoảng thời gian đã chọn
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
