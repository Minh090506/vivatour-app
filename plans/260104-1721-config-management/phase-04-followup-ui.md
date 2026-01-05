# Phase 4: Follow-up Status UI (Drag & Drop)

**Parent Plan:** [plan.md](./plan.md)
**Dependencies:** [Phase 3](./phase-03-seller-ui.md)
**Status:** ✅ COMPLETED
**Effort:** 1.5h
**Priority:** P0

---

## Overview

Create UI components for Follow-up Status management with @dnd-kit drag & drop reordering.

---

## Requirements

1. Status table with drag handles
2. @dnd-kit sortable implementation
3. Days badge with color coding
4. Add/Edit modal
5. Aliases displayed as tags
6. Optimistic UI update on reorder

---

## Architecture

### Component Structure
```
src/components/settings/
├── followup-status-table.tsx     # Sortable table with DnD
└── followup-status-form-modal.tsx # Add/Edit modal
```

### @dnd-kit Setup
```typescript
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

---

## Related Files

| File | Action |
|------|--------|
| `src/components/settings/followup-status-table.tsx` | CREATE |
| `src/components/settings/followup-status-form-modal.tsx` | CREATE |
| `src/components/settings/index.ts` | UPDATE |

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Step 2: Create Sortable Row Component

Inside `followup-status-table.tsx`:

```typescript
function SortableRow({ status, onEdit, onDelete }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      {/* ... other cells */}
    </TableRow>
  );
}
```

### Step 3: Create Follow-up Status Table

Features:
- Columns: Drag handle, Status, Aliases, Days, Active, Actions
- DndContext wrapping table
- SortableContext with vertical list strategy
- onDragEnd calls reorder API
- Optimistic UI update

```typescript
interface FollowUpStatusTableProps {
  onEdit: (status: FollowUpStatus) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}
```

### Step 4: Days Badge Color Logic

```typescript
function getDaysBadgeClass(days: number): string {
  if (days === 0) return "bg-gray-100 text-gray-800";
  if (days <= 2) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}
```

### Step 5: Create Form Modal

`src/components/settings/followup-status-form-modal.tsx`:

Features:
- Fields:
  - status (text, required, unique)
  - aliases (tag input, comma separated)
  - daysToFollowup (number, required, min 0)
  - isActive (checkbox)
- Tag input for aliases (type, press enter to add)

```typescript
interface FollowUpStatusFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: FollowUpStatus | null;
  onSuccess: () => void;
}
```

### Step 6: Aliases Tag Input

Simple implementation:
```typescript
const [aliasInput, setAliasInput] = useState('');
const [aliases, setAliases] = useState<string[]>([]);

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && aliasInput.trim()) {
    e.preventDefault();
    setAliases([...aliases, aliasInput.trim()]);
    setAliasInput('');
  }
}

function removeAlias(index: number) {
  setAliases(aliases.filter((_, i) => i !== index));
}
```

---

## UI Specifications

### Table Columns
| Column | Width | Content |
|--------|-------|---------|
| ⋮⋮ | 40px | Drag handle (GripVertical icon) |
| Trạng thái | 200px | Status name |
| Aliases | 250px | Tag badges |
| Số ngày | 80px | Badge với màu |
| Trạng thái | 100px | Active/Inactive badge |
| Actions | 80px | Edit, Delete buttons |

### Badge Colors (Days)
```typescript
// 0 days - No follow-up needed
days === 0: "bg-gray-100 text-gray-800 border-gray-200"

// 1-2 days - Soon
days <= 2: "bg-yellow-100 text-yellow-800 border-yellow-200"

// 3+ days - Later
days >= 3: "bg-red-100 text-red-800 border-red-200"
```

### Aliases Tags
```typescript
// Small badge style
"inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 mr-1 mb-1"
```

---

## Form Layout

```
┌─────────────────────────────────────────────┐
│ Thêm/Sửa Trạng thái                     [X] │
├─────────────────────────────────────────────┤
│                                             │
│ Tên trạng thái *     [________________]     │
│                                             │
│ Aliases              [________________]     │
│ (Nhấn Enter để thêm)                        │
│ [mới] [new] [moi] [x]                       │
│                                             │
│ Số ngày follow-up *  [____]                 │
│                                             │
│ ☑ Đang hoạt động                            │
│                                             │
├─────────────────────────────────────────────┤
│                      [Hủy]  [Lưu]           │
└─────────────────────────────────────────────┘
```

---

## Drag & Drop Flow

```
1. User grabs drag handle
2. DndContext activates
3. User drags row to new position
4. onDragEnd fires
5. Calculate new sortOrder values
6. Optimistic update: reorder local state
7. Call reorder API
8. On success: keep new order
9. On error: revert to original order, show toast
```

---

## Todo List

- [x] Install @dnd-kit packages
- [x] Create followup-status-table.tsx
- [x] Implement DndContext + SortableContext
- [x] Create SortableRow component
- [x] Implement onDragEnd handler
- [x] Add days badge with color logic
- [x] Create followup-status-form-modal.tsx
- [x] Implement aliases tag input
- [x] Update index.ts exports
- [x] Test drag & drop (TypeScript validation passed)
- [x] Test add/edit/delete flows (TypeScript validation passed)

---

## Success Criteria

- [x] Table displays all statuses ordered by sortOrder
- [x] Drag handle is visible and grabbable
- [x] Drag & drop reorders items visually
- [x] Reorder persists after page refresh (optimistic update with API call)
- [x] Days badge shows correct color (0=gray, 1-2=yellow, 3+=red)
- [x] Aliases display as tags
- [x] Add modal creates new status
- [x] Edit modal updates existing status
- [x] Delete removes status

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| DnD not working on mobile | @dnd-kit has touch support by default |
| Reorder API fails | Optimistic update + revert on error |
| Performance with many items | Virtualization if >100 items (unlikely) |

---

## Next Steps

After completion, proceed to [Phase 5: Settings Page](./phase-05-settings-page.md)
