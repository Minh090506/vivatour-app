'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw } from 'lucide-react';
import { CostByServiceChart } from '@/components/operators/reports/cost-by-service-chart';
import { CostBySupplierTable } from '@/components/operators/reports/cost-by-supplier-table';
import { MonthlyTrend } from '@/components/operators/reports/monthly-trend';
import { PaymentStatusCards } from '@/components/operators/reports/payment-status-cards';
import { formatCurrency } from '@/lib/utils';
import type { OperatorCostReport, PaymentStatusReport } from '@/types';

export default function OperatorReportsPage() {
  const [costReport, setCostReport] = useState<OperatorCostReport | null>(null);
  const [paymentReport, setPaymentReport] = useState<PaymentStatusReport | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const [costRes, paymentRes] = await Promise.all([
        fetch(`/api/reports/operator-costs?${params}`),
        fetch('/api/reports/operator-payments'),
      ]);

      const [costData, paymentData] = await Promise.all([
        costRes.json(),
        paymentRes.json(),
      ]);

      if (costData.success) setCostReport(costData.data);
      if (paymentData.success) setPaymentReport(paymentData.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Báo Cáo Chi Phí
          </h1>
          <p className="text-muted-foreground">Phân tích chi phí điều hành theo dịch vụ, NCC và thời gian</p>
        </div>
        <Button variant="outline" onClick={fetchReports} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Date filters */}
      <Card>
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

      {/* Payment status */}
      {paymentReport && <PaymentStatusCards data={paymentReport} />}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          Đang tải báo cáo...
        </div>
      )}

      {/* Cost report tabs */}
      {!loading && costReport && (
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
      {!loading && costReport && costReport.summary.totalCount === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              Không có dữ liệu chi phí trong khoảng thời gian đã chọn
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
