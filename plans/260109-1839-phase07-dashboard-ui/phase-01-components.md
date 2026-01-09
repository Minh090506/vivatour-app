# Phase 01: Components Implementation

## 1. Data Fetching Hook

### `src/hooks/use-reports.ts`

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { safeFetch } from '@/lib/api/fetch-utils';

export type DateRangeOption = 'thisMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'lastYear';

interface DashboardData {
  totalBookings: number;
  totalRevenue: number;
  totalProfit: number;
  activeRequests: number;
  conversionRate: number;
  comparison: {
    bookings: number;
    revenue: number;
    profit: number;
    requests: number;
    conversion: number;
  };
}

interface TrendItem {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface CostBreakdown {
  byServiceType: Array<{ type: string; label: string; amount: number; percentage: number }>;
  paymentStatus: { paid: number; pending: number; unpaid: number; total: number };
}

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
}

interface FunnelData {
  stages: FunnelStage[];
  conversionRate: number;
}

interface ReportsState {
  dashboard: DashboardData | null;
  trend: TrendItem[];
  costBreakdown: CostBreakdown | null;
  funnel: FunnelData | null;
  loading: boolean;
  error: string | null;
}

export function useReports(dateRange: DateRangeOption) {
  const [state, setState] = useState<ReportsState>({
    dashboard: null,
    trend: [],
    costBreakdown: null,
    funnel: null,
    loading: true,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async (signal: AbortSignal) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = `?range=${dateRange}`;

    // Parallel fetch all 4 endpoints
    const [dashRes, trendRes, costRes, funnelRes] = await Promise.all([
      safeFetch<DashboardData>(`/api/reports/dashboard${params}`, { signal }),
      safeFetch<TrendItem[]>(`/api/reports/revenue-trend${params}`, { signal }),
      safeFetch<CostBreakdown>(`/api/reports/cost-breakdown${params}`, { signal }),
      safeFetch<FunnelData>(`/api/reports/funnel${params}`, { signal }),
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
      trend: trendRes.data || [],
      costBreakdown: costRes.data,
      funnel: funnelRes.data,
      loading: false,
      error: null,
    });
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
```

---

## 2. Date Range Selector

### `src/components/reports/date-range-selector.tsx`

```typescript
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DateRangeOption } from '@/hooks/use-reports';

const DATE_RANGES: Array<{ value: DateRangeOption; label: string }> = [
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'last3Months', label: '3 tháng gần đây' },
  { value: 'last6Months', label: '6 tháng gần đây' },
  { value: 'thisYear', label: 'Năm nay' },
  { value: 'lastYear', label: 'Năm trước' },
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
```

---

## 3. KPI Cards

### `src/components/reports/kpi-cards.tsx`

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Wallet, FileText, Users, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface KPIData {
  totalBookings: number;
  totalRevenue: number;
  totalProfit: number;
  activeRequests: number;
  conversionRate: number;
  comparison: {
    bookings: number;
    revenue: number;
    profit: number;
    requests: number;
    conversion: number;
  };
}

interface Props {
  data: KPIData | null;
  loading?: boolean;
}

const KPI_CONFIG = [
  { key: 'totalBookings', compKey: 'bookings', label: 'Tổng Booking', icon: FileText, format: 'number' },
  { key: 'totalRevenue', compKey: 'revenue', label: 'Tổng Doanh thu', icon: DollarSign, format: 'currency' },
  { key: 'totalProfit', compKey: 'profit', label: 'Tổng Lợi nhuận', icon: Wallet, format: 'currency' },
  { key: 'activeRequests', compKey: 'requests', label: 'Yêu cầu đang xử lý', icon: Users, format: 'number' },
  { key: 'conversionRate', compKey: 'conversion', label: 'Tỷ lệ chuyển đổi', icon: Target, format: 'percent' },
] as const;

function formatValue(value: number, format: string): string {
  if (format === 'currency') return `${formatCurrency(value)} ₫`;
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return value.toLocaleString('vi-VN');
}

export function KPICards({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-5 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {KPI_CONFIG.map(({ key, compKey, label, icon: Icon, format }) => {
        const value = data[key as keyof KPIData] as number;
        const change = data.comparison[compKey as keyof typeof data.comparison];
        const isPositive = change >= 0;

        return (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <p className="text-2xl font-bold">{formatValue(value, format)}</p>
              <Badge variant={isPositive ? 'default' : 'destructive'} className="mt-2">
                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

---

## 4. Revenue Trend Chart

### `src/components/reports/revenue-trend-chart.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TrendItem {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface Props {
  data: TrendItem[];
  loading?: boolean;
}

// Format period YYYY-MM to "Th.M/YY"
function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  return `Th.${parseInt(month)}/${year.slice(2)}`;
}

// Format axis values
function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === 'revenue' && 'Doanh thu: '}
          {entry.dataKey === 'cost' && 'Chi phí: '}
          {entry.dataKey === 'profit' && 'Lợi nhuận: '}
          {formatCurrency(entry.value)} ₫
        </p>
      ))}
    </div>
  );
}

export function RevenueTrendChart({ data, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Xu hướng Doanh thu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    displayPeriod: formatPeriod(item.period),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Xu hướng Doanh thu
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="displayPeriod" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                <Bar dataKey="profit" name="Lợi nhuận" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cost" name="Chi phí" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 5. Cost Breakdown Chart

### `src/components/reports/cost-breakdown-chart.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ServiceType {
  type: string;
  label: string;
  amount: number;
  percentage: number;
}

interface PaymentStatus {
  paid: number;
  pending: number;
  unpaid: number;
  total: number;
}

interface Props {
  data: { byServiceType: ServiceType[]; paymentStatus: PaymentStatus } | null;
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: 'Đã thanh toán', color: '#22c55e' },
  pending: { label: 'Chờ thanh toán', color: '#f59e0b' },
  unpaid: { label: 'Chưa thanh toán', color: '#ef4444' },
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-2 border rounded shadow text-sm">
      <p>{payload[0].name}: {formatCurrency(payload[0].value)} ₫</p>
    </div>
  );
}

export function CostBreakdownChart({ data, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Phân tích Chi phí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const pieData = data.byServiceType.map((item) => ({
    name: item.label,
    value: item.amount,
  }));

  const paymentBars = Object.entries(PAYMENT_LABELS).map(([key, { label, color }]) => ({
    key,
    label,
    color,
    value: data.paymentStatus[key as keyof PaymentStatus] as number,
    percentage: data.paymentStatus.total > 0
      ? ((data.paymentStatus[key as keyof PaymentStatus] as number) / data.paymentStatus.total) * 100
      : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Phân tích Chi phí
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart - By Service Type */}
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">Theo loại dịch vụ</p>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horizontal Bars - Payment Status */}
          <div>
            <p className="text-sm font-medium mb-4 text-muted-foreground">Theo trạng thái thanh toán</p>
            <div className="space-y-4">
              {paymentBars.map(({ key, label, color, value, percentage }) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className="font-medium">{formatCurrency(value)} ₫</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6. Funnel Chart

### `src/components/reports/funnel-chart.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
}

interface Props {
  data: { stages: FunnelStage[]; conversionRate: number } | null;
  loading?: boolean;
}

// Gradient colors from blue to green for funnel stages
const STAGE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#22c55e', '#14b8a6'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: FunnelStage }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium">{item.label}</p>
      <p className="text-muted-foreground">Số lượng: {item.count}</p>
      <p className="text-muted-foreground">Tỷ lệ: {item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function FunnelChart({ data, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Phễu Chuyển đổi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Phễu Chuyển đổi
        </CardTitle>
        <span className="text-sm font-medium text-green-600">
          Tỷ lệ chuyển đổi: {data.conversionRate.toFixed(1)}%
        </span>
      </CardHeader>
      <CardContent>
        {data.stages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.stages}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={90}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    formatter={(v: number) => v.toLocaleString('vi-VN')}
                    style={{ fontSize: 11, fill: '#666' }}
                  />
                  {data.stages.map((_, idx) => (
                    <Cell key={idx} fill={STAGE_COLORS[idx % STAGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 7. Main Page

### `src/app/(dashboard)/reports/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { useReports, type DateRangeOption } from '@/hooks/use-reports';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { KPICards } from '@/components/reports/kpi-cards';
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart';
import { CostBreakdownChart } from '@/components/reports/cost-breakdown-chart';
import { FunnelChart } from '@/components/reports/funnel-chart';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const { isAdmin, isAccountant, isLoading: authLoading } = usePermission();
  const [dateRange, setDateRange] = useState<DateRangeOption>('last6Months');
  const { dashboard, trend, costBreakdown, funnel, loading, error, refetch } = useReports(dateRange);

  // Permission check
  if (authLoading) {
    return <div className="text-center py-10">Đang tải...</div>;
  }

  if (!isAdmin && !isAccountant) {
    return (
      <ErrorFallback
        title="Không có quyền truy cập"
        message="Bạn cần quyền Admin hoặc Kế toán để xem báo cáo."
      />
    );
  }

  if (error) {
    return (
      <ErrorFallback
        title="Lỗi tải báo cáo"
        message={error}
        onRetry={refetch}
        retryLabel="Tải lại"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Báo cáo Tổng quan
          </h1>
          <p className="text-muted-foreground">Phân tích hiệu suất kinh doanh</p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <KPICards data={dashboard} loading={loading} />

      {/* Revenue Trend */}
      <RevenueTrendChart data={trend} loading={loading} />

      {/* Cost Breakdown & Funnel */}
      <div className="grid md:grid-cols-2 gap-6">
        <CostBreakdownChart data={costBreakdown} loading={loading} />
        <FunnelChart data={funnel} loading={loading} />
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create `src/hooks/use-reports.ts`
- [ ] Create `src/components/reports/date-range-selector.tsx`
- [ ] Create `src/components/reports/kpi-cards.tsx`
- [ ] Create `src/components/reports/revenue-trend-chart.tsx`
- [ ] Create `src/components/reports/cost-breakdown-chart.tsx`
- [ ] Create `src/components/reports/funnel-chart.tsx`
- [ ] Create `src/app/(dashboard)/reports/page.tsx`
- [ ] Test with all date range options
- [ ] Verify permission gate (ADMIN/ACCOUNTANT only)
- [ ] Test loading skeletons + error handling
