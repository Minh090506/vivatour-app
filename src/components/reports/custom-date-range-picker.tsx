'use client';

import { useState, useCallback } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { MAX_CUSTOM_RANGE_DAYS } from '@/lib/validations/report-validation';

export interface CustomDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

interface Props {
  value?: CustomDateRange;
  onChange: (range: CustomDateRange) => void;
  disabled?: boolean;
}

export function CustomDateRangePicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DayPickerDateRange | undefined>(() => {
    if (value?.startDate && value?.endDate) {
      return {
        from: new Date(value.startDate),
        to: new Date(value.endDate),
      };
    }
    return undefined;
  });

  const handleSelect = useCallback((range: DayPickerDateRange | undefined) => {
    setDateRange(range);

    // Only emit when both dates are selected
    if (range?.from && range?.to) {
      const startDate = format(range.from, 'yyyy-MM-dd');
      const endDate = format(range.to, 'yyyy-MM-dd');
      onChange({ startDate, endDate });
      setOpen(false);
    }
  }, [onChange]);

  // Calculate max date based on start selection
  const maxDate = dateRange?.from
    ? new Date(dateRange.from.getTime() + MAX_CUSTOM_RANGE_DAYS * 24 * 60 * 60 * 1000)
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-64 justify-start text-left font-normal',
            !dateRange && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, 'dd/MM/yyyy', { locale: vi })} -{' '}
                {format(dateRange.to, 'dd/MM/yyyy', { locale: vi })}
              </>
            ) : (
              format(dateRange.from, 'dd/MM/yyyy', { locale: vi })
            )
          ) : (
            <span>Chon khoang thoi gian</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-sm text-muted-foreground">
            Toi da {MAX_CUSTOM_RANGE_DAYS} ngay
          </p>
        </div>
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => {
            // Disable future dates
            if (date > new Date()) return true;
            // Disable dates beyond max range from start
            if (maxDate && dateRange?.from && !dateRange?.to && date > maxDate) return true;
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
