'use client';

import { cn } from '@/lib/utils';
import { RequestStatusBadge } from './request-status-badge';
import { Bell } from 'lucide-react';
import type { Request, RequestStatus } from '@/types';

interface RequestListItemProps {
  request: Request;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Single request item in the left panel list.
 * Shows: ID (RQID or BookingCode), customer name, status badge, follow-up indicator
 */
export function RequestListItem({ request, isSelected, onClick }: RequestListItemProps) {
  // Show booking code if available, otherwise RQID or code
  const displayId = request.bookingCode || request.rqid || request.code;

  // Follow-up indicator: show bell if nextFollowUp is overdue
  const hasOverdueFollowUp = request.nextFollowUp && new Date(request.nextFollowUp) < new Date();

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted border-l-2 border-l-primary'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm truncate">{displayId}</span>
        <RequestStatusBadge status={request.status as RequestStatus} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-muted-foreground truncate">
          {request.customerName}
        </span>
        {hasOverdueFollowUp && (
          <Bell className="h-4 w-4 text-orange-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
