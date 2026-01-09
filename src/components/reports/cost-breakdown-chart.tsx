'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CostBreakdownResponse } from '@/lib/report-utils';

interface Props {
  data: CostBreakdownResponse | null;
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  HOTEL: 'Khách sạn',
  FLIGHT: 'Vé máy bay',
  TRANSPORT: 'Vận chuyển',
  TOUR: 'Tour',
  VISA: 'Visa',
  INSURANCE: 'Bảo hiểm',
  OTHER: 'Khác',
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: 'Đã thanh toán', color: '#22c55e' },
  partial: { label: 'Thanh toán một phần', color: '#f59e0b' },
  unpaid: { label: 'Chưa thanh toán', color: '#ef4444' },
};

interface TooltipPayload {
  name: string;
  value: number;
}

function CustomTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: TooltipPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white p-2 border rounded shadow text-sm">
      <p>{item.name}: {formatCurrency(item.value)} ₫</p>
    </div>
  );
}

export const CostBreakdownChart = memo(function CostBreakdownChart({ data, loading }: Props) {
  const { pieData, paymentBars } = useMemo(() => {
    if (!data) return { pieData: [], paymentBars: [] };

    const pie = data.byServiceType.map((item) => ({
      name: SERVICE_TYPE_LABELS[item.type] || item.type,
      value: item.amount,
    }));

    const totalPayment = data.paymentStatus.paid + data.paymentStatus.partial + data.paymentStatus.unpaid;

    const bars = Object.entries(PAYMENT_LABELS).map(([key, { label, color }]) => {
      const value = data.paymentStatus[key as keyof typeof data.paymentStatus];
      return {
        key,
        label,
        color,
        value,
        percentage: totalPayment > 0 ? (value / totalPayment) * 100 : 0,
      };
    });

    return { pieData: pie, paymentBars: bars };
  }, [data]);

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
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Theo loại dịch vụ
            </p>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
            ) : (
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
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
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
            )}
          </div>

          {/* Horizontal Bars - Payment Status */}
          <div>
            <p className="text-sm font-medium mb-4 text-muted-foreground">
              Theo trạng thái thanh toán
            </p>
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
});
