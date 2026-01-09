'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperatorApprovalTable } from '@/components/operators/operator-approval-table';
import { ApprovalSummaryCards } from '@/components/operators/approval-summary-cards';
import { ErrorFallback } from '@/components/ui/error-fallback';
import { safeFetch, safePost } from '@/lib/api/fetch-utils';
import { CheckCircle, RefreshCw } from 'lucide-react';
import type { ApprovalQueueItem } from '@/types';

interface Summary {
  total: number;
  totalAmount: number;
  overdue: number;
  overdueAmount: number;
  dueToday: number;
  dueThisWeek: number;
}

interface PendingPaymentsResponse {
  data: ApprovalQueueItem[];
  summary: Summary;
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
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await safeFetch<PendingPaymentsResponse>(
      `/api/operators/pending-payments?filter=${filter}`
    );

    if (fetchError) {
      setError(fetchError);
      toast.error(fetchError);
    } else if (data) {
      setItems(data.data);
      setSummary(data.summary);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (ids: string[], paymentDate: Date) => {
    const { data, error: approveError } = await safePost<{ count: number }>(
      '/api/operators/approve',
      {
        operatorIds: ids,
        paymentDate: paymentDate.toISOString(),
      }
    );

    if (approveError) {
      toast.error(approveError);
    } else if (data) {
      toast.success(`Đã duyệt ${data.count} dịch vụ`);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            Duyệt Thanh Toán
          </h1>
          <p className="text-muted-foreground">Duyệt chi phí dịch vụ chờ thanh toán</p>
        </div>
        {error && (
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        )}
      </div>

      <ApprovalSummaryCards summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách chờ duyệt</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorFallback
              title="Lỗi tải danh sách duyệt"
              message={error}
              onRetry={fetchData}
              retryLabel="Tải lại"
            />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
