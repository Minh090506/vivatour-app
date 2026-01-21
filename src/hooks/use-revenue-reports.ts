'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { safeFetch } from '@/lib/api/fetch-utils';
import type { DateRangeOption, CustomDateRange } from './use-reports';

interface RevenueByType {
  type: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

interface RevenueBySource {
  source: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

interface CurrencyBreakdown {
  currency: string;
  foreignAmount: number;
  amountVND: number;
  count: number;
  percentage: number;
}

interface RevenueReportsData {
  byType: RevenueByType[];
  bySource: RevenueBySource[];
  byCurrency: CurrencyBreakdown[];
  summary: {
    totalRevenue: number;
    transactionCount: number;
    avgTransaction: number;
  };
  dateRange: {
    startDate: Date;
    endDate: Date;
    label: string;
  };
}

interface RevenueReportsState {
  data: RevenueReportsData | null;
  loading: boolean;
  error: string | null;
}

export function useRevenueReports(
  dateRange: DateRangeOption,
  customDates?: CustomDateRange
) {
  const [state, setState] = useState<RevenueReportsState>({
    data: null,
    loading: true,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (signal: AbortSignal) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Build query params
    let params = `?range=${dateRange}`;
    if (dateRange === 'custom' && customDates?.startDate && customDates?.endDate) {
      params += `&startDate=${customDates.startDate}&endDate=${customDates.endDate}`;
    }

    try {
      const res = await safeFetch<RevenueReportsData>(
        `/api/reports/revenue-breakdown${params}`,
        { signal }
      );

      if (signal.aborted) return;

      if (res.error) {
        setState((prev) => ({ ...prev, loading: false, error: res.error }));
        return;
      }

      setState({
        data: res.data,
        loading: false,
        error: null,
      });
    } catch {
      if (!signal.aborted) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Khong the tai du lieu bao cao doanh thu',
        }));
      }
    }
  }, [dateRange, customDates]);

  useEffect(() => {
    // Don't fetch if custom is selected but dates not provided yet
    if (dateRange === 'custom' && (!customDates?.startDate || !customDates?.endDate)) {
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    fetchData(abortRef.current.signal);

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const refetch = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    fetchData(abortRef.current.signal);
  }, [fetchData]);

  return { ...state, refetch };
}
