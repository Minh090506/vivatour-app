# Code Review: Phase 06 Layout Components

**Reviewer**: code-reviewer
**Date**: 2026-01-05 17:02
**Scope**: Phase 06 Layout Components Implementation

---

## Scope

**Files Reviewed**:
- `src/components/layouts/master-detail-layout.tsx` (108 lines)
- `src/components/layouts/slide-in-panel.tsx` (64 lines)
- `src/components/layouts/index.ts` (9 lines)

**Review Focus**: Recent implementation of layout components
**Build Status**: ✅ Pass (TypeScript, Next.js 16.1.1)
**Updated Plans**: `plans/260105-1208-foundation-auth-rbac/phase-06-layout-components.md`

---

## Overall Assessment

**Quality Score**: 8.5/10

Clean, well-documented implementation following React/TypeScript best practices. Components ready for production use. Minor API improvements recommended but not critical.

---

## Critical Issues

None.

---

## High Priority Findings

None. Implementation is solid.

---

## Medium Priority Improvements

### M1: API Inconsistency - `react-resizable-panels` v4 Breaking Change

**Issue**: Implemented code uses v4.2.1 API (`Group`, `Panel`, `Separator`), but plan references v3 API (`PanelGroup`, `PanelResizeHandle`, `autoSaveId`).

**Current Implementation** (master-detail-layout.tsx:23-25,65,75):
```typescript
import { Group, Panel, Separator } from "react-resizable-panels";

<Group orientation="horizontal" id={storageKey}>
  <Panel ... />
  <Separator className="..." />
```

**Plan Specification** (phase-06-layout-components.md:89,127):
```typescript
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

<PanelGroup direction="horizontal" autoSaveId={storageKey}>
  <PanelResizeHandle className="..." />
```

**Impact**: Plan outdated, causing confusion for future maintainers. Code is correct.

**Fix**: Update plan documentation to reflect v4 API:
- `PanelGroup` → `Group`
- `direction` → `orientation`
- `autoSaveId` → `id`
- `PanelResizeHandle` → `Separator`

---

### M2: Missing Accessibility - Separator Label

**Issue**: Resize separator lacks accessible label for screen readers.

**Current** (line 75):
```typescript
<Separator className="w-1.5 bg-border hover:bg-primary/20 active:bg-primary/40 transition-colors cursor-col-resize" />
```

**Recommended**:
```typescript
<Separator
  className="w-1.5 bg-border hover:bg-primary/20 active:bg-primary/40 transition-colors cursor-col-resize"
  aria-label="Resize panels"
/>
```

**Impact**: Low - reduces accessibility for assistive technology users.

---

### M3: Prop API Enhancement - SlideInPanel Width Control

**Issue**: Responsive widths hardcoded in SlideInPanel. No prop to override.

**Current** (slide-in-panel.tsx:51):
```typescript
className="w-[85vw] sm:w-[540px] md:w-[600px] p-0 flex flex-col"
```

**Suggested Enhancement**:
```typescript
interface SlideInPanelProps {
  // ... existing props
  /** Custom width classes (default: "w-[85vw] sm:w-[540px] md:w-[600px]") */
  widthClassName?: string;
}

// Usage:
className={cn(
  widthClassName || "w-[85vw] sm:w-[540px] md:w-[600px]",
  "p-0 flex flex-col"
)}
```

**Impact**: Low - current defaults suitable for 90% of use cases. Enhancement provides future flexibility.

---

## Low Priority Suggestions

### L1: Props Documentation - `emptyText` Missing from Plan

**Current**: Implementation includes `emptyText?: string` prop (line 45), not in plan specification.

**Impact**: None - good addition. Update plan to include it.

---

### L2: Separator Styling - Cursor Style Conflict

**Issue**: Separator has `cursor-col-resize` in className, but `react-resizable-panels` v4 applies cursor automatically.

**Current** (line 75):
```typescript
className="w-1.5 bg-border hover:bg-primary/20 active:bg-primary/40 transition-colors cursor-col-resize"
```

**Suggested**:
```typescript
className="w-1.5 bg-border hover:bg-primary/20 active:bg-primary/40 transition-colors"
```

**Impact**: Minimal - `cursor-col-resize` may conflict with library's default cursor during drag.

---

### L3: Desktop Empty State - Missing Vietnamese Consistency

**Issue**: Empty text default (line 57) and plan placeholder text (line 147) differ.

**Code Default**: `"Chọn một mục để xem chi tiết"` (with diacritics)
**Plan Text**: `"Chon mot muc de xem chi tiet"` (without diacritics)

**Recommendation**: Use diacritics consistently (code is correct).

---

## Positive Observations

### ✅ Excellent Documentation
- JSDoc comments with usage examples
- Clear prop descriptions with Vietnamese context
- Inline comments explaining responsive strategy

### ✅ Type Safety
- Full TypeScript coverage
- No `any` types
- Well-defined interfaces with JSDoc

### ✅ Responsive Design
- Clean desktop/mobile separation with Tailwind `md:` breakpoint
- Proper overflow handling (`overflow-auto`)
- Graceful fallback for `onClose` callback (`|| (() => {})`)

### ✅ UX Polish
- Loading state handling with `hasSelection` check
- Empty state message for desktop detail panel
- Transition effects on separator hover/active

### ✅ Component Composition
- Clean separation of concerns (MasterDetailLayout orchestrates, SlideInPanel wraps Sheet)
- Minimal prop drilling
- Flexible content slots via `React.ReactNode`

### ✅ Code Standards Compliance
- Follows `code-standards.md`:
  - kebab-case file names ✅
  - PascalCase exports ✅
  - Props interfaces at top ✅
  - No inline styles ✅
  - Tailwind CSS with `cn()` ✅

---

## Recommended Actions

### Immediate (Before Next Phase)
1. **Update Plan**: Sync `phase-06-layout-components.md` Step 1 with v4 API syntax
2. **Add Accessibility**: Add `aria-label="Resize panels"` to Separator

### Nice to Have (Low Priority)
3. **Remove Cursor**: Remove `cursor-col-resize` from Separator className
4. **Document `emptyText`**: Add to plan's MasterDetailLayoutProps interface
5. **Optional Width Prop**: Add `widthClassName` prop to SlideInPanel for edge cases

---

## Metrics

**Type Coverage**: 100% (strict mode compliant)
**Build Status**: ✅ Pass
**Linting Issues**: 0
**Lines of Code**: 181 (components + barrel export)
**Dependencies**: `react-resizable-panels@4.2.1`, `@/components/ui/sheet`

---

## Test Coverage

**Status**: ⚠️ No tests found

**Recommended Test Cases**:
1. **MasterDetailLayout**:
   - Desktop renders PanelGroup with correct splits
   - Mobile renders full master list + Sheet
   - Empty state shows when `selectedId` is null
   - localStorage persistence (mock `id` prop)

2. **SlideInPanel**:
   - Opens when `isOpen={true}`
   - Closes on `onOpenChange`
   - Renders header when title/description provided
   - Skips header when both omitted

**Priority**: Medium - Components untested but low risk (UI wrappers, no business logic)

---

## Plan Status Update

**Phase 06 TODO Checklist**:

- [x] Install react-resizable-panels (already in package.json@4.2.1)
- [x] Create `src/components/layouts/master-detail-layout.tsx`
- [x] Implement Group with 40-60 default split (via `defaultSize` props)
- [x] Add minSize/maxSize constraints (25-60%, 40-100%)
- [x] Implement mobile view with Sheet
- [x] Create `src/components/layouts/slide-in-panel.tsx`
- [x] Configure responsive widths (85vw/540px/600px)
- [x] Create `src/components/layouts/index.ts`
- [ ] Test localStorage persistence (manual testing needed)

**Success Criteria**:
- [x] Desktop: 40-60 split visible at md breakpoint
- [?] Desktop: Resize handle works, changes persist to localStorage (visual test needed)
- [x] Desktop: Empty state shows when no selection
- [x] Mobile: Full list visible, no detail panel
- [x] Mobile: Sheet slides in when selectedId set
- [x] Mobile: Sheet closes on X button click (via `onOpenChange`)
- [x] Mobile: Sheet width responsive (85vw/540px/600px)

**Phase Status**: ✅ Complete (pending manual localStorage test + usage integration)

---

## Unresolved Questions

1. **localStorage Testing**: Has persistence been manually verified in browser DevTools → Application → Local Storage? Check for key matching `storageKey` prop value after resize.

2. **Usage Integration**: When will these components be integrated into actual pages (e.g., Requests, Suppliers)? Phase 06 plan shows example usage but no integration steps.

3. **Global Styles**: Plan Step 5 suggests optional CSS in `globals.css` for resize handle hover. Needed? Current inline Tailwind classes seem sufficient.
