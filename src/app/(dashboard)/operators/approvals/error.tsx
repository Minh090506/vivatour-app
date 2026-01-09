"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /operators/approvals route.
 * Catches errors in the payment approval queue page.
 */
export default function ApprovalsError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[ApprovalsError]", error);
  }, [error]);

  const handleBack = () => {
    router.push("/operators");
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title="Lỗi tải danh sách duyệt"
        message="Không thể tải danh sách chờ duyệt thanh toán. Vui lòng thử lại hoặc quay lại."
        onRetry={reset}
        onBack={handleBack}
        backLabel="Quay lại"
        retryLabel="Thử lại"
      />
    </div>
  );
}
