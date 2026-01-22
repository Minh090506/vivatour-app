'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CostBreakdownByServiceType } from '@/types';

interface Props {
  data: CostBreakdownByServiceType[];
  totalCost: number;
  loading?: boolean;
}

// Service type colors
const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#64748b', // slate
];

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    label: string;
    total: number;
    variance: number;
    variancePercent: number;
    count: number;
  };
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.[0]) return null;

  const { label, total, variance, variancePercent, count } = payload[0].payload;
  const isOverBudget = variance > 0;

  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm min-w-[180px]">
      <p className="font-medium mb-2">{label}</p>
      <p className="text-gray-600">
        Chi phí: <span className="font-medium">{formatCurrency(total)} ₫</span>
      </p>
      <p className="text-gray-600">
        Số dịch vụ: <span className="font-medium">{count}</span>
      </p>
      <p className={isOverBudget ? 'text-red-600' : 'text-green-600'}>
        Chênh lệch: {isOverBudget ? '+' : ''}{formatCurrency(variance)} ₫ ({variancePercent}%)
      </p>
    </div>
  );
}

// Custom label on pie
function renderCustomizedLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;

  if (percent < 0.05) return null; // Hide label for small slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export const CostBreakdownPieChart = memo(function CostBreakdownPieChart({
  data,
  totalCost,
  loading,
}: Props) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
      percent: totalCost > 0 ? item.total / totalCost : 0,
    }));
  }, [data, totalCost]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Phân bổ Chi phí theo Loại Dịch vụ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Phân bổ Chi phí theo Loại Dịch vụ
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={130}
                  innerRadius={60}
                  dataKey="total"
                  nameKey="label"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
