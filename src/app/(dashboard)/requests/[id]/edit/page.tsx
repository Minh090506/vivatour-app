'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { RequestForm, RequestStatusBadge } from '@/components/requests';
import { safeFetch, safePut } from '@/lib/api/fetch-utils';
import type { Request, RequestFormData, RequestStatus } from '@/types';

/**
 * Edit page for request - full form editing mode.
 * Navigates back to /requests?id=[id] on cancel/save.
 */
export default function RequestEditPage() {
  const router = useRouter();
  const params = useParams();

  // ALL hooks MUST be declared before any conditional returns
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe params validation - handle undefined or array
  const rawId = params.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  // Redirect effect for invalid ID (replaces early return)
  useEffect(() => {
    if (!id) {
      router.replace('/requests');
    }
  }, [id, router]);

  const fetchRequest = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError, status } = await safeFetch<Request>(`/api/requests/${id}`);

    if (fetchError) {
      if (status === 404) {
        router.replace('/requests');
      } else {
        setError(fetchError);
      }
    } else if (data) {
      setRequest(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      void fetchRequest();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Early return for invalid ID (after all hooks)
  if (!id) {
    return null;
  }

  const handleUpdate = async (data: RequestFormData) => {
    const { error: updateError } = await safePut<Request>(`/api/requests/${id}`, data);

    if (updateError) {
      toast.error(`Có lỗi xảy ra: ${updateError}`);
      throw new Error(updateError);
    }

    toast.success('Đã cập nhật yêu cầu');
    // Navigate back to requests list with this request selected
    router.push(`/requests?id=${id}`);
  };

  const handleCancel = () => {
    router.push(`/requests?id=${id}`);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải...</div>;
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-3" />
        <p className="text-lg font-medium text-destructive mb-2">Lỗi tải dữ liệu</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <Button variant="outline" onClick={fetchRequest}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!request) {
    return <div className="p-8 text-center text-muted-foreground">Không tìm thấy yêu cầu</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Chỉnh sửa: {request.rqid || request.code}</h1>
            <RequestStatusBadge status={request.status as RequestStatus} showStage />
          </div>
          <p className="text-muted-foreground">{request.customerName}</p>
        </div>
      </div>

      {/* Edit Form */}
      <RequestForm
        initialData={request}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        isEditing
      />
    </div>
  );
}
