"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /operators/reports route.
 * Catches errors in the operator reports page.
 */
export default function OperatorReportsError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[OperatorReportsError]", error);
  }, [error]);

  const handleBack = () => {
    router.push("/operators");
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title="Lỗi tải báo cáo"
        message="Không thể tải trang báo cáo chi phí. Vui lòng thử lại hoặc quay lại danh sách."
        onRetry={reset}
        onBack={handleBack}
        backLabel="Quay lại danh sách"
        retryLabel="Thử lại"
      />
    </div>
  );
}
