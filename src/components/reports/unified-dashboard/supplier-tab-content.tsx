'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Building2, Download, AlertTriangle } from 'lucide-react';
import { SUPPLIER_TYPES, SUPPLIER_TYPE_KEYS } from '@/config/supplier-config';
import { BalanceTrendChart } from '@/components/suppliers/reports/balance-trend-chart';
import { PaymentModelChart } from '@/components/suppliers/reports/payment-model-chart';
import { LowBalanceAlerts } from '@/components/suppliers/reports/low-balance-alerts';
import { exportSupplierBalance } from '@/lib/export/csv-generator';
import { SupplierSkeleton } from './report-skeleton';
import { ErrorFallback } from '@/components/ui/error-fallback';
import Link from 'next/link';
import type { SupplierBalanceAlert } from '@/types';

interface SupplierBalanceData extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  type: string;
  deposits: number;
  costs: number;
  refunds: number;
  balance: number;
}

interface Summary {
  supplierCount: number;
  totalDeposits: number;
  totalCosts: number;
  totalRefunds: number;
  totalBalance: number;
  positiveBalance: number;
  negativeBalance: number;
}

interface PaymentModelData {
  model: string;
  count: number;
  totalBalance: number;
}

interface TrendData {
  month: string;
  deposits: number;
  costs: number;
  balance: number;
}

type SubTab = 'overview' | 'alerts';

/**
 * Supplier tab content for unified dashboard.
 * Displays supplier balance overview and alerts.
 */
export function SupplierTabContent() {
  const [data, setData] = useState<SupplierBalanceData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byPaymentModel, setByPaymentModel] = useState<PaymentModelData[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [alerts, setAlerts] = useState<SupplierBalanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [subTab, setSubTab] = useState<SubTab>('overview');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
    params.set('includeAlerts', 'true');

    try {
      const res = await fetch(`/api/reports/supplier-balance?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setSummary(result.summary);
        setByPaymentModel(result.byPaymentModel || []);
        setTrend(result.trend || []);
        setAlerts(result.alerts || []);
      } else {
        setError(result.error || 'Lỗi tải dữ liệu');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ');
    }

    setLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = useCallback(() => {
    if (!data.length) return;
    exportSupplierBalance(data);
  }, [data]);

  if (loading) {
    return <SupplierSkeleton />;
  }

  if (error) {
    return (
      <ErrorFallback
        title="Lỗi tải báo cáo NCC"
        message={error}
        onRetry={fetchReport}
        retryLabel="Tải lại"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filter and export */}
      <div className="flex items-center justify-between">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tất cả loại NCC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {SUPPLIER_TYPE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>{SUPPLIER_TYPES[key].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport} disabled={!data.length}>
          <Download className="h-4 w-4 mr-2" />
          Xuất CSV
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Số NCC</span>
              </div>
              <p className="text-2xl font-bold mt-2">{summary.supplierCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Tổng nạp</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(summary.totalDeposits)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-muted-foreground">Tổng chi</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(summary.totalCosts)}
              </p>
            </CardContent>
          </Card>

          <Card className={summary.totalBalance >= 0 ? 'bg-green-50' : 'bg-red-50'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Wallet className={`h-5 w-5 ${summary.totalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm text-muted-foreground">Tổng số dư</span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${summary.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalBalance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Wallet className="h-4 w-4" />
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Cảnh báo ({alerts.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Balance Status */}
          {summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-600">Số dư dương (Có credit)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{summary.positiveBalance}</p>
                  <p className="text-sm text-muted-foreground">nhà cung cấp</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">Số dư âm (Cần thanh toán)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{summary.negativeBalance}</p>
                  <p className="text-sm text-muted-foreground">nhà cung cấp</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <BalanceTrendChart data={trend} loading={false} />
            <PaymentModelChart data={byPaymentModel} loading={false} />
          </div>

          {/* Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết theo NCC</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã NCC</TableHead>
                    <TableHead>Tên NCC</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Tổng nạp</TableHead>
                    <TableHead className="text-right">Đã chi</TableHead>
                    <TableHead className="text-right">Số dư</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 10).map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Link href={`/suppliers/${supplier.id}`} className="font-medium text-primary hover:underline">
                          {supplier.code}
                        </Link>
                      </TableCell>
                      <TableCell>{supplier.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{supplier.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(supplier.deposits)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(supplier.costs)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${supplier.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(supplier.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.length > 10 && (
                <div className="text-center mt-4">
                  <Button variant="link" asChild>
                    <Link href="/suppliers/reports">Xem tất cả {data.length} NCC →</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-6">
          <LowBalanceAlerts alerts={alerts} loading={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
