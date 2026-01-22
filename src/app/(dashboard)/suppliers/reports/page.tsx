'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Building2, Download, History, AlertTriangle } from 'lucide-react';
import { SUPPLIER_TYPES, SUPPLIER_TYPE_KEYS } from '@/config/supplier-config';
import { BalanceTrendChart } from '@/components/suppliers/reports/balance-trend-chart';
import { PaymentModelChart } from '@/components/suppliers/reports/payment-model-chart';
import { LowBalanceAlerts } from '@/components/suppliers/reports/low-balance-alerts';
import { exportSupplierBalance, exportSupplierTransactions } from '@/lib/export/csv-generator';
import Link from 'next/link';
import type { SupplierBalanceAlert, TransactionType } from '@/types';

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

interface TransactionData {
  id: string;
  supplierId: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string | null;
  proofLink: string | null;
  relatedBookingCode: string | null;
  supplier?: { code: string; name: string };
}

export default function SupplierReportsPage() {
  const [data, setData] = useState<SupplierBalanceData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byPaymentModel, setByPaymentModel] = useState<PaymentModelData[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [alerts, setAlerts] = useState<SupplierBalanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Transaction history state
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilters, setTransactionFilters] = useState({
    supplierId: '',
    type: '' as TransactionType | '',
    fromDate: '',
    toDate: '',
  });
  const [transactionsTotal, setTransactionsTotal] = useState(0);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
    params.set('includeAlerts', 'true');

    const res = await fetch(`/api/reports/supplier-balance?${params}`);
    const result = await res.json();
    if (result.success) {
      setData(result.data);
      setSummary(result.summary);
      setByPaymentModel(result.byPaymentModel || []);
      setTrend(result.trend || []);
      setAlerts(result.alerts || []);
    }
    setLoading(false);
  }, [typeFilter]);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    const params = new URLSearchParams();
    if (transactionFilters.supplierId) params.set('supplierId', transactionFilters.supplierId);
    if (transactionFilters.type) params.set('type', transactionFilters.type);
    if (transactionFilters.fromDate) params.set('fromDate', transactionFilters.fromDate);
    if (transactionFilters.toDate) params.set('toDate', transactionFilters.toDate);
    params.set('limit', '50');

    const res = await fetch(`/api/supplier-transactions?${params}`);
    const result = await res.json();
    if (result.success) {
      setTransactions(result.data || []);
      setTransactionsTotal(result.total || 0);
    }
    setTransactionsLoading(false);
  }, [transactionFilters]);

  const handleExport = useCallback(() => {
    if (!data.length) return;
    exportSupplierBalance(data);
  }, [data]);

  const handleTransactionExport = useCallback(() => {
    if (!transactions.length) return;
    const txnData = transactions.map((txn) => ({
      transactionDate: txn.transactionDate,
      supplierCode: txn.supplier?.code || '',
      supplierName: txn.supplier?.name || '',
      type: getTransactionTypeLabel(txn.type),
      amount: txn.amount,
      description: txn.description,
      relatedBookingCode: txn.relatedBookingCode,
    }));
    exportSupplierTransactions(txnData);
  }, [transactions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTransactions();
    }
  }, [activeTab, fetchTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    const labels: Record<TransactionType, string> = {
      DEPOSIT: 'Nạp tiền',
      REFUND: 'Hoàn tiền',
      ADJUSTMENT: 'Điều chỉnh',
      FEE: 'Phí',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: TransactionType) => {
    const colors: Record<TransactionType, string> = {
      DEPOSIT: 'bg-green-100 text-green-800',
      REFUND: 'bg-blue-100 text-blue-800',
      ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
      FEE: 'bg-red-100 text-red-800',
    };
    return colors[type] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bao cao Cong no NCC</h1>
          <p className="text-muted-foreground">Tong hop so du cac nha cung cap</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tat ca loai NCC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca</SelectItem>
              {SUPPLIER_TYPE_KEYS.map((key) => (
                <SelectItem key={key} value={key}>{SUPPLIER_TYPES[key].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={!data.length}>
            <Download className="h-4 w-4 mr-2" />
            Xuat CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">So NCC</span>
              </div>
              <p className="text-2xl font-bold mt-2">{summary.supplierCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Tong nap</span>
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
                <span className="text-sm text-muted-foreground">Tong chi</span>
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
                <span className="text-sm text-muted-foreground">Tong so du</span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${summary.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalBalance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Wallet className="h-4 w-4" />
            Tong quan
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Canh bao ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <History className="h-4 w-4" />
            Lich su GD
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Balance Status Cards */}
          {summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-600">So du duong (Co credit)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{summary.positiveBalance}</p>
                  <p className="text-sm text-muted-foreground">nha cung cap</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">So du am (Can thanh toan)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{summary.negativeBalance}</p>
                  <p className="text-sm text-muted-foreground">nha cung cap</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <BalanceTrendChart data={trend} loading={loading} />
            <PaymentModelChart data={byPaymentModel} loading={loading} />
          </div>

          {/* Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle>Chi tiet theo NCC</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ma NCC</TableHead>
                    <TableHead>Ten NCC</TableHead>
                    <TableHead>Loai</TableHead>
                    <TableHead className="text-right">Tong nap</TableHead>
                    <TableHead className="text-right">Da chi</TableHead>
                    <TableHead className="text-right">Hoan tien</TableHead>
                    <TableHead className="text-right">So du</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((supplier) => (
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
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(supplier.refunds)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${supplier.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(supplier.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-6">
          <LowBalanceAlerts alerts={alerts} loading={loading} />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4 mt-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bo loc giao dich</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="txn-supplier">NCC</Label>
                  <Select
                    value={transactionFilters.supplierId}
                    onValueChange={(v) => setTransactionFilters(prev => ({ ...prev, supplierId: v === 'all' ? '' : v }))}
                  >
                    <SelectTrigger id="txn-supplier">
                      <SelectValue placeholder="Tat ca NCC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tat ca</SelectItem>
                      {data.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="txn-type">Loai GD</Label>
                  <Select
                    value={transactionFilters.type}
                    onValueChange={(v) => setTransactionFilters(prev => ({ ...prev, type: v === 'all' ? '' : v as TransactionType }))}
                  >
                    <SelectTrigger id="txn-type">
                      <SelectValue placeholder="Tat ca loai" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tat ca</SelectItem>
                      <SelectItem value="DEPOSIT">Nap tien</SelectItem>
                      <SelectItem value="REFUND">Hoan tien</SelectItem>
                      <SelectItem value="ADJUSTMENT">Dieu chinh</SelectItem>
                      <SelectItem value="FEE">Phi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="txn-from">Tu ngay</Label>
                  <Input
                    id="txn-from"
                    type="date"
                    value={transactionFilters.fromDate}
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="txn-to">Den ngay</Label>
                  <Input
                    id="txn-to"
                    type="date"
                    value={transactionFilters.toDate}
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, toDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={fetchTransactions} disabled={transactionsLoading}>
                  {transactionsLoading ? 'Dang tai...' : 'Loc giao dich'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lich su giao dich</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{transactionsTotal} giao dich</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTransactionExport}
                    disabled={!transactions.length}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Xuat CSV
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="text-center py-10 text-muted-foreground">Dang tai...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  Khong co giao dich nao
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngay</TableHead>
                      <TableHead>NCC</TableHead>
                      <TableHead>Loai</TableHead>
                      <TableHead className="text-right">So tien</TableHead>
                      <TableHead>Mo ta</TableHead>
                      <TableHead>Booking</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(txn.transactionDate)}
                        </TableCell>
                        <TableCell>
                          {txn.supplier ? (
                            <Link href={`/suppliers/${txn.supplierId}`} className="text-primary hover:underline">
                              {txn.supplier.code}
                            </Link>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTransactionTypeColor(txn.type)}>
                            {getTransactionTypeLabel(txn.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          txn.type === 'DEPOSIT' || txn.type === 'REFUND'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {txn.type === 'FEE' ? '-' : '+'}{formatCurrency(txn.amount)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {txn.description || '-'}
                        </TableCell>
                        <TableCell>
                          {txn.relatedBookingCode || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
