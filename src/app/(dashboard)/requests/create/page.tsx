'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RequestForm } from '@/components/requests';
import { safeFetch, safePost } from '@/lib/api/fetch-utils';
import type { Request, RequestFormData } from '@/types';

interface UserConfig {
  userId: string;
  canViewAll?: boolean;
}

export default function CreateRequestPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCurrentUser() {
      const { data, error: fetchError } = await safeFetch<UserConfig>('/api/config/user/me');

      if (fetchError) {
        setError(fetchError);
      } else if (data?.userId) {
        setCurrentUserId(data.userId);
      } else {
        setError('Không thể xác định người dùng hiện tại');
      }

      setLoading(false);
    }
    fetchCurrentUser();
  }, []);

  const handleSubmit = async (data: RequestFormData) => {
    if (!currentUserId) {
      throw new Error('Không thể xác định người dùng hiện tại');
    }

    const { data: result, error: submitError } = await safePost<Request>('/api/requests', {
      ...data,
      sellerId: currentUserId,
    });

    if (submitError) {
      toast.error(`Có lỗi xảy ra: ${submitError}`);
      throw new Error(submitError);
    }

    if (result?.id) {
      toast.success('Đã tạo yêu cầu thành công');
      router.push(`/requests/${result.id}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:underline"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thêm yêu cầu mới</h1>
        <p className="text-muted-foreground">Nhập thông tin yêu cầu từ khách hàng</p>
      </div>

      <RequestForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </div>
  );
}
