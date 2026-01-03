# Phase 01: Edit Supplier Modal Component

## Context

- Parent plan: [plan.md](./plan.md)
- Pattern reference: `src/components/suppliers/transaction-form.tsx` (existing modal pattern)
- API: `src/app/api/suppliers/[id]/route.ts` (PUT endpoint)

## Overview

- **Priority**: P2
- **Status**: Completed
- **Description**: Create `EditSupplierModal` component with controlled dialog, form fields, validation, API integration, and toast notifications

## Key Insights

1. Existing `TransactionForm` demonstrates the modal pattern - Dialog with open state, form submission, error handling
2. `SupplierForm` contains all field logic but is card-based (not modal-friendly)
3. Supplier config at `@/config/supplier-config.ts` has `SUPPLIER_TYPES`, `PAYMENT_MODELS`, `SUPPLIER_LOCATIONS`
4. API expects: code, name, type, location, paymentModel, creditLimit, paymentTermDays, contactName, contactPhone, contactEmail, bankAccount, isActive, notes

## Requirements

### Functional
- Modal opens on Edit button click
- Pre-populate form with current supplier data
- Submit calls `PUT /api/suppliers/[id]`
- Show toast on success/error
- Close modal and refresh data on success
- Required fields: name, type, paymentModel

### Non-functional
- Consistent with existing UI patterns
- Responsive (works on mobile)

## Architecture

```
EditSupplierModal (Dialog wrapper)
├── DialogTrigger (Button with Edit icon)
├── DialogContent
│   ├── DialogHeader + DialogTitle
│   └── Form
│       ├── Basic Info: name, type, location, paymentModel
│       ├── Credit fields (conditional): creditLimit, paymentTermDays
│       ├── Contact: contactName, contactPhone, contactEmail, bankAccount
│       ├── Status: isActive, notes
│       └── Actions: Cancel, Save
```

## Related Code Files

| Action | File | Description |
|--------|------|-------------|
| **Create** | `src/components/suppliers/edit-supplier-modal.tsx` | New modal component |
| **Modify** | `src/app/(dashboard)/suppliers/[id]/page.tsx` | Replace edit button with modal |
| **Modify** | `src/app/layout.tsx` | Add Sonner `<Toaster />` provider |

## Implementation Steps

### Step 1: Create Modal Component

Create `src/components/suppliers/edit-supplier-modal.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_KEYS,
  SUPPLIER_LOCATIONS,
  SUPPLIER_LOCATION_KEYS,
  PAYMENT_MODELS,
} from '@/config/supplier-config';
import type { Supplier, PaymentModel } from '@/types';

interface EditSupplierModalProps {
  supplier: Supplier;
  onSuccess: () => void;
}

export function EditSupplierModal({ supplier, onSuccess }: EditSupplierModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({...});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: supplier.name,
        type: supplier.type,
        location: supplier.location || '',
        paymentModel: supplier.paymentModel,
        creditLimit: supplier.creditLimit?.toString() || '',
        paymentTermDays: supplier.paymentTermDays?.toString() || '',
        contactName: supplier.contactName || '',
        contactPhone: supplier.contactPhone || '',
        contactEmail: supplier.contactEmail || '',
        bankAccount: supplier.bankAccount || '',
        isActive: supplier.isActive,
        notes: supplier.notes || '',
      });
    }
  }, [open, supplier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          location: formData.location || null,
          paymentModel: formData.paymentModel,
          creditLimit: formData.creditLimit ? parseInt(formData.creditLimit) : null,
          paymentTermDays: formData.paymentTermDays ? parseInt(formData.paymentTermDays) : null,
          contactName: formData.contactName || null,
          contactPhone: formData.contactPhone || null,
          contactEmail: formData.contactEmail || null,
          bankAccount: formData.bankAccount || null,
          isActive: formData.isActive,
          notes: formData.notes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Có lỗi xảy ra');
        return;
      }
      toast.success('Cập nhật NCC thành công');
      setOpen(false);
      onSuccess();
    } catch {
      toast.error('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  // Form JSX with all fields
}
```

### Step 2: Update Supplier Detail Page

In `src/app/(dashboard)/suppliers/[id]/page.tsx`:

1. Add import: `import { EditSupplierModal } from '@/components/suppliers/edit-supplier-modal';`
2. Replace lines 83-88 (the Link button) with:
```tsx
<EditSupplierModal supplier={supplier} onSuccess={fetchSupplier} />
```

### Step 3: Add Toaster to Layout

**Note:** Sonner `<Toaster />` is NOT currently in the layout. Add it to `src/app/layout.tsx`:

```tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={...}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

## Todo List

- [x] Add `<Toaster />` to root layout
- [x] Create `edit-supplier-modal.tsx` component with all form fields
- [x] Implement form submission with PUT request + toast
- [x] Update supplier detail page to use modal instead of edit link
- [x] Test: modal open/close, validation, API, data refresh

## Success Criteria

1. Edit button opens modal with pre-filled supplier data
2. Form validates required fields (name, type, paymentModel)
3. Submit updates supplier via API
4. Toast shows on success/error
5. Modal closes and page refreshes on success
6. No console errors, TypeScript passes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sonner not configured in layout | Medium | Check layout, add `<Toaster />` if missing |
| Type mismatch with API | Low | Use existing types from `@/types` |

## Security Considerations

- API already validates input server-side
- No new attack vectors introduced

## Next Steps

After implementation:
1. Remove unused `/suppliers/[id]/edit` route if exists
2. Consider adding confirmation before closing modal with unsaved changes (future enhancement)
