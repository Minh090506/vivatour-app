'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg items-end">
      {/* Stage select */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground font-medium">Phễu</Label>
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
      </div>

      {/* Status select - grouped by stage */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground font-medium">Trạng thái</Label>
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
      </div>

      {/* Seller select (if permitted) */}
      {showSellerFilter && sellers && sellers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Seller</Label>
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
        </div>
      )}

      {/* Search input */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground font-medium">Tìm kiếm</Label>
        <Input
          placeholder="Tìm theo tên, mã..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-[200px]"
        />
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground font-medium">Khoảng thời gian</Label>
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
    </div>
  );
}
