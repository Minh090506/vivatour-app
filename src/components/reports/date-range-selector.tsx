'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { DateRangeOption } from '@/hooks/use-reports';

const DATE_RANGES: Array<{ value: DateRangeOption; label: string }> = [
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
  { value: 'last3Months', label: '3 tháng gần đây' },
  { value: 'last6Months', label: '6 tháng gần đây' },
  { value: 'thisYear', label: 'Năm nay' },
];

interface Props {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
}

export function DateRangeSelector({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Chọn khoảng thời gian" />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGES.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
