"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /operators/create route.
 * Catches errors in the create operator page.
 */
export default function CreateOperatorError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[CreateOperatorError]", error);
  }, [error]);

  const handleBack = () => {
    router.push("/operators");
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title="Lỗi tạo dịch vụ"
        message="Không thể tải trang tạo dịch vụ. Vui lòng thử lại hoặc quay lại danh sách."
        onRetry={reset}
        onBack={handleBack}
        backLabel="Quay lại danh sách"
        retryLabel="Thử lại"
      />
    </div>
  );
}
