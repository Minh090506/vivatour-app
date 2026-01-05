# Research Report: Master-Detail UI Patterns for React

## Summary
Master-detail layouts are foundational patterns for data-driven interfaces (Gmail, Linear, Notion). Modern implementations use resizable panels (react-resizable-panels), shadcn Sheet for slide-in overlays, and virtualization for performance. Key architectural decisions: use `key` prop on detail components for state reset on selection, URL sync for persistence, and virtualization only for 100+ items.

## Key Findings

### Layout Patterns & Architecture

**Master-Detail Pattern Core**: List + Detail UI where selecting an item in master updates detail view. Critical implementation: add `key` prop to detail component to force state reset on selection, preventing data bleed from previous selections.

**Width Split Approaches**:
- **Grid-based**: Tailwind `grid-cols-5 grid-cols-7` for 40-60 splits (simple, responsive)
- **Resizable panels**: react-resizable-panels library for draggable dividers (50% code, 50% CSS)
  - PanelGroup > Panel + PanelResizeHandle > Panel
  - Default layout persistence via localStorage
  - minSize/maxSize constraints with collapsible support
- **Fixed widths**: 300px master + flex-1 detail (predictable, mobile-friendly)

**Responsive Behavior**:
- Desktop: Side-by-side panels (40-60 split)
- Tablet: 30-70 or single column with toggle
- Mobile: Single column, detail as Sheet overlay (slide from right)
  - Use `hidden md:block` / `md:hidden` for panel toggling
  - Sheet component with `side="right"` for mobile detail view

### Slide-in Panel Component (Sheet)

**shadcn/ui Sheet Component** (built on Radix Dialog):
- Positioning: `side="top|right|bottom|left"` property
- Responsive sizing: `className="w-[400px] sm:w-[540px] md:w-[600px]"`
- Native feel over modals—keeps main content visible (preferred for mobile)
- Built-in focus management + ARIA semantics

**Animation & Interaction**:
- Slide-in animation from edge (CSS transform built-in via Radix)
- Escape key closes (automatic via Radix Dialog)
- Backdrop click closes (configurable)
- Overlay prevents main content interaction

**Accessibility**:
- Focus trap within sheet (Radix manages)
- ARIA roles (dialog, navigation) auto-applied
- Keyboard: Tab navigation, Escape to close
- Screen reader: announce sheet opening/closing

### Recommended Implementation Stack

**Component Structure**:
```
<MasterDetailLayout>
  <MasterPanel>
    <VirtualizedList /> or <Table />
  </MasterPanel>
  <DetailPanel>
    {desktop: <ResizablePanel /> | mobile: <Sheet />}
  </DetailPanel>
</MasterDetailLayout>
```

**Desktop (40-60 split with resizable)**:
- react-resizable-panels for draggable divider
- PanelGroup with defaultLayout percentage
- minSize constraints (e.g., 25%, 40% minimum)

**Mobile/Responsive**:
- Use shadcn Sheet for detail overlay
- Responsive utilities hide/show panels via breakpoints
- Responsive Dialog pattern: use Dialog on desktop, Drawer on mobile

**State Management**:
- Selected item: useState or URL param (URLSearchParams for router sync)
- Detail data: React Query/SWR for async loading
- Panel widths: localStorage via PanelGroup defaultLayout
- URL sync: `?selected=id` for bookmark-ability, refresh persistence

### Performance Optimization

**Virtualization**:
- Use react-window (smaller, faster) or react-virtualized (feature-rich)
- **Only if 100+ items**; overhead not worth it for small lists
- Libraries: FixedSizeList, VariableSizeList, FixedSizeGrid
- Overscan: Use overscanCount=3-5 to prevent blank spaces during scroll
- Placeholder content during scroll for complex rows

**Detail Panel Loading**:
- Lazy load detail data with Suspense + async component
- React Query with staleTime to cache selections
- Placeholder skeleton while fetching detail

**List Updates**:
- If detail expansion affects row heights (variable-size lists), call recomputeRowHeights()
- Use shallowCompare (PureComponent) to prevent unnecessary renders
- Force updates: Use forceUpdateGrid() only when row data changes but heights remain

### Pattern Comparison: Modern Apps

| App | Master | Detail | Responsive |
|-----|--------|--------|------------|
| Gmail | Virtualized list | Side panel (40-60) | Mobile: Sheet overlay |
| Linear | Issues list | Right sidebar (30-70) | Mobile: Drawer |
| Notion | Database rows | Right panel (collapsible) | Mobile: Sheet |
| Slack | DM list | Conversation (70-30) | Mobile: Full screen |

## Code Snippets

### Desktop Master-Detail with Resizable Panels
```jsx
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useSearchParams } from "react-router-dom";

export function MasterDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");

  return (
    <PanelGroup direction="horizontal" defaultLayout={[40, 60]}>
      <Panel minSize={25}>
        <MasterList
          selectedId={selectedId}
          onSelect={(id) => setSearchParams({ id })}
        />
      </Panel>
      <PanelResizeHandle />
      <Panel minSize={40}>
        {selectedId && <DetailPanel key={selectedId} id={selectedId} />}
      </Panel>
    </PanelGroup>
  );
}
```

### Mobile Sheet Detail Panel
```jsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function MobileDetail({ itemId, isOpen, onClose }) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <DetailPanel id={itemId} />
      </SheetContent>
    </Sheet>
  );
}
```

### Responsive Layout Container
```jsx
export function DetailContainer({ selectedId, onSelect }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: Resizable panels */}
      <div className="hidden md:block">
        <MasterDetail selectedId={selectedId} onSelect={onSelect} />
      </div>

      {/* Mobile: List + Sheet */}
      <div className="md:hidden">
        <MasterList selectedId={selectedId} onSelect={(id) => {
          onSelect(id);
          setMobileOpen(true);
        }} />
        <MobileDetail itemId={selectedId} isOpen={mobileOpen} onClose={setMobileOpen} />
      </div>
    </>
  );
}
```

### Virtualized List for 1000+ Items
```jsx
import { FixedSizeList } from "react-window";

export function VirtualMasterList({ items, selectedId, onSelect }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
      overscanCount={5}
    >
      {({ index, style }) => (
        <div style={style}>
          <ListItem
            item={items[index]}
            isSelected={items[index].id === selectedId}
            onClick={() => onSelect(items[index].id)}
          />
        </div>
      )}
    </FixedSizeList>
  );
}
```

## Architecture Decisions

**When to use Sheet overlay vs resizable panel**:
- **Sheet**: Mobile-first, small datasets, simplicity prioritized
- **Resizable**: Desktop power users, frequent context switching, large datasets

**State reset on selection**: Always add `key={selectedId}` to detail component to reset internal form state, preventing data leakage.

**URL persistence**: Store selectedId in URL params for bookmarking and refresh persistence—critical for SPA workflows.

**Virtualization threshold**: Start virtualization at 100+ items; smaller lists don't justify overhead.

## References

- [React Master/Detail Pattern](https://seanconnolly.dev/react-master-detail-pattern) - Best practices, key prop importance
- [shadcn/ui Sheet Component](https://ui.shadcn.com/docs/components/sheet) - Slide-in panels, responsive sizing
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) - Draggable dividers, layout persistence
- [Virtualization in React](https://web.dev/articles/virtualize-long-lists-react-window) - Performance optimization for large lists
- [React Design Patterns 2024](https://blog.bitsrc.io/react-design-patterns-for-2024-5f2696868222) - Compound components, custom hooks patterns
- [Tailwind Multi-Column Layouts](https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/multi-column) - Grid-based master-detail layouts
- [Resizable Split Panes from Scratch](https://blog.openreplay.com/resizable-split-panes-from-scratch/) - Alternative resizable implementation

## Unresolved Questions

1. **Persisted state across sessions**: Should panel widths be saved to localStorage or database? (Current: PanelGroup handles localStorage by default)
2. **Detail panel caching**: How long to cache detail data? (Suggestion: SWR with 5min staleTime)
3. **Mobile sheet height**: Fixed height vs dynamic based on content? (Suggestion: Max-height with scroll for flexibility)
4. **Animation performance**: Virtualization + animations on large lists—should overscan be adjusted? (Suggestion: Reduce overscan to 2 for animation-heavy lists)
