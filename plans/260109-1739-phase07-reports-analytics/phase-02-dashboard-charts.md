# Phase 2: Dashboard & Charts

**Parent Plan:** [plan.md](./plan.md)
**Dependencies:** [Phase 1: API Endpoints](./phase-01-api-endpoints.md)

---

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-09 |
| Priority | P2 |
| Effort | 3h |
| Status | pending |

Update dashboard page with real data fetching, create 5 KPI cards with MoM indicators, and implement 3 chart components: revenue trends line chart, cost breakdown pie chart, and conversion funnel visualization.

---

## Key Insights

1. **Existing dashboard** (`src/app/(dashboard)/page.tsx`):
   - Uses mock data in `mockStats` object
   - Has 4 KPI cards with `TrendingUp`/`TrendingDown` icons
   - Uses `formatCurrency` utility
   - Client component with `'use client'` directive

2. **Existing chart patterns** (`src/components/operators/reports/profit-chart.tsx`):
   - Uses `ResponsiveContainer` for responsive sizing
   - Custom tooltip component pattern
   - `formatYAxis` utility for abbreviated numbers (K, M)
   - Cell coloring for conditional styling

3. **Research recommendations**:
   - Use horizontal bar chart for funnel (recharts funnel is unstable)
   - Set explicit heights on chart containers (h-80 or h-96)
   - Use shadcn/ui Card for chart wrappers

---

## Requirements

### R1: Update Dashboard with Real Data
- Replace mock data with API calls to `/api/reports/dashboard-stats`
- Add 5th KPI card for Conversion Rate
- Show loading states during data fetch

### R2: KPI Cards with MoM Change
- Display value and MoM percentage change
- Green/red coloring based on change direction
- Profit card: invert cost change color (increase = bad)

### R3: Revenue Trends Line Chart
- Monthly revenue data from `/api/reports/revenue-trends`
- X-axis: months, Y-axis: revenue in VND
- Responsive with tooltip showing exact values

### R4: Cost Breakdown Pie Chart
- Use existing `/api/reports/operator-costs` endpoint
- Group by `serviceType`
- Show percentage labels

### R5: Conversion Funnel Chart
- Horizontal bar chart showing stage progression
- From `/api/reports/conversion-funnel`
- Color gradient by stage

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Client-side data fetching | recharts requires client-side rendering |
| Horizontal bar for funnel | recharts native funnel is unstable (GitHub #925) |
| Separate chart components | Reusable, testable, maintainable |
| Use shadcn/ui Card wrapper | Consistent styling with existing UI |

---

## Related Code Files

```
src/app/(dashboard)/page.tsx                          # Update
src/components/operators/reports/profit-chart.tsx     # Pattern reference
src/components/reports/kpi-card.tsx                   # New
src/components/reports/revenue-trend-chart.tsx        # New
src/components/reports/cost-breakdown-chart.tsx       # New
src/components/reports/conversion-funnel-chart.tsx    # New
src/lib/utils.ts                                      # formatCurrency
```

---

## Implementation Steps

### Step 2.1: Create KPI Card Component

**File:** `src/components/reports/kpi-card.tsx`

```typescript
'use client';

import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  change: number; // percentage
  isCurrency?: boolean;
  isPercentage?: boolean;
  invertChange?: boolean; // For cost: increase is bad
  icon: LucideIcon;
}

export function KPICard({
  title,
  value,
  change,
  isCurrency = false,
  isPercentage = false,
  invertChange = false,
  icon: Icon,
}: KPICardProps) {
  // Determine if change is positive (good)
  const isPositive = invertChange ? change < 0 : change > 0;
  const changeAbs = Math.abs(change);

  // Format display value
  const displayValue = isCurrency
    ? formatCurrency(value)
    : isPercentage
    ? `${value.toFixed(1)}%`
    : value.toLocaleString('vi-VN');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <div className="flex items-center gap-1 text-sm">
          {change !== 0 ? (
            <>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">--</span>
          )}
          <span className="text-muted-foreground">so voi thang truoc</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 2.2: Create Revenue Trend Chart

**File:** `src/components/reports/revenue-trend-chart.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyRevenue } from '@/types/reports';

interface Props {
  data: MonthlyRevenue[];
  isLoading?: boolean;
}

// Format Y axis to abbreviated values
function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(0)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

// Format month for X axis (YYYY-MM -> MM/YY)
function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  return `${m}/${year.slice(2)}`;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MonthlyRevenue }>;
}) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium text-muted-foreground">Thang {item.month}</p>
      <p className="text-blue-600 font-bold mt-1">
        {formatCurrency(item.revenue)} VND
      </p>
    </div>
  );
}

export function RevenueTrendChart({ data, isLoading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Xu huong doanh thu
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Dang tai...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Khong co du lieu</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 2.3: Create Cost Breakdown Pie Chart

**File:** `src/components/reports/cost-breakdown-chart.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CostItem {
  type: string;
  label: string;
  total: number;
  count: number;
}

interface Props {
  data: CostItem[];
  isLoading?: boolean;
}

// Color palette for service types
const COLORS = [
  '#3b82f6', // blue - Hotel
  '#22c55e', // green - Transport
  '#f59e0b', // amber - Tour
  '#8b5cf6', // violet - Guide
  '#ef4444', // red - Other
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

// Custom label for pie slices
function renderLabel({
  name,
  percent,
}: {
  name: string;
  percent: number;
}): string {
  return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '';
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; count: number } }>;
}) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium">{item.name}</p>
      <p className="text-blue-600 font-bold mt-1">
        {formatCurrency(item.value)} VND
      </p>
      <p className="text-muted-foreground">{item.count} dich vu</p>
    </div>
  );
}

export function CostBreakdownChart({ data, isLoading }: Props) {
  // Transform data for pie chart
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.total,
    count: item.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-orange-500" />
          Chi phi theo loai dich vu
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Dang tai...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Khong co du lieu</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: 20 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 2.4: Create Conversion Funnel Chart

**File:** `src/components/reports/conversion-funnel-chart.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Filter } from 'lucide-react';
import type { FunnelStage } from '@/types/reports';

interface Props {
  data: FunnelStage[];
  totalRequests: number;
  overallConversion: number;
  isLoading?: boolean;
}

// Gradient colors for funnel stages
const STAGE_COLORS: Record<string, string> = {
  LEAD: '#3b82f6',     // blue
  QUOTE: '#8b5cf6',    // violet
  FOLLOWUP: '#f59e0b', // amber
  OUTCOME: '#22c55e',  // green
};

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FunnelStage }>;
}) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium">{item.label}</p>
      <p className="text-blue-600 font-bold mt-1">
        {item.count.toLocaleString('vi-VN')} requests
      </p>
      <p className="text-muted-foreground">
        {item.percentage}% tong so
      </p>
      {item.conversionRate > 0 && (
        <p className="text-green-600">
          Chuyen doi: {item.conversionRate}%
        </p>
      )}
    </div>
  );
}

export function ConversionFunnelChart({
  data,
  totalRequests,
  overallConversion,
  isLoading,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-500" />
            Phan phoi conversion
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Tong: {totalRequests.toLocaleString('vi-VN')} |
            Ti le chuyen doi: <span className="font-medium text-green-600">{overallConversion}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Dang tai...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Khong co du lieu</p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={40}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.stage}
                      fill={STAGE_COLORS[entry.stage] || '#94a3b8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
          {data.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: STAGE_COLORS[stage.stage] || '#94a3b8' }}
              />
              <span className="text-muted-foreground">
                {stage.label}: {stage.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 2.5: Create Dashboard Data Hook

**File:** `src/hooks/use-dashboard-data.ts`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  DashboardStatsResponse,
  RevenueTrendsResponse,
  ConversionFunnelResponse,
} from '@/types/reports';

interface CostBreakdownResponse {
  byServiceType: Array<{
    type: string;
    label: string;
    total: number;
    count: number;
  }>;
}

interface DashboardData {
  stats: DashboardStatsResponse | null;
  trends: RevenueTrendsResponse | null;
  costBreakdown: CostBreakdownResponse | null;
  funnel: ConversionFunnelResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [trends, setTrends] = useState<RevenueTrendsResponse | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownResponse | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnelResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch all data
      const [statsRes, trendsRes, costsRes, funnelRes] = await Promise.all([
        fetch('/api/reports/dashboard-stats'),
        fetch('/api/reports/revenue-trends?months=12'),
        fetch('/api/reports/operator-costs'),
        fetch('/api/reports/conversion-funnel'),
      ]);

      // Parse responses
      const [statsData, trendsData, costsData, funnelData] = await Promise.all([
        statsRes.json(),
        trendsRes.json(),
        costsRes.json(),
        funnelRes.json(),
      ]);

      // Update state
      if (statsData.success) setStats(statsData.data);
      if (trendsData.success) setTrends(trendsData.data);
      if (costsData.success) setCostBreakdown(costsData.data);
      if (funnelData.success) setFunnel(funnelData.data);

      // Check for errors
      const errors = [
        !statsData.success && statsData.error,
        !trendsData.success && trendsData.error,
        !costsData.success && costsData.error,
        !funnelData.success && funnelData.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        setError(errors.join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loi tai du lieu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    trends,
    costBreakdown,
    funnel,
    isLoading,
    error,
    refetch: fetchData,
  };
}
```

### Step 2.6: Update Dashboard Page

**File:** `src/app/(dashboard)/page.tsx` (partial update - Stats Grid section)

Replace the Stats Grid section with:

```typescript
// Add imports at top
import { KPICard } from '@/components/reports/kpi-card';
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart';
import { CostBreakdownChart } from '@/components/reports/cost-breakdown-chart';
import { ConversionFunnelChart } from '@/components/reports/conversion-funnel-chart';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { DollarSign, Wallet, TrendingUp, Briefcase, Target } from 'lucide-react';

// Inside component, replace mockStats usage:
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { stats, trends, costBreakdown, funnel, isLoading, error } = useDashboardData();

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayDate = mounted ? formatCurrentDate() : '';

  return (
    <div className="space-y-6">
      {/* Greeting - keep existing */}

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid - 5 KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Doanh thu thang nay"
          value={stats?.revenue.value || 0}
          change={stats?.revenue.change || 0}
          isCurrency
          icon={DollarSign}
        />
        <KPICard
          title="Chi phi thang nay"
          value={stats?.cost.value || 0}
          change={stats?.cost.change || 0}
          isCurrency
          invertChange
          icon={Wallet}
        />
        <KPICard
          title="Loi nhuan thang nay"
          value={stats?.profit.value || 0}
          change={stats?.profit.change || 0}
          isCurrency
          icon={TrendingUp}
        />
        <KPICard
          title="Booking thang nay"
          value={stats?.bookings.value || 0}
          change={stats?.bookings.change || 0}
          icon={Briefcase}
        />
        <KPICard
          title="Ti le chuyen doi"
          value={stats?.conversionRate.value || 0}
          change={stats?.conversionRate.change || 0}
          isPercentage
          icon={Target}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueTrendChart
          data={trends?.trends || []}
          isLoading={isLoading}
        />
        <CostBreakdownChart
          data={costBreakdown?.byServiceType || []}
          isLoading={isLoading}
        />
      </div>

      {/* Conversion Funnel - Full Width */}
      <ConversionFunnelChart
        data={funnel?.funnel || []}
        totalRequests={funnel?.totalRequests || 0}
        overallConversion={funnel?.overallConversion || 0}
        isLoading={isLoading}
      />

      {/* Keep existing Follow-up Widget & Action Items & Recent Emails */}
      {/* ... rest of existing code ... */}
    </div>
  );
}
```

### Step 2.7: Create Component Index

**File:** `src/components/reports/index.ts`

```typescript
export { KPICard } from './kpi-card';
export { RevenueTrendChart } from './revenue-trend-chart';
export { CostBreakdownChart } from './cost-breakdown-chart';
export { ConversionFunnelChart } from './conversion-funnel-chart';
```

---

## Todo List

- [ ] Create `src/components/reports/kpi-card.tsx`
- [ ] Create `src/components/reports/revenue-trend-chart.tsx`
- [ ] Create `src/components/reports/cost-breakdown-chart.tsx`
- [ ] Create `src/components/reports/conversion-funnel-chart.tsx`
- [ ] Create `src/components/reports/index.ts`
- [ ] Create `src/hooks/use-dashboard-data.ts`
- [ ] Update `src/app/(dashboard)/page.tsx`
- [ ] Test responsive layout on mobile/tablet/desktop
- [ ] Verify chart tooltips display correctly

---

## Success Criteria

- [ ] Dashboard loads without errors
- [ ] All 5 KPI cards display with MoM indicators
- [ ] Revenue trend line chart renders 12 months data
- [ ] Cost breakdown pie chart shows service type distribution
- [ ] Conversion funnel shows all 4 stages
- [ ] Responsive: 1-col mobile, 2-col tablet, 5-col desktop for KPIs
- [ ] Loading states shown during data fetch

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| recharts SSR issues | High | Ensure 'use client' on all chart components |
| Empty data rendering | Medium | Handle null/empty arrays gracefully |
| Performance with large datasets | Low | Data is pre-aggregated by APIs |
| Chart overflow on mobile | Medium | Use ResponsiveContainer, test breakpoints |

---

## Security Considerations

- No sensitive data exposed in charts
- API endpoints handle auth/permissions
- No user input processed in chart components

---

## Next Steps

After completing Phase 2:
1. Proceed to [Phase 3: Excel Export](./phase-03-excel-export.md)
2. Add export button to dashboard
