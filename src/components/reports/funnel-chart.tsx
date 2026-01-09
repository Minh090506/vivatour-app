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
  Cell,
  LabelList
} from 'recharts';
import { Filter } from 'lucide-react';
import type { FunnelResponse, FunnelStage } from '@/lib/report-utils';

interface Props {
  data: FunnelResponse | null;
  loading?: boolean;
}

// Stage labels in Vietnamese
const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Tiềm năng',
  QUOTE: 'Báo giá',
  FOLLOWUP: 'Theo dõi',
  OUTCOME: 'Kết quả',
};

// Gradient colors from blue to green for funnel stages
const STAGE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#22c55e'];

function CustomTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: FunnelStage }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
      <p className="font-medium">{STAGE_LABELS[item.stage] || item.stage}</p>
      <p className="text-muted-foreground">Số lượng: {item.count}</p>
      <p className="text-muted-foreground">Tỷ lệ: {item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export const FunnelChart = memo(function FunnelChart({ data, loading }: Props) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.stages.map((stage) => ({
      ...stage,
      label: STAGE_LABELS[stage.stage] || stage.stage,
    }));
  }, [data]);

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
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
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
                    formatter={(v) => typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v)}
                    style={{ fontSize: 11, fill: '#666' }}
                  />
                  {chartData.map((_, idx) => (
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
});
