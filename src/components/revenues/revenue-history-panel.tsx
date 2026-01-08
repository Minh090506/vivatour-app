'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Lock,
  Unlock,
  Plus,
  Edit,
  Trash,
  Info,
  History,
} from 'lucide-react';
import { HISTORY_ACTION_LABELS } from '@/config/lock-config';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  revenueId: string;
  action: string;
  changes: Record<string, unknown>;
  userId: string;
  userName?: string;
  createdAt: string;
}

interface RevenueHistoryPanelProps {
  revenueId: string;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  CREATE: {
    color: 'bg-blue-100 text-blue-800',
    icon: <Plus className="h-3 w-3" />,
  },
  UPDATE: {
    color: 'bg-gray-100 text-gray-800',
    icon: <Edit className="h-3 w-3" />,
  },
  DELETE: {
    color: 'bg-red-100 text-red-800',
    icon: <Trash className="h-3 w-3" />,
  },
  LOCK_KT: {
    color: 'bg-amber-100 text-amber-800',
    icon: <Lock className="h-3 w-3" />,
  },
  UNLOCK_KT: {
    color: 'bg-amber-50 text-amber-700',
    icon: <Unlock className="h-3 w-3" />,
  },
  LOCK_ADMIN: {
    color: 'bg-orange-100 text-orange-800',
    icon: <Lock className="h-3 w-3" />,
  },
  UNLOCK_ADMIN: {
    color: 'bg-orange-50 text-orange-700',
    icon: <Unlock className="h-3 w-3" />,
  },
  LOCK_FINAL: {
    color: 'bg-red-100 text-red-800',
    icon: <Lock className="h-3 w-3" />,
  },
  UNLOCK_FINAL: {
    color: 'bg-red-50 text-red-700',
    icon: <Unlock className="h-3 w-3" />,
  },
};

function formatDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: vi,
    });
  } catch {
    return dateStr;
  }
}

export function RevenueHistoryPanel({ revenueId }: RevenueHistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/revenues/${revenueId}/history`);
        if (!res.ok) {
          throw new Error('Failed to fetch history');
        }
        const data = await res.json();
        setHistory(data.data || data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải lịch sử');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [revenueId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Chưa có lịch sử
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="p-4 space-y-3">
        {history.map((entry) => {
          const config = ACTION_CONFIG[entry.action] || {
            color: 'bg-gray-100 text-gray-800',
            icon: <Info className="h-3 w-3" />,
          };
          const label =
            HISTORY_ACTION_LABELS[entry.action] || entry.action;

          return (
            <div key={entry.id} className="flex items-start gap-3">
              <div className={`rounded-full p-1.5 ${config.color}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.userName || entry.userId} • {formatDate(entry.createdAt)}
                </p>
                {typeof entry.changes?.tier === 'string' && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {entry.changes.tier}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
