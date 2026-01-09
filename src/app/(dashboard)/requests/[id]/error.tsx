"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /requests/[id] route.
 * Handles errors including "Request not found" cases.
 */
export default function RequestDetailError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console (replace with Sentry later)
    console.error("[RequestDetailError]", error);
  }, [error]);

  const handleBack = () => {
    router.push("/requests");
  };

  // Check if error is "not found" type
  const isNotFound =
    error.message?.toLowerCase().includes("not found") ||
    error.message?.toLowerCase().includes("không tìm thấy");

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title={isNotFound ? "Không tìm thấy yêu cầu" : "Lỗi tải yêu cầu"}
        message={
          isNotFound
            ? "Yêu cầu này không tồn tại hoặc đã bị xóa."
            : "Không thể tải chi tiết yêu cầu. Vui lòng thử lại."
        }
        onRetry={isNotFound ? undefined : reset}
        onBack={handleBack}
        backLabel="Về danh sách"
        retryLabel="Thử lại"
      />
    </div>
  );
}
