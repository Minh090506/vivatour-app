'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RequestStatusBadge } from './request-status-badge';
import { formatDate } from '@/lib/utils';
import type { Request, RequestStatus } from '@/types';

interface RequestTableProps {
  requests: Request[];
  onRowClick?: (request: Request) => void;
  isLoading?: boolean;
}

export function RequestTable({ requests, onRowClick, isLoading = false }: RequestTableProps) {
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RQID</TableHead>
          <TableHead>Khách hàng</TableHead>
          <TableHead>Pax</TableHead>
          <TableHead>Quốc gia</TableHead>
          <TableHead>Nguồn</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Follow-up</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Ngày nhận</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              Không có yêu cầu nào
            </TableCell>
          </TableRow>
        ) : (
          requests.map((req) => (
            <TableRow
              key={req.id}
              onClick={() => onRowClick?.(req)}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
            >
              <TableCell className="font-mono">{req.rqid || req.code}</TableCell>
              <TableCell className="font-medium">{req.customerName}</TableCell>
              <TableCell>{req.pax}</TableCell>
              <TableCell>{req.country}</TableCell>
              <TableCell>{req.source}</TableCell>
              <TableCell>
                <RequestStatusBadge status={req.status as RequestStatus} />
              </TableCell>
              <TableCell>
                <FollowUpIndicator date={req.nextFollowUp} />
              </TableCell>
              <TableCell>{req.seller?.name || '-'}</TableCell>
              <TableCell>{formatDate(req.receivedDate)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// Helper component for follow-up indicator
function FollowUpIndicator({ date }: { date: Date | null }) {
  if (!date) return <span className="text-muted-foreground">-</span>;

  const now = new Date();
  const followUp = new Date(date);
  const diffDays = Math.ceil((followUp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let color = 'text-green-600';
  let label = formatDate(date);

  if (diffDays < 0) {
    color = 'text-red-600';
    label = `Quá hạn ${Math.abs(diffDays)} ngày`;
  } else if (diffDays === 0) {
    color = 'text-yellow-600';
    label = 'Hôm nay';
  } else if (diffDays <= 3) {
    color = 'text-orange-600';
  }

  return <span className={`${color} text-sm font-medium`}>{label}</span>;
}
