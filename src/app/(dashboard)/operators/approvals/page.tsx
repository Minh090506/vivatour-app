'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperatorApprovalTable } from '@/components/operators/operator-approval-table';
import { ApprovalSummaryCards } from '@/components/operators/approval-summary-cards';
import { CheckCircle } from 'lucide-react';
import type { ApprovalQueueItem } from '@/types';

interface Summary {
  total: number;
  totalAmount: number;
  overdue: number;
  overdueAmount: number;
  dueToday: number;
  dueThisWeek: number;
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    totalAmount: 0,
    overdue: 0,
    overdueAmount: 0,
    dueToday: 0,
    dueThisWeek: 0,
  });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operators/pending-payments?filter=${filter}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setSummary(data.summary);
      } else {
        toast.error(data.error || 'Lỗi tải dữ liệu');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (ids: string[], paymentDate: Date) => {
    try {
      const res = await fetch('/api/operators/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorIds: ids,
          paymentDate: paymentDate.toISOString(),
          // Note: userId is extracted from session on server side
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã duyệt ${data.data.count} dịch vụ`);
        fetchData(); // Refresh
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi duyệt thanh toán');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle className="h-6 w-6" />
          Duyệt Thanh Toán
        </h1>
        <p className="text-muted-foreground">Duyệt chi phí dịch vụ chờ thanh toán</p>
      </div>

      <ApprovalSummaryCards summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách chờ duyệt</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="overdue">Quá hạn</TabsTrigger>
              <TabsTrigger value="today">Hôm nay</TabsTrigger>
              <TabsTrigger value="week">Tuần này</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              <OperatorApprovalTable
                items={items}
                onApprove={handleApprove}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
