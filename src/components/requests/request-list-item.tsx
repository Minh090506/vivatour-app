'use client';

import { cn, formatDate } from '@/lib/utils';
import { RequestStatusBadge } from './request-status-badge';
import { Bell, User, Globe, Calendar } from 'lucide-react';
import type { Request, RequestStatus } from '@/types';

interface RequestListItemProps {
  request: Request;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Single request item in the left panel list.
 * Shows: ID, status, customer name, seller, country, received date, follow-up indicator
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
      {/* Row 1: ID + Status */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-medium truncate">{displayId}</span>
        <div className="flex items-center gap-2">
          {hasOverdueFollowUp && (
            <Bell className="h-4 w-4 text-orange-500 flex-shrink-0" />
          )}
          <RequestStatusBadge status={request.status as RequestStatus} />
        </div>
      </div>

      {/* Row 2: Customer name */}
      <div className="font-medium mt-1 truncate">{request.customerName}</div>

      {/* Row 3: Meta info - Seller, Country, Date */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1 truncate">
          <User className="h-3 w-3 flex-shrink-0" />
          {request.seller?.name || 'N/A'}
        </span>
        <span className="flex items-center gap-1">
          <Globe className="h-3 w-3 flex-shrink-0" />
          {request.country || 'N/A'}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          {request.receivedDate ? formatDate(request.receivedDate) : 'N/A'}
        </span>
      </div>
    </div>
  );
}
