'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertCircle, CalendarCheck, CalendarDays } from 'lucide-react';

interface Summary {
  total?: number;
  totalAmount?: number;
  overdue?: number;
  overdueAmount?: number;
  dueToday?: number;
  dueThisWeek?: number;
}

interface Props {
  summary: Summary;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

export function ApprovalSummaryCards({ summary }: Props) {
  const cards = [
    {
      title: 'Tổng chờ duyệt',
      value: summary.total || 0,
      subValue: `${formatCurrency(summary.totalAmount || 0)} ₫`,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Quá hạn',
      value: summary.overdue || 0,
      subValue: `${formatCurrency(summary.overdueAmount || 0)} ₫`,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Đến hạn hôm nay',
      value: summary.dueToday || 0,
      icon: CalendarCheck,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Trong tuần này',
      value: summary.dueThisWeek || 0,
      icon: CalendarDays,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                {card.subValue && (
                  <p className={`text-sm font-medium ${card.color}`}>{card.subValue}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
