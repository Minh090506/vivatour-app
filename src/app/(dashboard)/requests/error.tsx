"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /requests route.
 * Catches errors in the requests list page.
 */
export default function RequestsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console (replace with Sentry later)
    console.error("[RequestsError]", error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title="Lỗi tải danh sách yêu cầu"
        message="Không thể tải danh sách yêu cầu. Vui lòng thử lại sau."
        onRetry={reset}
        retryLabel="Tải lại"
      />
    </div>
  );
}
