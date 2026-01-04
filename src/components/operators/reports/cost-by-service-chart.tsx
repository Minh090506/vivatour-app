'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { CostByServiceType } from '@/types';

interface Props {
  data: CostByServiceType[];
  totalCost: number;
}

export function CostByServiceChart({ data, totalCost }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi phí theo loại dịch vụ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Không có dữ liệu</p>
        ) : (
          data.map((item) => {
            const percentage = totalCost > 0 ? (item.total / totalCost) * 100 : 0;
            return (
              <div key={item.type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">
                    {formatCurrency(item.total)} ₫ ({item.count})
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
