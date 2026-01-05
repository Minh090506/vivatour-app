# Phase 06: Layout Components

## Context
- **Parent Plan**: `plans/260105-1208-foundation-auth-rbac/plan.md`
- **Dependencies**: Phase 01 (react-resizable-panels installed)
- **Blocks**: None (can run in parallel)

## Overview
| Field | Value |
|-------|-------|
| Description | MasterDetailLayout with resizable panels, SlideInPanel wrapper |
| Priority | P1 |
| Status | complete |
| Effort | 45min |
| Review | plans/reports/code-reviewer-260105-1702-phase06-layout.md |

## Requirements

### R6.1: MasterDetailLayout
Create responsive layout component:
- Desktop (md+): PanelGroup with 40-60 split, resizable divider
- Mobile (<md): Full list only, detail via SlideInPanel
- Persist panel widths to localStorage

### R6.2: SlideInPanel
Wrapper around shadcn Sheet:
- Slides from right
- Responsive widths: w-[85vw] sm:w-[540px] md:w-[600px]
- Includes header, close button, content area

## Architecture

### Layout Pattern
```
Desktop (md+):
┌──────────────────────────────────────────┐
│ Header                                    │
├────────────────┬─────────────────────────┤
│   Master List  │      Detail Panel       │
│     (40%)      │        (60%)            │
│                ├─ resizable ─┤           │
│                │                         │
└────────────────┴─────────────────────────┘

Mobile (<md):
┌──────────────────────────────────────────┐
│ Header                                    │
├──────────────────────────────────────────┤
│                                          │
│            Master List (100%)            │
│                                          │
│                                          │
└──────────────────────────────────────────┘
+ Sheet slides in from right when item selected
```

### Component Props
```typescript
interface MasterDetailLayoutProps {
  master: React.ReactNode;
  detail: React.ReactNode;
  selectedId?: string | null;
  onClose?: () => void;
  storageKey?: string;
}

interface SlideInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}
```

## Related Code Files
- `src/components/layouts/MasterDetailLayout.tsx` (CREATE)
- `src/components/layouts/SlideInPanel.tsx` (CREATE)
- `src/components/layouts/index.ts` (CREATE)
- `src/components/ui/sheet.tsx` (EXISTS)

## Implementation Steps

### Step 1: Create MasterDetailLayout
Create `src/components/layouts/MasterDetailLayout.tsx`:

```typescript
"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { SlideInPanel } from "./SlideInPanel";

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
  /** Custom class for container */
  className?: string;
}

export function MasterDetailLayout({
  master,
  detail,
  selectedId,
  onClose,
  storageKey = "master-detail-layout",
  detailTitle,
  className,
}: MasterDetailLayoutProps) {
  const hasSelection = selectedId !== null && selectedId !== undefined;

  return (
    <div className={cn("h-full", className)}>
      {/* Desktop: Resizable panels */}
      <div className="hidden md:block h-full">
        <PanelGroup
          direction="horizontal"
          autoSaveId={storageKey}
        >
          <Panel
            defaultSize={40}
            minSize={25}
            maxSize={60}
            className="overflow-auto"
          >
            {master}
          </Panel>
          <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/20 transition-colors" />
          <Panel
            defaultSize={60}
            minSize={40}
            className="overflow-auto"
          >
            {hasSelection ? (
              detail
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Chon mot muc de xem chi tiet
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>

      {/* Mobile: Full list + Sheet overlay */}
      <div className="md:hidden h-full">
        <div className="h-full overflow-auto">{master}</div>
        <SlideInPanel
          isOpen={hasSelection}
          onClose={onClose || (() => {})}
          title={detailTitle}
        >
          {detail}
        </SlideInPanel>
      </div>
    </div>
  );
}
```

### Step 2: Create SlideInPanel
Create `src/components/layouts/SlideInPanel.tsx`:

```typescript
"use client";

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
```

### Step 3: Create Barrel Export
Create `src/components/layouts/index.ts`:

```typescript
export { MasterDetailLayout } from "./MasterDetailLayout";
export { SlideInPanel } from "./SlideInPanel";
```

### Step 4: Usage Example
Example usage in a page component:

```typescript
"use client";

import { useState } from "react";
import { MasterDetailLayout } from "@/components/layouts";

export function RequestsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <MasterDetailLayout
      storageKey="requests-layout"
      selectedId={selectedId}
      onClose={() => setSelectedId(null)}
      detailTitle="Chi tiet yeu cau"
      master={
        <RequestList
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      }
      detail={
        selectedId && (
          <RequestDetail
            key={selectedId}
            requestId={selectedId}
          />
        )
      }
    />
  );
}
```

### Step 5: Verify Panel Resize Handle Styling
Add custom styles if needed in globals.css:

```css
/* Optional: Custom resize handle on hover */
[data-panel-resize-handle-id] {
  transition: background-color 0.2s;
}

[data-panel-resize-handle-id]:hover {
  background-color: hsl(var(--primary) / 0.2);
}

[data-panel-resize-handle-id]:active {
  background-color: hsl(var(--primary) / 0.4);
}
```

## Todo List

- [x] Install react-resizable-panels (if not in Phase 01)
- [x] Create src/components/layouts/master-detail-layout.tsx
- [x] Implement Group with 40-60 default split (v4 API: Group not PanelGroup)
- [x] Add minSize/maxSize constraints
- [x] Implement mobile view with Sheet
- [x] Create src/components/layouts/slide-in-panel.tsx
- [x] Configure responsive widths
- [x] Create src/components/layouts/index.ts
- [ ] Test localStorage persistence (manual testing needed)

## Success Criteria

- [x] Desktop: 40-60 split visible at md breakpoint
- [?] Desktop: Resize handle works, changes persist to localStorage (visual test needed)
- [x] Desktop: Empty state shows when no selection
- [x] Mobile: Full list visible, no detail panel
- [x] Mobile: Sheet slides in when selectedId set
- [x] Mobile: Sheet closes on X button click (via onOpenChange)
- [x] Mobile: Sheet width responsive (85vw/540px/600px)

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Panel flicker on hydration | Low | Medium | Use autoSaveId for SSR safety |
| localStorage quota exceeded | Low | Low | Use simple key names |
| Sheet animation janky | Low | Low | Sheet has built-in transitions |
| Content overflow in panels | Medium | Medium | Add overflow-auto to panels |

## Rollback Plan

1. Delete `src/components/layouts/master-detail-layout.tsx`
2. Delete `src/components/layouts/slide-in-panel.tsx`
3. Delete `src/components/layouts/index.ts`
4. Pages using layout will error

## Implementation Notes

**API Changes (react-resizable-panels v4)**:
- Used `Group` (not `PanelGroup`)
- Used `orientation` (not `direction`)
- Used `id` (not `autoSaveId`)
- Used `Separator` (not `PanelResizeHandle`)

**Code Enhancements**:
- Added `emptyText` prop for customizable placeholder
- Added `detailDescription` prop for Sheet subtitle
- Implemented proper Vietnamese diacritics in default text

**Recommended Improvements** (from code review):
- Add `aria-label="Resize panels"` to Separator
- Remove `cursor-col-resize` from Separator className (library handles it)
- Consider adding `widthClassName` prop to SlideInPanel for custom widths
