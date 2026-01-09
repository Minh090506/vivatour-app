# Recharts v3.x Dashboard Implementation Patterns
**Research Report** | 2026-01-09 | Phase 07 Analytics

---

## Executive Summary

Recharts v3.x integrates seamlessly with Next.js/React for production dashboards. Key findings: (1) KPI cards require custom wrapper components as recharts doesn't provide built-in stats; (2) ResponsiveContainer + 'use client' directive mandatory for client-side rendering; (3) Pie charts suit cost breakdown with minimal legend management; (4) Funnel charts require external workarounds in recharts core; (5) Responsive design relies on CSS grid + aspect ratios.

---

## 1. KPI Cards with Percentage Change Indicators

### Pattern
Recharts doesn't provide built-in KPI components. Create wrapper components combining Recharts primitives with custom UI:

```tsx
'use client';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  change: number; // percentage
  unit?: string;
}

export function KPICard({ title, value, change, unit }: KPICardProps) {
  const isPositive = change >= 0;

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-2xl font-bold">{value}{unit}</div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
```

### Best Practices
- Pair with shadcn/ui Card component for consistency
- Use Tailwind variants for positive/negative indicators
- Position cards in CSS Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Include YoY comparisons in tooltips via data attribute

---

## 2. Line Charts for Revenue Trends (Monthly)

### Pattern
```tsx
'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyRevenue {
  month: string;
  revenue: number;
  projected?: number;
}

export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
          {/* Optional: Projected trend */}
          {data[0]?.projected && (
            <Line type="monotone" dataKey="projected" stroke="#82ca9d" strokeDasharray="5 5" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Critical Requirements
- **'use client' directive**: Recharts uses D3.js which requires browser DOM
- **ResponsiveContainer**: Sets width="100%" and aspect ratio preservation
- **Margin object**: Prevents label cutoff (top, right, bottom, left)
- **Minimum height**: Set min-h-[320px] on parent container
- **Data format**: Array of objects with consistent string keys

### Responsive Strategy
```tsx
<div className="h-80 w-full md:h-96 lg:h-[400px]">
  <ResponsiveContainer width="100%" height="100%">
    {/* Chart */}
  </ResponsiveContainer>
</div>
```

---

## 3. Pie Charts for Cost Breakdown

### Pattern
```tsx
'use client';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

export function CostBreakdown({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
        <Legend layout="vertical" align="right" verticalAlign="middle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### Responsive Handling
- **Legend conflict**: Use `layout="vertical"` on mobile to prevent label overlap
- **Mobile adjustment**: Reduce outerRadius from 80 to 60 on small screens
- **Label placement**: Use `labelLine={false}` + custom label function for clarity
- **Aspect ratio**: Lock to square (300x300) minimum for readability

### Dynamic Coloring
```tsx
const getCostColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    'Personnel': '#8884d8',
    'Operations': '#82ca9d',
    'Infrastructure': '#ffc658',
    'Marketing': '#ff7c7c',
  };
  return colorMap[category] || '#ccc';
};
```

---

## 4. Funnel Chart Implementation

### Challenge
Recharts core funnel chart support is unstable (open GitHub issue #925). Recommended workarounds:

#### Option A: Use Mantine Charts Wrapper (Recommended)
```tsx
'use client';
import { FunnelChart } from '@mantine/charts';

export function ConversionFunnel() {
  const data = [
    { name: 'Visitors', value: 10000 },
    { name: 'Leads', value: 3500 },
    { name: 'Qualified', value: 1200 },
    { name: 'Customers', value: 450 },
  ];

  return (
    <FunnelChart
      data={data}
      dataKey="value"
      nameKey="name"
      withLabels
      tooltipDataSource="segment"
    />
  );
}
```

#### Option B: Bar Chart Alternative
```tsx
'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export function ConversionFunnel() {
  const data = [
    { stage: 'Visitors', count: 10000 },
    { stage: 'Leads', count: 3500 },
    { stage: 'Qualified', count: 1200 },
    { stage: 'Customers', count: 450 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" />
        <YAxis type="category" dataKey="stage" />
        <Tooltip formatter={(v) => `${v.toLocaleString()} (${((v/10000)*100).toFixed(1)}%)`} />
        <Bar dataKey="count" fill="#8884d8" radius={[0, 8, 8, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={`hsl(${200 - idx * 30}, 70%, 60%)`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Event Handling
```tsx
const handleStageClick = (data: { name: string; value: number }) => {
  console.log(`Clicked: ${data.name} - ${data.value} users`);
  // Trigger drill-down or detail view
};

// Add to Bar/Pie components:
onClick={(data) => handleStageClick(data)}
```

---

## 5. Responsive Dashboard Patterns

### Grid Layout
```tsx
'use client';

export function AnalyticsDashboard({ data }: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {/* KPI Cards */}
      <KPICard title="Total Revenue" value="$45.2K" change={12.5} />
      <KPICard title="Orders" value="1,234" change={-2.1} />
      <KPICard title="Avg Order Value" value="$156" change={8.3} />
      <KPICard title="Conversion Rate" value="3.2%" change={0.4} />
    </div>

    {/* Charts Row */}
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mt-6">
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-4">Revenue Trends</h3>
        <RevenueChart data={data.monthly} />
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-4">Cost Breakdown</h3>
        <CostBreakdown data={data.costs} />
      </div>
    </div>

    {/* Full-width section */}
    <div className="border rounded-lg p-4 bg-white mt-6">
      <h3 className="font-semibold mb-4">Conversion Funnel</h3>
      <ConversionFunnel data={data.funnel} />
    </div>
  );
}
```

### Responsive Container Setup
```tsx
// Always wrap charts in this pattern:
<div className="w-full h-80 md:h-96">
  <ResponsiveContainer width="100%" height="100%">
    {/* Chart component */}
  </ResponsiveContainer>
</div>
```

### Mobile-First Data Simplification
```tsx
export function useChartData(isMobile: boolean) {
  // Mobile: Show last 6 months; Desktop: Show 12 months
  const monthsToShow = isMobile ? 6 : 12;
  return allData.slice(-monthsToShow);
}
```

---

## 6. Performance & SSR Considerations

### Client-Side Requirement
```tsx
'use client'; // REQUIRED at top of dashboard component

// ❌ Won't work in server components:
// export default function Dashboard() { ... }

// ✅ Correct:
'use client';
export default function Dashboard() { ... }
```

### Data Fetching Pattern
```tsx
'use client';
import { useEffect, useState } from 'react';

export function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;
  return <RevenueChart data={data} />;
}
```

### Or Use Server Components + Boundaries
```tsx
// app/analytics/page.tsx (Server Component)
import { DashboardClient } from './dashboard-client';
import { fetchAnalytics } from '@/lib/analytics';

export default async function AnalyticsPage() {
  const data = await fetchAnalytics();
  return <DashboardClient initialData={data} />;
}

// components/dashboard-client.tsx (Client Component)
'use client';
export function DashboardClient({ initialData }) {
  return <RevenueChart data={initialData} />;
}
```

---

## 7. Integration with Existing Stack

### With shadcn/ui Cards
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Revenue Trends</CardTitle>
  </CardHeader>
  <CardContent className="h-80">
    <RevenueChart data={monthlyData} />
  </CardContent>
</Card>
```

### With Tailwind Theming
```tsx
// Responsive line color based on theme
<Line
  type="monotone"
  dataKey="revenue"
  stroke="var(--color-primary, #8884d8)"
  strokeWidth={2}
/>

// In CSS:
:root {
  --color-primary: #8884d8;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #a8c5ff;
  }
}
```

---

## Key Recommendations

1. **Use shadcn/ui charts wrapper** if available (built on Recharts)
2. **Always include 'use client' directive** for chart components
3. **Avoid funnel charts in recharts core** - use Mantine wrapper or bar chart alternative
4. **Set explicit heights** on chart containers (min-h-80 or h-96)
5. **Use ResponsiveContainer** with width="100%" for automatic scaling
6. **Implement grid breakpoints**: 1-col mobile, 2-col tablet, 4-col desktop
7. **Format currency/percentage** in tooltips and labels
8. **Test SSR/CSR boundary** between server and client components
9. **Add margin objects** to prevent label cutoff
10. **Use aspect ratios** for consistent rendering

---

## Unresolved Questions

- Should we use Tremor UI (higher-level abstractions) vs raw Recharts for faster development?
- What's the preferred funnel implementation: Mantine wrapper or Bar chart workaround for consistency?
- Should pie chart legend be positioned dynamically based on available space (right/bottom)?
- Do we need real-time updates via WebSocket or is polling acceptable?

---

## Sources

- [Recharts Official Documentation](https://recharts.github.io/)
- [shadcn/ui Charts](https://ui.shadcn.com/docs/components/chart)
- [Ably Blog - Next.js and Recharts Dashboard](https://ably.com/blog/informational-dashboard-with-nextjs-and-recharts)
- [Mantine Charts - FunnelChart](https://mantine.dev/charts/funnel-chart/)
- [Refine - Recharts Guide](https://refine.dev/blog/recharts/)
- [PostHog - Analytics with Recharts](https://posthog.com/tutorials/recharts)
- [GeeksforGeeks - Line Chart with Recharts](https://www.geeksforgeeks.org/create-a-line-chart-using-recharts-in-reactjs/)
- [DEV Community - Dynamic Charts with Edge Cases](https://dev.to/calebali/how-to-build-dynamic-charts-in-react-with-recharts-including-edge-cases-3e72)
