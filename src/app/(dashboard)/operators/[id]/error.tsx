"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /operators/[id] route.
 * Handles errors including "Operator not found" cases.
 */
export default function OperatorDetailError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[OperatorDetailError]", error);
  }, [error]);

  const handleBack = () => {
    router.push("/operators");
  };

  // Check if error is "not found" type
  const isNotFound =
    error.message?.toLowerCase().includes("not found") ||
    error.message?.toLowerCase().includes("không tìm thấy");

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title={isNotFound ? "Không tìm thấy dịch vụ" : "Lỗi tải dịch vụ"}
        message={
          isNotFound
            ? "Dịch vụ này không tồn tại hoặc đã bị xóa."
            : "Không thể tải chi tiết dịch vụ. Vui lòng thử lại."
        }
        onRetry={isNotFound ? undefined : reset}
        onBack={handleBack}
        backLabel="Về danh sách"
        retryLabel="Thử lại"
      />
    </div>
  );
}
