'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  REQUEST_STAGES,
  REQUEST_STAGE_KEYS,
  getStatusesByStage,
  REQUEST_STATUSES,
} from '@/config/request-config';
import type { RequestFilters, User } from '@/types';

interface RequestFiltersProps {
  filters: RequestFilters;
  onChange: (filters: RequestFilters) => void;
  sellers?: User[];
  showSellerFilter?: boolean;
}

export function RequestFilters({
  filters,
  onChange,
  sellers,
  showSellerFilter = false,
}: RequestFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
      {/* Stage select */}
      <Select
        value={filters.stage || 'all'}
        onValueChange={(v) => onChange({ ...filters, stage: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Giai đoạn" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          {REQUEST_STAGE_KEYS.map((stage) => (
            <SelectItem key={stage} value={stage}>
              {REQUEST_STAGES[stage].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status select - grouped by stage */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(v) => onChange({ ...filters, status: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          {REQUEST_STAGE_KEYS.map((stage) => (
            <SelectGroup key={stage}>
              <SelectLabel>{REQUEST_STAGES[stage].label}</SelectLabel>
              {getStatusesByStage(stage).map((status) => (
                <SelectItem key={status} value={status}>
                  {REQUEST_STATUSES[status].label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Seller select (if permitted) */}
      {showSellerFilter && sellers && sellers.length > 0 && (
        <Select
          value={filters.seller || 'all'}
          onValueChange={(v) => onChange({ ...filters, seller: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Seller" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name || s.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Search input */}
      <Input
        placeholder="Tìm theo tên, mã..."
        value={filters.search || ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-[200px]"
      />

      {/* Date range */}
      <div className="flex gap-2 items-center">
        <Input
          type="date"
          value={filters.fromDate || ''}
          onChange={(e) => onChange({ ...filters, fromDate: e.target.value })}
          className="w-[140px]"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="date"
          value={filters.toDate || ''}
          onChange={(e) => onChange({ ...filters, toDate: e.target.value })}
          className="w-[140px]"
        />
      </div>
    </div>
  );
}
