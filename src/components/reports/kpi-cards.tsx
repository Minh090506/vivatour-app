'use client';

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  FileText,
  Users,
  Target
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { DashboardResponse } from '@/lib/report-utils';

interface Props {
  data: DashboardResponse | null;
  loading?: boolean;
}

type KpiKey = 'totalBookings' | 'totalRevenue' | 'totalProfit' | 'activeRequests' | 'conversionRate';
type ComparisonKey = 'bookings' | 'revenue';

const KPI_CONFIG: Array<{
  key: KpiKey;
  compKey: ComparisonKey | null;
  label: string;
  icon: typeof FileText;
  format: 'number' | 'currency' | 'percent';
}> = [
  { key: 'totalBookings', compKey: 'bookings', label: 'Tổng Booking', icon: FileText, format: 'number' },
  { key: 'totalRevenue', compKey: 'revenue', label: 'Tổng Doanh thu', icon: DollarSign, format: 'currency' },
  { key: 'totalProfit', compKey: null, label: 'Tổng Lợi nhuận', icon: Wallet, format: 'currency' },
  { key: 'activeRequests', compKey: null, label: 'Yêu cầu đang xử lý', icon: Users, format: 'number' },
  { key: 'conversionRate', compKey: null, label: 'Tỷ lệ chuyển đổi', icon: Target, format: 'percent' },
];

function formatValue(value: number, format: 'number' | 'currency' | 'percent'): string {
  if (format === 'currency') return `${formatCurrency(value)} ₫`;
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return value.toLocaleString('vi-VN');
}

export const KPICards = memo(function KPICards({ data, loading }: Props) {
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
        const value = data.kpiCards[key];
        const change = compKey ? data.comparison[compKey]?.changePercent : null;
        const isPositive = change !== null && change >= 0;

        return (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <p className="text-2xl font-bold">{formatValue(value, format)}</p>
              {change !== null && (
                <Badge variant={isPositive ? 'default' : 'destructive'} className="mt-2">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});
