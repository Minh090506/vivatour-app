"use client";

/**
 * SlideInPanel Component
 *
 * Wrapper around shadcn Sheet for mobile detail views.
 * Slides in from right side with responsive widths.
 *
 * @example
 * <SlideInPanel
 *   isOpen={!!selectedId}
 *   onClose={() => setSelectedId(null)}
 *   title="Chi tiết"
 * >
 *   <DetailContent />
 * </SlideInPanel>
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface SlideInPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose: () => void;
  /** Panel header title */
  title?: string;
  /** Panel header description */
  description?: string;
  /** Panel content */
  children: React.ReactNode;
}

export function SlideInPanel({
  isOpen,
  onClose,
  title,
  description,
  children,
}: SlideInPanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[85vw] sm:w-[540px] md:w-[600px] p-0 flex flex-col"
      >
        {(title || description) && (
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
