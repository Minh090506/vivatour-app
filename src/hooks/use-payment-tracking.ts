'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { safeFetch } from '@/lib/api/fetch-utils';
import type { DateRangeOption, CustomDateRange } from './use-reports';

// Types matching API response
export interface BookingPayment {
  requestId: string;
  bookingCode: string | null;
  customerName: string;
  expectedRevenue: number;
  receivedAmount: number;
  remainingAmount: number;
  currency: string;
  paymentCount: number;
  lastPaymentDate: string | null;
  isOverdue: boolean;
  daysOverdue: number;
}

export interface CurrencyBreakdown {
  currency: string;
  label: string;
  symbol: string;
  expectedAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  bookingCount: number;
  percentage: number;
}

export interface TimelineDataPoint {
  date: string;
  amount: number;
  count: number;
  cumulativeAmount: number;
}

export interface OverdueAlert {
  requestId: string;
  bookingCode: string | null;
  customerName: string;
  expectedRevenue: number;
  receivedAmount: number;
  remainingAmount: number;
  daysOverdue: number;
  startDate: string | null;
}

export interface PaymentTrackingData {
  bookings: BookingPayment[];
  byCurrency: CurrencyBreakdown[];
  timeline: TimelineDataPoint[];
  overdueAlerts: OverdueAlert[];
  summary: {
    totalExpectedRevenue: number;
    totalReceivedAmount: number;
    totalRemainingAmount: number;
    collectionRate: number;
    bookingCount: number;
    overdueCount: number;
    paymentCount: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
    label: string;
  };
}

interface PaymentTrackingState {
  data: PaymentTrackingData | null;
  loading: boolean;
  error: string | null;
}

export function usePaymentTracking(
  dateRange: DateRangeOption,
  customDates?: CustomDateRange,
  overdueOnly: boolean = false
) {
  const [state, setState] = useState<PaymentTrackingState>({
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
    if (overdueOnly) {
      params += '&overdueOnly=true';
    }

    try {
      const res = await safeFetch<PaymentTrackingData>(
        `/api/revenues/reports/payments${params}`,
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
          error: 'Khong the tai du lieu bao cao thanh toan',
        }));
      }
    }
  }, [dateRange, customDates, overdueOnly]);

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
