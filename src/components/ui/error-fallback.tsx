"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
  retryLabel?: string;
  className?: string;
}

/**
 * Reusable error UI component for error boundaries and error states.
 * Follows VivaTour design standards with danger color scheme.
 */
export function ErrorFallback({
  title = "Đã xảy ra lỗi",
  message = "Không thể tải dữ liệu. Vui lòng thử lại sau.",
  onRetry,
  onBack,
  backLabel = "Quay lại",
  retryLabel = "Thử lại",
  className,
}: ErrorFallbackProps) {
  return (
    <Card
      className={cn(
        "mx-auto max-w-md border-danger-200 bg-danger-50/30",
        className
      )}
    >
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {/* Error Icon */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-100">
          <AlertTriangle className="h-8 w-8 text-danger-500" />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-lg font-semibold text-neutral-800">{title}</h2>

        {/* Message */}
        <p className="mb-6 text-sm text-neutral-600">{message}</p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          )}
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-gradient-to-r from-danger-500 to-danger-600 text-white hover:brightness-110"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
