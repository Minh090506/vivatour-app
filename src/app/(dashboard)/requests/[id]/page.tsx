'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, ExternalLink } from 'lucide-react';
import { RequestForm, RequestStatusBadge } from '@/components/requests';
import type { Request, RequestFormData, RequestStatus } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

interface RequestWithCounts extends Request {
  _count?: {
    operators?: number;
    revenues?: number;
  };
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<RequestWithCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchRequest() {
      setLoading(true);
      try {
        const res = await fetch(`/api/requests/${id}`);
        const data = await res.json();
        if (data.success) {
          setRequest(data.data);
        }
      } catch (err) {
        console.error('Error fetching request:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [id]);

  const handleUpdate = async (data: RequestFormData) => {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    setRequest(result.data);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!request) {
    return <div className="p-8 text-center">Không tìm thấy yêu cầu</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{request.rqid}</h1>
              <RequestStatusBadge status={request.status as RequestStatus} showStage />
            </div>
            <p className="text-muted-foreground">{request.customerName}</p>
          </div>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Booking Code Banner (if BOOKING) */}
      {request.bookingCode && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Mã Booking</p>
                <p className="text-2xl font-mono font-bold text-green-700">
                  {request.bookingCode}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push(`/operators?requestId=${request.id}`)}
              >
                Xem Operators
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isEditing ? (
        <RequestForm
          initialData={request}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
          isEditing
        />
      ) : (
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="operators">Dịch vụ ({request._count?.operators || 0})</TabsTrigger>
            <TabsTrigger value="revenues">Doanh thu ({request._count?.revenues || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            {/* Customer Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="Tên" value={request.customerName} />
                <InfoRow label="Liên hệ" value={request.contact} />
                <InfoRow label="WhatsApp" value={request.whatsapp || '-'} />
                <InfoRow label="Pax" value={request.pax.toString()} />
                <InfoRow label="Quốc gia" value={request.country} />
                <InfoRow label="Nguồn" value={request.source} />
              </CardContent>
            </Card>

            {/* Tour Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin Tour</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="Số ngày" value={request.tourDays?.toString() || '-'} />
                <InfoRow label="Ngày bắt đầu" value={request.startDate ? formatDate(request.startDate) : '-'} />
                <InfoRow label="Ngày kết thúc" value={request.endDate ? formatDate(request.endDate) : '-'} />
                <InfoRow label="Doanh thu DK" value={request.expectedRevenue ? formatCurrency(request.expectedRevenue) : '-'} />
                <InfoRow label="Chi phí DK" value={request.expectedCost ? formatCurrency(request.expectedCost) : '-'} />
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle>Thời gian</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="Ngày nhận" value={formatDate(request.receivedDate)} />
                <InfoRow label="Liên hệ gần nhất" value={request.lastContactDate ? formatDate(request.lastContactDate) : '-'} />
                <InfoRow label="Follow-up tiếp" value={request.nextFollowUp ? formatDate(request.nextFollowUp) : '-'} />
                <InfoRow label="Seller" value={request.seller?.name || '-'} />
              </CardContent>
            </Card>

            {/* Notes Card */}
            {request.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Ghi chú</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{request.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="operators">
            {/* Linked operators list - Phase 5 */}
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {request.bookingCode
                  ? 'Xem danh sách dịch vụ trong tab Operators'
                  : 'Chuyển sang trạng thái Booking để tạo dịch vụ'}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenues">
            {/* Linked revenues list - future */}
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chức năng Revenue sẽ được phát triển sau
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Helper component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
