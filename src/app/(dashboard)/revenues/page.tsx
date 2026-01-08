'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RevenueTable, RevenueForm, RevenueSummaryCard } from '@/components/revenues';
import { usePermission } from '@/hooks/use-permission';
import { DollarSign, Plus, Search, Filter } from 'lucide-react';
import {
  PAYMENT_TYPES,
  PAYMENT_SOURCES,
  type PaymentTypeKey,
  type PaymentSourceKey,
} from '@/config/revenue-config';

// Revenue type from API
interface Revenue {
  id: string;
  requestId: string;
  paymentDate: Date | string;
  paymentType: string;
  foreignAmount?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  amountVND: number;
  paymentSource: string;
  notes?: string | null;
  // 3-tier lock fields
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
  // Legacy field for backward compatibility
  isLocked?: boolean;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
  request?: {
    code: string;
    customerName: string;
    bookingCode?: string | null;
  };
}

interface Filters {
  search: string;
  fromDate: string;
  toDate: string;
  paymentType: string;
  paymentSource: string;
  lockStatus: string;
}

const initialFilters: Filters = {
  search: '',
  fromDate: '',
  toDate: '',
  paymentType: '',
  paymentSource: '',
  lockStatus: '',
};

// Lock status filter options
const LOCK_STATUS_OPTIONS = [
  { value: 'all', label: 'Tat ca' },
  { value: 'unlocked', label: 'Chua khoa' },
  { value: 'lockKT', label: 'Da khoa KT' },
  { value: 'lockAdmin', label: 'Da khoa Admin' },
  { value: 'lockFinal', label: 'Da khoa Cuoi' },
];

export default function RevenuesPage() {
  const { can, isAdmin } = usePermission();

  // Data state
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [searchInput, setSearchInput] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);

  // Fetch revenues with filters
  const fetchRevenues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);
      if (filters.paymentType) params.set('paymentType', filters.paymentType);
      if (filters.paymentSource) params.set('paymentSource', filters.paymentSource);
      if (filters.lockStatus) params.set('lockStatus', filters.lockStatus);
      params.set('limit', '100');

      const res = await fetch(`/api/revenues?${params}`);
      const data = await res.json();

      if (data.success) {
        setRevenues(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching revenues:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch on filter change
  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  // Handlers
  const handleAdd = useCallback(() => {
    setEditingRevenue(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((revenue: Revenue) => {
    setEditingRevenue(revenue);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditingRevenue(null);
  }, []);

  const handleSuccess = useCallback(() => {
    handleDialogClose();
    fetchRevenues();
  }, [handleDialogClose, fetchRevenues]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setSearchInput('');
  };

  const hasActiveFilters =
    filters.fromDate ||
    filters.toDate ||
    filters.paymentType ||
    filters.paymentSource ||
    filters.lockStatus;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Quản lý Doanh thu</h1>
            <p className="text-muted-foreground">
              {total} giao dịch
            </p>
          </div>
        </div>
        {can('revenue:manage') && (
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm thu nhập
          </Button>
        )}
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Bộ lọc
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {/* Search */}
            <div className="space-y-2 lg:col-span-2">
              <Label>Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Mã booking, khách hàng..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label>Loại thanh toán</Label>
              <Select
                value={filters.paymentType}
                onValueChange={(v) => handleFilterChange('paymentType', v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {(Object.keys(PAYMENT_TYPES) as PaymentTypeKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PAYMENT_TYPES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Source */}
            <div className="space-y-2">
              <Label>Nguon thanh toan</Label>
              <Select
                value={filters.paymentSource}
                onValueChange={(v) => handleFilterChange('paymentSource', v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tat ca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tat ca</SelectItem>
                  {(Object.keys(PAYMENT_SOURCES) as PaymentSourceKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PAYMENT_SOURCES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lock Status */}
            <div className="space-y-2">
              <Label>Trang thai khoa</Label>
              <Select
                value={filters.lockStatus}
                onValueChange={(v) => handleFilterChange('lockStatus', v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tat ca" />
                </SelectTrigger>
                <SelectContent>
                  {LOCK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      {revenues.length > 0 && <RevenueSummaryCard revenues={revenues} />}

      {/* Revenue Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải dữ liệu...
            </div>
          ) : (
            <RevenueTable
              revenues={revenues}
              showRequest={true}
              onEdit={(rev) => handleEdit(rev as Revenue)}
              onRefresh={fetchRevenues}
              canManage={can('revenue:manage')}
              canUnlock={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRevenue ? 'Chỉnh sửa thu nhập' : 'Thêm thu nhập mới'}
            </DialogTitle>
          </DialogHeader>
          <RevenueForm
            revenue={editingRevenue || undefined}
            onSuccess={handleSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
