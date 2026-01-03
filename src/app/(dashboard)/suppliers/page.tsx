'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Building2 } from 'lucide-react';
import { SUPPLIER_TYPES } from '@/types';

interface SupplierListItem {
  id: string;
  code: string;
  name: string;
  type: string;
  paymentModel: string;
  isActive: boolean;
  balance?: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, [search, typeFilter]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    params.set('includeBalance', 'true');

    const res = await fetch(`/api/suppliers?${params}`);
    const data = await res.json();
    if (data.success) {
      setSuppliers(data.data);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const getPaymentModelLabel = (model: string) => {
    switch (model) {
      case 'PREPAID': return 'Trả trước';
      case 'PAY_PER_USE': return 'Thanh toán theo đơn';
      case 'CREDIT': return 'Công nợ';
      default: return model;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Quản lý NCC
          </h1>
          <p className="text-muted-foreground">Danh sách nhà cung cấp</p>
        </div>
        <Button asChild>
          <Link href="/suppliers/create">
            <Plus className="mr-2 h-4 w-4" /> Thêm NCC
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã hoặc tên NCC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Loại NCC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả</SelectItem>
                {SUPPLIER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách NCC ({suppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
              Đang tải...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Chưa có nhà cung cấp nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NCC</TableHead>
                  <TableHead>Tên NCC</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Hình thức TT</TableHead>
                  <TableHead className="text-right">Số dư</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {supplier.code}
                      </Link>
                    </TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{supplier.type}</Badge>
                    </TableCell>
                    <TableCell>{getPaymentModelLabel(supplier.paymentModel)}</TableCell>
                    <TableCell className={`text-right font-medium ${
                      (supplier.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(supplier.balance ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                        {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
