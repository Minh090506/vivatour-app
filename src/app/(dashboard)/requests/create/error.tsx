"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorFallback } from "@/components/ui/error-fallback";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for /requests/create route.
 * Catches errors in the create request page.
 */
export default function CreateRequestError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console (replace with Sentry later)
    console.error("[CreateRequestError]", error);
  }, [error]);

  const handleBack = () => {
    router.push("/requests");
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <ErrorFallback
        title="Lỗi tạo yêu cầu"
        message="Không thể tải trang tạo yêu cầu. Vui lòng thử lại hoặc quay lại danh sách."
        onRetry={reset}
        onBack={handleBack}
        backLabel="Quay lại danh sách"
        retryLabel="Thử lại"
      />
    </div>
  );
}
