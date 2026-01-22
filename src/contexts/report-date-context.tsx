'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DateRangeOption, CustomDateRange } from '@/hooks/use-reports';

interface ReportDateContextValue {
  dateRange: DateRangeOption;
  customDates: CustomDateRange | undefined;
  setDateRange: (range: DateRangeOption) => void;
  setCustomDates: (dates: CustomDateRange | undefined) => void;
  // Computed date params for API calls
  getDateParams: () => URLSearchParams;
}

const ReportDateContext = createContext<ReportDateContextValue | null>(null);

interface ReportDateProviderProps {
  children: ReactNode;
  defaultRange?: DateRangeOption;
}

/**
 * Provider for shared date range state across all report tabs.
 * Ensures consistent date filtering across Overview, Operator, Revenue, and Supplier reports.
 */
export function ReportDateProvider({
  children,
  defaultRange = 'last6Months'
}: ReportDateProviderProps) {
  const [dateRange, setDateRange] = useState<DateRangeOption>(defaultRange);
  const [customDates, setCustomDates] = useState<CustomDateRange | undefined>();

  const getDateParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('range', dateRange);

    if (dateRange === 'custom' && customDates?.startDate && customDates?.endDate) {
      params.set('startDate', customDates.startDate);
      params.set('endDate', customDates.endDate);
      // Also set fromDate/toDate for APIs that use this format
      params.set('fromDate', customDates.startDate);
      params.set('toDate', customDates.endDate);
    }

    return params;
  }, [dateRange, customDates]);

  return (
    <ReportDateContext.Provider
      value={{
        dateRange,
        customDates,
        setDateRange,
        setCustomDates,
        getDateParams,
      }}
    >
      {children}
    </ReportDateContext.Provider>
  );
}

/**
 * Hook to access shared date range state.
 * Must be used within a ReportDateProvider.
 */
export function useReportDate() {
  const context = useContext(ReportDateContext);
  if (!context) {
    throw new Error('useReportDate must be used within a ReportDateProvider');
  }
  return context;
}
