"use client";

/**
 * MasterDetailLayout Component
 *
 * Responsive layout with:
 * - Desktop (md+): Resizable 40-60 split panels
 * - Mobile (<md): Full list with Sheet overlay for detail
 *
 * Panel sizes persist to localStorage via autoSaveId.
 *
 * @example
 * <MasterDetailLayout
 *   storageKey="requests-layout"
 *   selectedId={selectedId}
 *   onClose={() => setSelectedId(null)}
 *   detailTitle="Chi tiết"
 *   master={<RequestList onSelect={setSelectedId} />}
 *   detail={selectedId && <RequestDetail id={selectedId} />}
 * />
 */

import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { SlideInPanel } from "./slide-in-panel";

interface MasterDetailLayoutProps {
  /** Content for the master (list) panel */
  master: React.ReactNode;
  /** Content for the detail panel */
  detail: React.ReactNode;
  /** Currently selected item ID (controls mobile sheet) */
  selectedId?: string | null;
  /** Callback when mobile sheet closes */
  onClose?: () => void;
  /** LocalStorage key for persisting panel sizes */
  storageKey?: string;
  /** Title for mobile sheet header */
  detailTitle?: string;
  /** Description for mobile sheet header */
  detailDescription?: string;
  /** Custom class for container */
  className?: string;
  /** Placeholder text when no selection (Vietnamese) */
  emptyText?: string;
}

export function MasterDetailLayout({
  master,
  detail,
  selectedId,
  onClose,
  storageKey = "master-detail-layout",
  detailTitle,
  detailDescription,
  className,
  emptyText = "Chọn một mục để xem chi tiết",
}: MasterDetailLayoutProps) {
  const hasSelection = selectedId !== null && selectedId !== undefined;

  return (
    <div className={cn("h-full", className)}>
      {/* Desktop: Resizable panels */}
      <div className="hidden md:block h-full">
        <Group orientation="horizontal" id={storageKey}>
          <Panel
            id="master"
            defaultSize={40}
            minSize={25}
            maxSize={60}
            className="overflow-auto"
          >
            {master}
          </Panel>
          <Separator
            aria-label="Resize panels"
            className="w-1.5 bg-border hover:bg-primary/20 active:bg-primary/40 transition-colors"
          />
          <Panel
            id="detail"
            defaultSize={60}
            minSize={40}
            className="overflow-auto"
          >
            {hasSelection ? (
              detail
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {emptyText}
              </div>
            )}
          </Panel>
        </Group>
      </div>

      {/* Mobile: Full list + Sheet overlay */}
      <div className="md:hidden h-full">
        <div className="h-full overflow-auto">{master}</div>
        <SlideInPanel
          isOpen={hasSelection}
          onClose={onClose || (() => {})}
          title={detailTitle}
          description={detailDescription}
        >
          {detail}
        </SlideInPanel>
      </div>
    </div>
  );
}
