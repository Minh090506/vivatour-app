# Phase 5: Integration & Testing

**Status:** Pending
**Estimated Effort:** Small

---

## Objectives

1. Final integration and polish
2. Responsive behavior
3. Manual testing
4. Bug fixes

---

## Tasks

### Task 5.1: Responsive Left Panel

**File:** `src/components/requests/request-list-panel.tsx`

**Add responsive width classes:**
```tsx
<div className="w-[350px] lg:w-[350px] md:w-[280px] border-r flex flex-col h-full">
```

**Future Enhancement (Mobile Drawer):**
```tsx
// For mobile: use Sheet component
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// On mobile, show hamburger button that opens list as drawer
// Implementation deferred to future phase
```

---

### Task 5.2: Error Handling Polish

**Add toast notifications:**

1. Install if not present:
```bash
npx shadcn-ui add sonner
```

2. Replace `alert()` with toast:
```tsx
import { toast } from 'sonner';

// Success
toast.success('Đã lưu thành công');

// Error
toast.error('Lỗi khi lưu');
```

---

### Task 5.3: Loading States

**Skeleton loaders for detail panel:**
```tsx
function DetailSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="h-4 bg-muted rounded w-1/4" />
      <div className="h-32 bg-muted rounded" />
      <div className="h-32 bg-muted rounded" />
    </div>
  );
}
```

---

### Task 5.4: Keyboard Navigation (Optional)

**Add keyboard shortcuts:**
- `↑/↓` Navigate list
- `Enter` Select highlighted item
- `Escape` Clear selection

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      // Move to next item
    } else if (e.key === 'ArrowUp') {
      // Move to previous item
    } else if (e.key === 'Escape') {
      router.push('/requests');
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Testing Checklist

### Functional Tests

- [ ] Load /requests → shows empty right panel
- [ ] Click request → shows details, URL updates
- [ ] Refresh with ?id=xxx → restores selection
- [ ] Invalid ?id=xxx → shows empty panel, clears URL
- [ ] Filters work correctly
- [ ] Search filters list
- [ ] Add new service → appears in table
- [ ] Edit service → saves changes
- [ ] Delete service → removes from table
- [ ] Locked service → edit/delete disabled

### UI/UX Tests

- [ ] Scrollable list when many requests
- [ ] Scrollable detail when content long
- [ ] Status badges show correct colors
- [ ] Follow-up indicator shows for overdue
- [ ] Booking code banner shows for BOOKING status
- [ ] Empty states have helpful messages

### Edge Cases

- [ ] No requests in database → shows empty list
- [ ] Request deleted while viewing → handle gracefully
- [ ] API error → show error message
- [ ] Slow network → loading states visible

---

## Performance Considerations

1. **List virtualization** - If >100 requests, consider virtual scroll
2. **Debounced search** - Add 300ms debounce to search input
3. **Optimistic updates** - Update UI before API confirms

### Debounced Search Implementation:
```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    onFiltersChange({ ...filters, search: value });
  },
  300
);
```

---

## Deployment Checklist

- [ ] Run prisma migrate deploy
- [ ] Verify existing booking codes unchanged
- [ ] Test with production-like data volume
- [ ] Monitor for errors post-deploy

---

## Acceptance Criteria

- [ ] All Phase 1-4 criteria met
- [ ] No console errors
- [ ] Responsive on tablet (280px left panel)
- [ ] Toast notifications for success/error
- [ ] Loading states visible during fetch
- [ ] Smooth transitions and interactions
