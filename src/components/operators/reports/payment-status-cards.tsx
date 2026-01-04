'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Clock, AlertTriangle, CalendarCheck, CheckCircle } from 'lucide-react';
import type { PaymentStatusReport } from '@/types';

interface Props {
  data: PaymentStatusReport;
}

export function PaymentStatusCards({ data }: Props) {
  const cards = [
    {
      title: 'Chờ thanh toán',
      count: data.pending.count,
      amount: data.pending.total,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Quá hạn',
      count: data.overdue.count,
      amount: data.overdue.total,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Đến hạn tuần này',
      count: data.dueThisWeek.count,
      amount: data.dueThisWeek.total,
      icon: CalendarCheck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Đã TT tháng này',
      count: data.paidThisMonth.count,
      amount: data.paidThisMonth.total,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.bg}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <div>
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold">{card.count}</p>
                <p className={`text-sm font-medium ${card.color}`}>
                  {formatCurrency(card.amount)} ₫
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
