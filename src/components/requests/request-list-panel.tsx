'use client';

import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { RequestListItem } from './request-list-item';
import type { Request } from '@/types';

interface RequestListPanelProps {
  requests: Request[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * Left panel containing search input and scrollable request list.
 * Fixed width of 350px (280px on medium screens).
 */
export function RequestListPanel({
  requests,
  selectedId,
  onSelect,
  isLoading,
  searchValue,
  onSearchChange,
}: RequestListPanelProps) {
  return (
    <div className="w-[350px] lg:w-[350px] md:w-[280px] border-r flex flex-col h-full bg-background">
      {/* Search input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Request list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Đang tải...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Không có yêu cầu nào
          </div>
        ) : (
          requests.map((req) => (
            <RequestListItem
              key={req.id}
              request={req}
              isSelected={req.id === selectedId}
              onClick={() => onSelect(req.id)}
            />
          ))
        )}
      </ScrollArea>

      {/* Count footer */}
      <div className="p-2 border-t text-xs text-muted-foreground text-center">
        {requests.length} yêu cầu
      </div>
    </div>
  );
}
