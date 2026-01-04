'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequestForm } from '@/components/requests';
import type { RequestFormData } from '@/types';

export default function CreateRequestPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const res = await fetch('/api/config/user/me');
        const data = await res.json();
        if (data.success && data.data?.userId) {
          setCurrentUserId(data.data.userId);
        } else {
          setError('Không thể xác định người dùng hiện tại');
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
        setError('Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    }
    fetchCurrentUser();
  }, []);

  const handleSubmit = async (data: RequestFormData) => {
    if (!currentUserId) {
      throw new Error('Không thể xác định người dùng hiện tại');
    }

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        sellerId: currentUserId,
      }),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    router.push(`/requests/${result.data.id}`);
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
