"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /operators route.
 * Catches errors in the operators list page.
 */
export default function OperatorsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[OperatorsError]", error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title="Lỗi tải danh sách điều hành"
        message="Không thể tải danh sách dịch vụ điều hành. Vui lòng thử lại sau."
        onRetry={reset}
        retryLabel="Tải lại"
      />
    </div>
  );
}
