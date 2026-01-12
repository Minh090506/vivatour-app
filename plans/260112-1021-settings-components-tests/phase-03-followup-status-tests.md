# Phase 03: FollowUp Status Tests

## Context
- Plan: [plan.md](./plan.md)
- Setup: [phase-01-test-setup-and-mocks.md](./phase-01-test-setup-and-mocks.md)

## Overview
RTL tests for FollowUpStatusFormModal (239 lines) and FollowUpStatusTable (337 lines) with dnd-kit drag/drop.

## Key Insights
- Form uses react-hook-form with Zod validation
- Aliases: Enter key adds, X button removes, duplicate check
- Table uses @dnd-kit/core, @dnd-kit/sortable for reorder
- SortableRow component with drag handle (GripVertical)
- Delete confirmation via AlertDialog

## Requirements

### followup-status-form-modal.test.tsx (~12 tests)

**Rendering (3 tests)**
- renders create mode title "Thêm trạng thái mới"
- renders edit mode title "Sửa trạng thái"
- populates form fields in edit mode (status, daysToFollowup, aliases)

**Validation (3 tests)**
- shows error for empty status name
- allows daysToFollowup >= 0
- rejects negative daysToFollowup

**Alias Management (4 tests)**
- adds alias on Enter key
- removes alias on X button click
- shows duplicate alias error
- displays aliases as badges

**Submit (2 tests)**
- calls POST on create, PUT on edit
- shows success toast and closes modal

### followup-status-table.test.tsx (~15 tests)

**Rendering (4 tests)**
- renders table headers (Trạng thái, Aliases, Số ngày, etc.)
- renders loading state "Đang tải..."
- renders empty state "Chưa có trạng thái nào"
- renders status rows with badges

**CRUD (4 tests)**
- calls onAdd when add button clicked
- calls onEdit with status when edit clicked
- shows delete dialog on delete click
- calls onDelete after confirm

**Drag & Drop (4 tests)**
- renders drag handle (GripVertical icon)
- changes opacity when dragging (isDragging)
- calls reorder API after drag end
- reverts on API error (optimistic UI)

**Badges (3 tests)**
- renders days badge with color based on value (0/<=2/>2)
- renders active status badge "Hoạt động"
- renders inactive status badge "Ngừng"

## Implementation Steps

1. Create `src/components/settings/__tests__/followup-status-form-modal.test.tsx`
2. Mock react-hook-form if needed
3. Test alias Enter/remove functionality
4. Create `src/components/settings/__tests__/followup-status-table.test.tsx`
5. Mock @dnd-kit/core DndContext, useSortable
6. Test drag handle and reorder API

## Mock Strategy for dnd-kit

```typescript
// Mock dnd-kit modules
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: jest.fn((arr, from, to) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
}));
```

## Todo List
- [ ] followup-status-form-modal.test.tsx - Rendering
- [ ] followup-status-form-modal.test.tsx - Validation
- [ ] followup-status-form-modal.test.tsx - Alias management
- [ ] followup-status-form-modal.test.tsx - Submit
- [ ] followup-status-table.test.tsx - Rendering
- [ ] followup-status-table.test.tsx - CRUD
- [ ] followup-status-table.test.tsx - Drag & drop mocks
- [ ] followup-status-table.test.tsx - Badge rendering

## Success Criteria
- [ ] 27 tests pass
- [ ] dnd-kit properly mocked
- [ ] Alias add/remove functionality tested
- [ ] Optimistic UI revert tested
