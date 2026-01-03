'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { OperatorForm } from '@/components/operators/operator-form';

function CreateOperatorContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId') || undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/operators">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Thêm dịch vụ mới
          </h1>
          <p className="text-muted-foreground">
            Tạo chi phí dịch vụ cho Booking
          </p>
        </div>
      </div>

      {/* Form */}
      <OperatorForm requestId={requestId} />
    </div>
  );
}

export default function CreateOperatorPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Đang tải...</div>}>
      <CreateOperatorContent />
    </Suspense>
  );
}
