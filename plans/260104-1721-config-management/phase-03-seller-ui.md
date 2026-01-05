# Phase 3: Seller UI Components

**Parent Plan:** [plan.md](./plan.md)
**Dependencies:** [Phase 2](./phase-02-api-routes.md)
**Status:** 🔲 PENDING
**Effort:** 1.5h
**Priority:** P0

---

## Overview

Create UI components for Seller management: table, form modal, delete dialog.

---

## Requirements

1. Seller table with pagination
2. Add/Edit modal with form validation
3. Delete confirmation dialog
4. Search by name/telegramId
5. Gender display as badge
6. Active/Inactive status toggle

---

## Architecture

### Component Structure
```
src/components/settings/
├── index.ts                      # Barrel export
├── seller-table.tsx              # DataTable with pagination
├── seller-form-modal.tsx         # Add/Edit modal
└── seller-delete-dialog.tsx      # Confirm delete (optional, can inline)
```

---

## Related Files

| File | Action |
|------|--------|
| `src/components/settings/index.ts` | CREATE |
| `src/components/settings/seller-table.tsx` | CREATE |
| `src/components/settings/seller-form-modal.tsx` | CREATE |

---

## Implementation Steps

### Step 1: Create Barrel Export

`src/components/settings/index.ts`:
```typescript
export { SellerTable } from './seller-table';
export { SellerFormModal } from './seller-form-modal';
export { FollowUpStatusTable } from './followup-status-table';
export { FollowUpStatusFormModal } from './followup-status-form-modal';
```

### Step 2: Seller Table Component

`src/components/settings/seller-table.tsx`:

Features:
- Columns: Telegram ID, Seller Name, Sheet Name, Email, Gender, Code, Status, Actions
- Pagination (10/page)
- Search input (debounced)
- Add button triggers modal
- Edit/Delete buttons in actions column
- Gender badge: MALE=blue, FEMALE=pink
- Status badge: Active=green, Inactive=gray

```typescript
interface SellerTableProps {
  onEdit: (seller: Seller) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}
```

### Step 3: Seller Form Modal

`src/components/settings/seller-form-modal.tsx`:

Features:
- Dialog from shadcn/ui
- Form with react-hook-form + Zod
- Fields:
  - telegramId (text, required, unique check)
  - sellerName (text, required)
  - sheetName (text, required)
  - metaName (text, optional)
  - email (text, required, email validation)
  - gender (select: MALE/FEMALE)
  - sellerCode (text, 1-2 chars)
  - isActive (checkbox)
- Submit creates/updates via API
- Success toast notification

```typescript
interface SellerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seller?: Seller | null; // null = create mode
  onSuccess: () => void;
}
```

### Step 4: Form Field Layout

```
┌─────────────────────────────────────────────┐
│ Thêm/Sửa Seller                         [X] │
├─────────────────────────────────────────────┤
│                                             │
│ Telegram ID *        [________________]     │
│                                             │
│ Tên Seller *         [________________]     │
│                                             │
│ Tên Sheet *          [________________]     │
│                                             │
│ Tên Meta             [________________]     │
│                                             │
│ Email *              [________________]     │
│                                             │
│ Giới tính *          [▼ Chọn giới tính]     │
│                                             │
│ Mã Seller *          [__]                   │
│                                             │
│ ☑ Đang hoạt động                            │
│                                             │
├─────────────────────────────────────────────┤
│                      [Hủy]  [Lưu]           │
└─────────────────────────────────────────────┘
```

---

## UI Specifications

### Table Columns
| Column | Width | Content |
|--------|-------|---------|
| Telegram ID | 120px | Text |
| Tên Seller | 150px | Text |
| Tên Sheet | 150px | Text |
| Email | 180px | Text |
| Giới tính | 80px | Badge (MALE/FEMALE) |
| Mã | 60px | Text |
| Trạng thái | 100px | Badge (Active/Inactive) |
| Actions | 80px | Edit, Delete buttons |

### Badge Colors
```typescript
// Gender
MALE: "bg-blue-100 text-blue-800"
FEMALE: "bg-pink-100 text-pink-800"

// Status
Active: "bg-green-100 text-green-800"
Inactive: "bg-gray-100 text-gray-800"
```

---

## Todo List

- [ ] Create src/components/settings/index.ts
- [ ] Create seller-table.tsx with columns
- [ ] Add pagination logic
- [ ] Add search functionality
- [ ] Create seller-form-modal.tsx
- [ ] Add form validation với Zod
- [ ] Implement create/update API calls
- [ ] Add toast notifications
- [ ] Add delete confirmation inline
- [ ] Test all flows

---

## Success Criteria

- [ ] Table displays all sellers with correct columns
- [ ] Pagination works (prev/next, page numbers)
- [ ] Search filters by name or telegramId
- [ ] Add modal creates new seller
- [ ] Edit modal updates existing seller
- [ ] Delete removes seller with confirmation
- [ ] Validation errors display inline
- [ ] Toast shows success/error messages

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Form state not reset | Reset form on modal close |
| Stale data after mutation | Refetch after create/update/delete |

---

## Next Steps

After completion, proceed to [Phase 4: Follow-up Status UI](./phase-04-followup-ui.md)
