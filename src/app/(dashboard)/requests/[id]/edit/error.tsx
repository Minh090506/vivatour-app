"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /requests/[id]/edit route.
 * Handles errors when loading request for editing.
 */
export default function EditRequestError({ error, reset }: ErrorProps) {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Log error to console (replace with Sentry later)
    console.error("[EditRequestError]", error);
  }, [error]);

  const handleCancel = () => {
    // Try to go back to detail page, fallback to list
    if (params?.id) {
      router.push(`/requests/${params.id}`);
    } else {
      router.push("/requests");
    }
  };

  // Check if error is "not found" type
  const isNotFound =
    error.message?.toLowerCase().includes("not found") ||
    error.message?.toLowerCase().includes("không tìm thấy");

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title={isNotFound ? "Không tìm thấy yêu cầu" : "Lỗi tải form chỉnh sửa"}
        message={
          isNotFound
            ? "Yêu cầu này không tồn tại hoặc đã bị xóa."
            : "Không thể tải dữ liệu để chỉnh sửa. Vui lòng thử lại."
        }
        onRetry={isNotFound ? undefined : reset}
        onBack={handleCancel}
        backLabel="Hủy chỉnh sửa"
        retryLabel="Thử lại"
      />
    </div>
  );
}
