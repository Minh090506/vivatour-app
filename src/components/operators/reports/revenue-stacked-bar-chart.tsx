'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { RevenueByMonth } from '@/types';

interface Props {
  data: RevenueByMonth[];
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

interface TooltipPayload {
  dataKey: string;
  value: number;
  color: string;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === 'paidAmount' && 'Đã thanh toán: '}
          {entry.dataKey === 'debt' && 'Còn nợ: '}
          {formatCurrency(entry.value)} ₫
        </p>
      ))}
    </div>
  );
}

export const RevenueStackedBarChart = memo(function RevenueStackedBarChart({ data, loading }: Props) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item) => ({
      ...item,
      displayPeriod: formatPeriod(item.month),
    }));
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Phân tích Thanh toán theo Tháng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Phân tích Thanh toán theo Tháng
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="displayPeriod"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                <Bar
                  dataKey="paidAmount"
                  name="Đã thanh toán"
                  stackId="a"
                  fill="#22c55e"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                />
                <Bar
                  dataKey="debt"
                  name="Còn nợ"
                  stackId="a"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
