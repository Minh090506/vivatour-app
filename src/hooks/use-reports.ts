'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { safeFetch } from '@/lib/api/fetch-utils';
import type {
  DashboardResponse,
  RevenueTrendResponse,
  CostBreakdownResponse,
  FunnelResponse
} from '@/lib/report-utils';

export type DateRangeOption = 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear';

interface ReportsState {
  dashboard: DashboardResponse | null;
  trend: RevenueTrendResponse | null;
  costBreakdown: CostBreakdownResponse | null;
  funnel: FunnelResponse | null;
  loading: boolean;
  error: string | null;
}

export function useReports(dateRange: DateRangeOption) {
  const [state, setState] = useState<ReportsState>({
    dashboard: null,
    trend: null,
    costBreakdown: null,
    funnel: null,
    loading: true,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async (signal: AbortSignal) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = `?range=${dateRange}`;

    try {
      // Parallel fetch all 4 endpoints
      const [dashRes, trendRes, costRes, funnelRes] = await Promise.all([
        safeFetch<DashboardResponse>(`/api/reports/dashboard${params}`, { signal }),
        safeFetch<RevenueTrendResponse>(`/api/reports/revenue-trend${params}`, { signal }),
        safeFetch<CostBreakdownResponse>(`/api/reports/cost-breakdown${params}`, { signal }),
        safeFetch<FunnelResponse>(`/api/reports/funnel${params}`, { signal }),
      ]);

      if (signal.aborted) return;

      // Check for errors
      const firstError = [dashRes, trendRes, costRes, funnelRes].find((r) => r.error);
      if (firstError?.error) {
        setState((prev) => ({ ...prev, loading: false, error: firstError.error }));
        return;
      }

      setState({
        dashboard: dashRes.data,
        trend: trendRes.data,
        costBreakdown: costRes.data,
        funnel: funnelRes.data,
        loading: false,
        error: null,
      });
    } catch {
      if (!signal.aborted) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Không thể tải dữ liệu báo cáo',
        }));
      }
    }
  }, [dateRange]);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    fetchAll(abortRef.current.signal);

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchAll]);

  const refetch = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    fetchAll(abortRef.current.signal);
  }, [fetchAll]);

  return { ...state, refetch };
}
