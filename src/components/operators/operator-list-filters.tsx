'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { SERVICE_TYPES, SERVICE_TYPE_KEYS, PAYMENT_STATUSES, PAYMENT_STATUS_KEYS } from '@/config/operator-config';
import type { OperatorFilters } from '@/types';

interface OperatorListFiltersProps {
  filters: OperatorFilters;
  onFilterChange: (filters: OperatorFilters) => void;
}

export function OperatorListFilters({ filters, onFilterChange }: OperatorListFiltersProps) {
  const updateFilter = <K extends keyof OperatorFilters>(key: K, value: OperatorFilters[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      serviceType: '',
      paymentStatus: '',
      fromDate: '',
      toDate: '',
      isLocked: undefined,
    });
  };

  const hasFilters =
    filters.search ||
    filters.serviceType ||
    filters.paymentStatus ||
    filters.fromDate ||
    filters.toDate ||
    filters.isLocked !== undefined;

  return (
    <div className="space-y-4">
      {/* Row 1: Search + Service Type + Payment Status */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên dịch vụ, NCC, mã Booking..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filters.serviceType || 'all'}
          onValueChange={(v) => updateFilter('serviceType', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Loại dịch vụ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại DV</SelectItem>
            {SERVICE_TYPE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {SERVICE_TYPES[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.paymentStatus || 'all'}
          onValueChange={(v) => updateFilter('paymentStatus', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Trạng thái TT" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả TT</SelectItem>
            {PAYMENT_STATUS_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {PAYMENT_STATUSES[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Date Range + Lock Status + Clear */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Từ ngày:</span>
          <Input
            type="date"
            value={filters.fromDate || ''}
            onChange={(e) => updateFilter('fromDate', e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Đến ngày:</span>
          <Input
            type="date"
            value={filters.toDate || ''}
            onChange={(e) => updateFilter('toDate', e.target.value)}
            className="w-40"
          />
        </div>
        <Select
          value={filters.isLocked === undefined ? 'all' : filters.isLocked ? 'locked' : 'unlocked'}
          onValueChange={(v) => {
            if (v === 'all') updateFilter('isLocked', undefined);
            else if (v === 'locked') updateFilter('isLocked', true);
            else updateFilter('isLocked', false);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trạng thái khóa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="locked">Đã khóa</SelectItem>
            <SelectItem value="unlocked">Chưa khóa</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}
