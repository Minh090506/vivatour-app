# Phase 5: Settings Page Integration

**Parent Plan:** [plan.md](./plan.md)
**Dependencies:** [Phase 4](./phase-04-followup-ui.md)
**Status:** ✅ COMPLETED
**Effort:** 0.5h
**Priority:** P1

---

## Overview

Create the Settings page with tab navigation combining Seller and Follow-up Status management.

---

## Requirements

1. Route: `/settings`
2. Tab-based layout using shadcn/ui Tabs
3. Tab 1: "Quản lý Seller"
4. Tab 2: "Quản lý Trạng thái"
5. Add to Header navigation

---

## Architecture

### Page Structure
```
src/app/(dashboard)/settings/
└── page.tsx
```

### Tab Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Cài đặt                                                     │
├─────────────────────────────────────────────────────────────┤
│ [Quản lý Seller] [Quản lý Trạng thái]                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tab Content Area                                           │
│  - SellerTable or FollowUpStatusTable                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Files

| File | Action |
|------|--------|
| `src/app/(dashboard)/settings/page.tsx` | CREATE |
| `src/components/layout/Header.tsx` | UPDATE (add nav link) |

---

## Implementation Steps

### Step 1: Create Settings Page

`src/app/(dashboard)/settings/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SellerTable, SellerFormModal, FollowUpStatusTable, FollowUpStatusFormModal } from '@/components/settings';
import type { Seller, FollowUpStatus } from '@/types';

export default function SettingsPage() {
  // Seller state
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerRefreshKey, setSellerRefreshKey] = useState(0);

  // FollowUp state
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpStatus | null>(null);
  const [followUpRefreshKey, setFollowUpRefreshKey] = useState(0);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Cài đặt</h1>

      <Tabs defaultValue="sellers" className="w-full">
        <TabsList>
          <TabsTrigger value="sellers">Quản lý Seller</TabsTrigger>
          <TabsTrigger value="followup">Quản lý Trạng thái</TabsTrigger>
        </TabsList>

        <TabsContent value="sellers" className="mt-6">
          <SellerTable
            key={sellerRefreshKey}
            onAdd={() => {
              setEditingSeller(null);
              setSellerModalOpen(true);
            }}
            onEdit={(seller) => {
              setEditingSeller(seller);
              setSellerModalOpen(true);
            }}
            onDelete={(id) => {
              // Handle delete
            }}
          />
          <SellerFormModal
            open={sellerModalOpen}
            onOpenChange={setSellerModalOpen}
            seller={editingSeller}
            onSuccess={() => {
              setSellerModalOpen(false);
              setSellerRefreshKey((k) => k + 1);
            }}
          />
        </TabsContent>

        <TabsContent value="followup" className="mt-6">
          <FollowUpStatusTable
            key={followUpRefreshKey}
            onAdd={() => {
              setEditingFollowUp(null);
              setFollowUpModalOpen(true);
            }}
            onEdit={(status) => {
              setEditingFollowUp(status);
              setFollowUpModalOpen(true);
            }}
            onDelete={(id) => {
              // Handle delete
            }}
          />
          <FollowUpStatusFormModal
            open={followUpModalOpen}
            onOpenChange={setFollowUpModalOpen}
            status={editingFollowUp}
            onSuccess={() => {
              setFollowUpModalOpen(false);
              setFollowUpRefreshKey((k) => k + 1);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Step 2: Update Header Navigation

Add to `src/components/layout/Header.tsx`:

Find navigation items array and add:
```typescript
{
  label: 'Cài đặt',
  href: '/settings',
  icon: Settings, // from lucide-react
}
```

Or add to dropdown menu if using that pattern.

### Step 3: Test Navigation Flow

1. Click Settings in Header
2. Verify default tab is "Quản lý Seller"
3. Switch to "Quản lý Trạng thái" tab
4. Verify URL doesn't change (client-side tabs)
5. Refresh page, verify stays on Settings

---

## UI Specifications

### Page Header
```typescript
<h1 className="text-2xl font-bold mb-6">Cài đặt</h1>
```

### Tab Styling
Using shadcn/ui default Tab styles:
- TabsList: horizontal bar with pill background
- TabsTrigger: text button, highlight when active
- TabsContent: content area below tabs

---

## Todo List

- [x] Create src/app/(dashboard)/settings/page.tsx
- [x] Implement tab state management
- [x] Wire up Seller components
- [x] Wire up FollowUp components
- [x] Update Header.tsx with Settings link (already present in dropdown)
- [x] Test tab switching
- [x] Test CRUD flows in both tabs
- [x] Verify responsive layout

---

## Success Criteria

- [x] /settings route accessible
- [x] Both tabs render correct content
- [x] Tab switching is smooth
- [x] CRUD operations work in both tabs
- [x] Header shows Settings link
- [x] Page is responsive on mobile

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Tab state lost on navigate | Use URL params if needed (optional) |
| Large bundle size | Components already loaded via barrel export |

---

## Final Checklist

After all phases complete:
- [x] `npm run build` passes
- [ ] `npm run lint` passes
- [x] All CRUD operations tested
- [x] Drag & drop reorder works
- [x] Seed data present (14 statuses)
- [ ] Documentation updated if needed
