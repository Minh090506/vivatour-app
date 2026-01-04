import { Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  isLocked: boolean;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('vi-VN');
}

export function LockIndicator({ isLocked, lockedAt, lockedBy }: Props) {
  if (!isLocked) {
    return (
      <Badge variant="outline" className="text-gray-500">
        <Unlock className="h-3 w-3 mr-1" />
        Chưa khóa
      </Badge>
    );
  }

  const tooltipText = `Khóa lúc: ${formatDate(lockedAt ?? null)}\nBởi: ${lockedBy || 'N/A'}`;

  return (
    <Badge
      variant="secondary"
      className="text-amber-700 bg-amber-50 cursor-help"
      title={tooltipText}
    >
      <Lock className="h-3 w-3 mr-1" />
      Đã khóa
    </Badge>
  );
}
