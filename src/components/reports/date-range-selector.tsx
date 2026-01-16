'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CustomDateRangePicker, type CustomDateRange } from './custom-date-range-picker';
import type { DateRangeOption } from '@/hooks/use-reports';

const DATE_RANGES: Array<{ value: DateRangeOption; label: string }> = [
  { value: 'thisMonth', label: 'Thang nay' },
  { value: 'lastMonth', label: 'Thang truoc' },
  { value: 'last3Months', label: '3 thang gan day' },
  { value: 'last6Months', label: '6 thang gan day' },
  { value: 'thisYear', label: 'Nam nay' },
  { value: 'custom', label: 'Tuy chon...' },
];

interface Props {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
  customDates?: CustomDateRange;
  onCustomDatesChange?: (dates: CustomDateRange) => void;
}

export function DateRangeSelector({
  value,
  onChange,
  customDates,
  onCustomDatesChange,
}: Props) {
  const [showCustomPicker, setShowCustomPicker] = useState(value === 'custom');

  // Show custom picker when custom is selected
  useEffect(() => {
    setShowCustomPicker(value === 'custom');
  }, [value]);

  const handleRangeChange = useCallback((newValue: DateRangeOption) => {
    onChange(newValue);
    if (newValue === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  }, [onChange]);

  const handleCustomDatesChange = useCallback((dates: CustomDateRange) => {
    onCustomDatesChange?.(dates);
  }, [onCustomDatesChange]);

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Chon khoang thoi gian" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCustomPicker && (
        <CustomDateRangePicker
          value={customDates}
          onChange={handleCustomDatesChange}
        />
      )}
    </div>
  );
}
