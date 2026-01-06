'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { RequestForm, RequestStatusBadge } from '@/components/requests';
import type { Request, RequestFormData, RequestStatus } from '@/types';

/**
 * Edit page for request - full form editing mode.
 * Navigates back to /requests?id=[id] on cancel/save.
 */
export default function RequestEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequest() {
      setLoading(true);
      try {
        const res = await fetch(`/api/requests/${id}`);
        const data = await res.json();
        if (data.success) {
          setRequest(data.data);
        } else {
          router.replace('/requests');
        }
      } catch (err) {
        console.error('Error fetching request:', err);
        router.replace('/requests');
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [id, router]);

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

    // Navigate back to requests list with this request selected
    router.push(`/requests?id=${id}`);
  };

  const handleCancel = () => {
    router.push(`/requests?id=${id}`);
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
