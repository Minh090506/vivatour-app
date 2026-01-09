# Recharts Patterns Research
**Date:** 2026-01-09 | **Phase:** Phase 07 Dashboard UI

## Executive Summary
Currently only 1 Recharts component in codebase (`profit-chart.tsx`). Other dashboard components use tables or simple progress bars instead of charting libraries. No PieChart or LineChart patterns established yet.

## Current Chart Components

### 1. **ProfitChart** (`profit-chart.tsx`)
- **Type:** Horizontal BarChart
- **Imports:** `BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine`
- **Height:** `h-[400px]`
- **Layout:** Vertical layout (horizontal bars)
- **Margins:** `{ top: 10, right: 30, left: 60, bottom: 10 }`

#### Tooltip Pattern
```typescript
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProfitByBooking }> }) {
  if (!active || !payload || !payload.length) return null;
  // Renders custom div with formatCurrency for revenue/cost/profit
}
```
- Custom HTML tooltip (not recharts default)
- Styled: `bg-white p-3 border rounded-lg shadow-lg text-sm`
- Shows: booking code, customer name, revenue, cost, profit, margin

#### Styling Features
- **Cell Colors:** Dynamic by profit sign
  - Profit ≥ 0: `#22c55e` (green)
  - Profit < 0: `#ef4444` (red)
- **Bar Styling:** `radius={[0, 4, 4, 0]}` (right side rounded), `maxBarSize={30}`
- **Axis Styling:** `axisLine={false}`, `tickLine={false}`
- **Grid:** `strokeDasharray="3 3"` (dashed), `horizontal={true}`, `vertical={false}`
- **Reference:** `<ReferenceLine x={0} stroke="#666" strokeWidth={1} />` (zero line)
- **Legend:** Custom HTML div with color dots (not recharts Legend)

#### Formatting
```typescript
function formatYAxis(value: number): string {
  // Abbreviates: 1M, 100K, etc.
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}
```

#### Data Transformation
- Top 10 items by profit (ascending sort)
- Truncates booking codes > 10 chars to last 8 (for display)
- Maps to `displayCode` for Y-axis

### 2. **CostByServiceChart** (`cost-by-service-chart.tsx`)
- **Type:** No Recharts used - custom progress bars
- **Styling:** Simple `h-2 bg-gray-100` with `bg-blue-500` overlay
- **Calculation:** `(item.total / totalCost) * 100`
- **Pattern:** Reusable for simpler comparisons

### 3. **MonthlyTrend** (`monthly-trend.tsx`)
- **Type:** Table (not chart)
- **Pattern:** Used for time-series data visualization
- **Formatting:** YYYY-MM → "Tháng M/YYYY"

## Utility Patterns

### formatCurrency
- **File:** `@/lib/utils`
- **Usage:** All charts use this for currency display
- **Pattern:** Consistent across tooltips & tables
- **Example:** `formatCurrency(item.totalRevenue) ₫`

### Date Handling (`report-utils.ts`)
- `getDateRange()`: Date range calculation (thisMonth, last6Months, thisYear)
- `formatPeriodKey()`: YYYY-MM format for grouping
- `calcChangePercent()`: Percentage change calculation

## Responsive Container Pattern
```typescript
<div className="h-[400px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={chartData} ...>
      ...
    </BarChart>
  </ResponsiveContainer>
</div>
```
- Fixed height parent div with Tailwind
- `ResponsiveContainer` fills 100% of parent
- Wrapper preserves aspect ratio on resize

## Color Scheme (Established)
| Semantic | Color | Hex |
|----------|-------|-----|
| Positive/Profit | Green | `#22c55e` |
| Negative/Loss | Red | `#ef4444` |
| Secondary | Blue | `#3b82f6` |
| Grid | Gray | `#e5e7eb` |

## Missing Patterns
- **No PieChart/DonutChart** - opportunities for cost/revenue breakdown
- **No LineChart** - time-series trends not implemented in recharts
- **No ComposedChart** - no multi-metric overlay patterns
- **No Legend component** - all use custom HTML
- **No animation** - no motion/transition configs

## Recommendations for Dashboard UI

### LineChart Pattern (for revenue trends)
```typescript
<LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} />
  <XAxis dataKey="period" />
  <YAxis tickFormatter={formatYAxis} />
  <Tooltip content={<CustomTooltip />} />
  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
  <Line type="monotone" dataKey="cost" stroke="#ef4444" />
</LineChart>
```

### PieChart Pattern (for cost breakdown)
```typescript
<PieChart width={400} height={300}>
  <Pie data={costData} dataKey="amount" nameKey="label">
    {costData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
  </Pie>
  <Tooltip formatter={(value) => formatCurrency(value)} />
</PieChart>
```

## File Locations
- Chart components: `src/components/operators/reports/`
- Utilities: `src/lib/report-utils.ts`, `src/lib/utils.ts`
- Type defs: `src/types` (ProfitByBooking, CostByServiceType, etc.)

---
**Analysis tokens used:** ~5 calls | **Report lines:** 147
