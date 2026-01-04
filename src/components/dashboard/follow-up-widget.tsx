'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Request } from '@/types';

interface FollowUpWidgetProps {
  limit?: number;
}

export function FollowUpWidget({ limit = 5 }: FollowUpWidgetProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<{
    overdue: Request[];
    today: Request[];
    upcoming: Request[];
  }>({ overdue: [], today: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowUps() {
      setLoading(true);
      try {
        const [overdueRes, todayRes, upcomingRes] = await Promise.all([
          fetch(`/api/requests?followup=overdue&limit=${limit}`),
          fetch(`/api/requests?followup=today&limit=${limit}`),
          fetch(`/api/requests?followup=upcoming&limit=${limit}`),
        ]);

        const [overdueData, todayData, upcomingData] = await Promise.all([
          overdueRes.json(),
          todayRes.json(),
          upcomingRes.json(),
        ]);

        setRequests({
          overdue: overdueData.success ? overdueData.data : [],
          today: todayData.success ? todayData.data : [],
          upcoming: upcomingData.success ? upcomingData.data : [],
        });
      } catch (err) {
        console.error('Error fetching follow-ups:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFollowUps();
  }, [limit]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Đang tải...
        </CardContent>
      </Card>
    );
  }

  const totalCount = requests.overdue.length + requests.today.length + requests.upcoming.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Follow-up
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/requests?tab=followup')}
        >
          Xem tất cả
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalCount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            Không có follow-up nào
          </div>
        ) : (
          <>
            {/* Overdue Section */}
            {requests.overdue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Quá hạn ({requests.overdue.length})</span>
                </div>
                {requests.overdue.map((req) => (
                  <FollowUpItem
                    key={req.id}
                    request={req}
                    variant="overdue"
                    onClick={() => router.push(`/requests/${req.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Today Section */}
            {requests.today.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-yellow-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Hôm nay ({requests.today.length})</span>
                </div>
                {requests.today.map((req) => (
                  <FollowUpItem
                    key={req.id}
                    request={req}
                    variant="today"
                    onClick={() => router.push(`/requests/${req.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Upcoming Section */}
            {requests.upcoming.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Sắp tới ({requests.upcoming.length})</span>
                </div>
                {requests.upcoming.map((req) => (
                  <FollowUpItem
                    key={req.id}
                    request={req}
                    variant="upcoming"
                    onClick={() => router.push(`/requests/${req.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FollowUpItem({
  request,
  variant,
  onClick,
}: {
  request: Request;
  variant: 'overdue' | 'today' | 'upcoming';
  onClick: () => void;
}) {
  const colors = {
    overdue: 'bg-red-50 hover:bg-red-100 border-red-200',
    today: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    upcoming: 'bg-green-50 hover:bg-green-100 border-green-200',
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${colors[variant]}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{request.customerName}</p>
          <p className="text-sm text-muted-foreground">
            {request.rqid} • {request.country}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {request.status}
        </Badge>
      </div>
      {request.nextFollowUp && (
        <p className="text-xs mt-1 text-muted-foreground">
          {formatDate(request.nextFollowUp)}
        </p>
      )}
    </div>
  );
}
