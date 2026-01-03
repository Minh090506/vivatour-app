'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Building2 } from 'lucide-react';
import { SUPPLIER_TYPES, SUPPLIER_TYPE_KEYS } from '@/config/supplier-config';
import Link from 'next/link';

interface SupplierBalanceData {
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

export default function SupplierReportsPage() {
  const [data, setData] = useState<SupplierBalanceData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchReport();
  }, [typeFilter]);

  const fetchReport = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);

    const res = await fetch(`/api/reports/supplier-balance?${params}`);
    const result = await res.json();
    if (result.success) {
      setData(result.data);
      setSummary(result.summary);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải báo cáo...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo Công nợ NCC</h1>
          <p className="text-muted-foreground">Tổng hợp số dư các nhà cung cấp</p>
        </div>
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
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
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

      {/* Balance Status Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4">
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
                <TableHead className="text-right">Hoàn tiền</TableHead>
                <TableHead className="text-right">Số dư</TableHead>
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
    </div>
  );
}
