# Phase 03: RevenueTable Tests

## Objective
Test RevenueTable component: rendering, row actions, permissions, lock states.

## Output File
`src/components/revenues/__tests__/revenue-table.test.tsx`

## Test Coverage (~18 tests)

### Table Rendering (5 tests)

1. **renders empty state when no revenues**
   - Shows "Chua co thu nhap nao"

2. **renders table headers correctly**
   - Headers: Ngay, Loai, Nguon, So tien, Khoa, Thao tac
   - Optional: Booking (when showRequest=true)

3. **renders revenue rows with formatted data**
   - Date formatted via formatDate()
   - Amount formatted via formatCurrency()
   - Payment type badge

4. **displays booking code when showRequest=true**
   - Shows request.bookingCode or request.code

5. **displays foreign currency with exchange rate**
   - Shows foreign amount + currency above VND amount

### Lock State Display (4 tests)

6. **displays LockTierBadgeCompact for each lock state**
   - No lock: empty badge
   - KT only: amber badge
   - Admin: orange badge
   - Final: red badge

7. **disables edit action when any lock tier active**
   - Edit menu item disabled

8. **shows unlock option when canUnlock=true and locked**
   - "Mo khoa {tier}" menu item

9. **hides delete option when locked**
   - Delete menu item not visible

### Row Actions (5 tests)

10. **opens dropdown menu on action button click**
    - Renders DropdownMenuContent

11. **calls onEdit when edit clicked**
    - Click "Chinh sua"
    - onEdit callback with revenue

12. **shows delete confirmation dialog**
    - Click "Xoa" opens AlertDialog
    - "Xac nhan xoa" title

13. **calls onDelete and shows toast on delete**
    - Confirm delete
    - API DELETE /api/revenues/:id
    - toast.success("Da xoa thu nhap")
    - onRefresh called

14. **opens RevenueLockDialog on lock click**
    - Click "Khoa" menu item
    - Dialog opens with current state

### Permission-based Visibility (4 tests)

15. **hides actions column when canManage=false**
    - No "Thao tac" header
    - No action buttons

16. **shows lock option only for ACCOUNTANT or ADMIN**
    - isAccountant || isAdmin check

17. **shows unlock only when canUnlock=true**
    - Next unlock tier calculated correctly

18. **opens history sheet on history click**
    - Click "Lich su" menu item
    - Sheet with RevenueHistoryPanel

## Mock Setup

```typescript
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    isAdmin: true,
    isAccountant: false,
  }),
}));

jest.mock('sonner', () => ({
  toast: mockToast,
}));
```

## Key Test Patterns

### Table Row Rendering
```typescript
const revenues = [mockRevenue, mockLockedKTRevenue];
render(<RevenueTable revenues={revenues} canManage onRefresh={mockRefresh} />);

const rows = screen.getAllByRole('row');
expect(rows.length).toBe(3); // header + 2 data rows
```

### Action Menu
```typescript
const actionButton = screen.getByRole('button', { name: '' }); // MoreHorizontal icon
fireEvent.click(actionButton);

const editItem = screen.getByText('Chinh sua');
fireEvent.click(editItem);

expect(mockOnEdit).toHaveBeenCalledWith(mockRevenue);
```

### Lock State Logic
```typescript
// Next unlock tier = Final when fully locked
const fullyLocked = { lockKT: true, lockAdmin: true, lockFinal: true };
// Expect unlock option shows "Mo khoa Khóa Cuối"
```

## Estimated Lines
~450 lines
