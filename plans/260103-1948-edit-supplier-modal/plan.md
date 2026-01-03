---
title: "Edit Supplier Modal"
description: "Add modal/dialog for editing supplier info on detail page"
status: completed
priority: P2
effort: 1h
branch: master
tags: [frontend, suppliers, modal]
created: 2026-01-03
---

# Edit Supplier Modal

## Overview

Replace the current "Sửa" button (links to edit page) with a modal dialog that allows inline editing of supplier information directly on the detail page.

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Create Edit Modal Component | ✅ Done | 45m | [phase-01](./phase-01-edit-supplier-modal.md) |

## Key Decisions

1. **New lightweight component** vs reusing `SupplierForm`
   - Decision: Create new `EditSupplierModal` - the existing form is full-page oriented with Cards layout, not suitable for modal
   - The new component will be simpler, focused on essential fields only

2. **Fields included**: name, type, paymentModel, contactName, contactPhone, contactEmail, bankAccount, location, isActive, notes

3. **Validation**: Required fields = name, type, paymentModel (matching API requirements)

4. **Toast**: Use Sonner for success/error notifications

## Dependencies

- Dialog component: `@/components/ui/dialog` ✓
- Sonner toast: `sonner` package ✓
- API: `PUT /api/suppliers/[id]` ✓
- Types: `Supplier`, `PaymentModel` from `@/types` ✓
