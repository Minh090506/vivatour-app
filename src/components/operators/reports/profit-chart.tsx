'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ProfitByBooking } from '@/types';

interface Props {
  data: ProfitByBooking[];
}

// Custom tooltip component
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProfitByBooking }> }) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium mb-1">{item.bookingCode}</p>
      <p className="text-muted-foreground">{item.customerName}</p>
      <div className="mt-2 space-y-1">
        <p>
          <span className="text-muted-foreground">Doanh thu:</span>{' '}
          <span className="text-blue-600 font-medium">{formatCurrency(item.totalRevenue)} ₫</span>
        </p>
        <p>
          <span className="text-muted-foreground">Chi phí:</span>{' '}
          <span className="text-red-600 font-medium">{formatCurrency(item.totalCost)} ₫</span>
        </p>
        <p>
          <span className="text-muted-foreground">Lợi nhuận:</span>{' '}
          <span className={`font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(item.profit)} ₫
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Tỷ suất:</span>{' '}
          <span className={`font-medium ${item.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {item.profitMargin.toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
}

// Format Y axis values
function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(0)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

export function ProfitChart({ data }: Props) {
  // Get top 10 by profit (can be positive or negative)
  const top10 = [...data]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  // Truncate booking code for display
  const chartData = top10.map((item) => ({
    ...item,
    displayCode: item.bookingCode.length > 10
      ? item.bookingCode.slice(-8) // Show last 8 chars
      : item.bookingCode,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Top 10 Booking theo Lợi nhuận
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Không có dữ liệu để hiển thị
          </p>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  tickFormatter={formatYAxis}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="displayCode"
                  width={70}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="#666" strokeWidth={1} />
                <Bar
                  dataKey="profit"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={30}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-muted-foreground">Có lãi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-muted-foreground">Lỗ</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
