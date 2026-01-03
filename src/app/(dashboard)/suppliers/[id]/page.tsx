'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, ArrowDownCircle, ArrowUpCircle, Wallet, History } from 'lucide-react';
import { TransactionForm } from '@/components/suppliers/transaction-form';
import { EditSupplierModal } from '@/components/suppliers/edit-supplier-modal';
import type { Supplier, SupplierTransaction, SupplierBalance } from '@/types';

interface SupplierDetailData extends Omit<Supplier, 'balance'>, SupplierBalance {
  transactions: SupplierTransaction[];
}

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [supplier, setSupplier] = useState<SupplierDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSupplier = useCallback(async () => {
    const res = await fetch(`/api/suppliers/${id}`);
    const data = await res.json();
    if (data.success) {
      setSupplier(data.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getPaymentModelLabel = (model: string) => {
    switch (model) {
      case 'PREPAID': return 'Trả trước (Deposit pool)';
      case 'PAY_PER_USE': return 'Thanh toán theo đơn';
      case 'CREDIT': return 'Công nợ';
      default: return model;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return { label: 'Nạp tiền', color: 'text-green-600' };
      case 'REFUND': return { label: 'Hoàn tiền', color: 'text-blue-600' };
      case 'ADJUSTMENT': return { label: 'Điều chỉnh', color: 'text-orange-600' };
      case 'FEE': return { label: 'Phí', color: 'text-red-600' };
      default: return { label: type, color: '' };
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải...</div>;
  }

  if (!supplier) {
    return <div className="text-center py-10">Không tìm thấy NCC</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {supplier.name}
          </h1>
          <p className="text-muted-foreground">Mã: {supplier.code}</p>
        </div>
        <div className="flex gap-2">
          <TransactionForm supplierId={id} onSuccess={fetchSupplier} />
          <EditSupplierModal supplier={supplier} onSuccess={fetchSupplier} />
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Tổng nạp</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(supplier.deposits)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Đã chi (Operator)</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {formatCurrency(supplier.costs)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Hoàn tiền</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {formatCurrency(supplier.refunds)}
            </p>
          </CardContent>
        </Card>

        <Card className={supplier.balance >= 0 ? 'bg-green-50' : 'bg-red-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wallet className={`h-5 w-5 ${supplier.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm text-muted-foreground">Số dư</span>
            </div>
            <p className={`text-2xl font-bold mt-2 ${supplier.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(supplier.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin NCC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Loại NCC</p>
              <p className="font-medium">{supplier.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hình thức thanh toán</p>
              <p className="font-medium">{getPaymentModelLabel(supplier.paymentModel)}</p>
            </div>
            {supplier.contactName && (
              <div>
                <p className="text-sm text-muted-foreground">Người liên hệ</p>
                <p className="font-medium">{supplier.contactName}</p>
              </div>
            )}
            {supplier.contactPhone && (
              <div>
                <p className="text-sm text-muted-foreground">Số điện thoại</p>
                <p className="font-medium">{supplier.contactPhone}</p>
              </div>
            )}
            {supplier.contactEmail && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{supplier.contactEmail}</p>
              </div>
            )}
            {supplier.bankAccount && (
              <div>
                <p className="text-sm text-muted-foreground">Tài khoản NH</p>
                <p className="font-medium">{supplier.bankAccount}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Trạng thái</p>
              <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
              </Badge>
            </div>
          </div>
          {supplier.notes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Ghi chú</p>
              <p className="mt-1">{supplier.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Giao dịch gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.transactions?.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Chưa có giao dịch</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplier.transactions?.map((tx) => {
                  const typeInfo = getTransactionTypeLabel(tx.type);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${typeInfo.color}`}>
                        {formatCurrency(Number(tx.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
