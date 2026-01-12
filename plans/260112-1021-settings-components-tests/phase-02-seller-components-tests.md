# Phase 02: Seller Components Tests

## Context
- Plan: [plan.md](./plan.md)
- Setup: [phase-01-test-setup-and-mocks.md](./phase-01-test-setup-and-mocks.md)

## Overview
RTL tests for SellerFormModal (289 lines) and SellerTable (312 lines) components.

## Key Insights
- SellerFormModal uses controlled useState, not react-hook-form
- Validation: telegramId, sellerName, sheetName, sellerCode (1-2 uppercase)
- Table has search, pagination, CRUD with AlertDialog delete confirm
- Gender Select: MALE/FEMALE with Vietnamese labels

## Requirements

### seller-form-modal.test.tsx (~15 tests)

**Rendering (4 tests)**
- renders with create mode title "Thêm Seller mới"
- renders with edit mode title "Sửa thông tin Seller"
- populates form with seller data in edit mode
- shows all form fields (telegramId, sellerName, sellerCode, etc.)

**Validation (5 tests)**
- shows error for empty telegramId
- shows error for empty sellerName
- shows error for empty sheetName
- shows error for empty sellerCode
- shows error for invalid sellerCode format (non-uppercase, >2 chars)

**Submit (4 tests)**
- calls POST /api/config/sellers on create
- calls PUT /api/config/sellers/[id] on edit
- shows success toast on submit
- shows error toast on API failure

**State (2 tests)**
- disables submit button while loading
- closes modal and calls onSuccess after submit

### seller-table.test.tsx (~18 tests)

**Rendering (4 tests)**
- renders table headers correctly
- renders loading state "Đang tải..."
- renders empty state "Không có seller nào"
- renders seller data in rows

**CRUD (5 tests)**
- opens modal in create mode on add click
- opens modal in edit mode on edit click
- shows delete confirmation dialog on delete click
- calls DELETE API on confirm
- shows success toast after delete

**Search & Filter (3 tests)**
- updates search input on type
- resets to page 1 on search change
- debounces search (300ms)

**Pagination (4 tests)**
- shows pagination when totalPages > 1
- disables prev button on page 1
- disables next button on last page
- updates page on navigation

**Badges (2 tests)**
- renders gender badge (Nam/Nữ)
- renders status badge (Hoạt động/Ngừng)

## Implementation Steps

1. Create `src/components/settings/__tests__/seller-form-modal.test.tsx`
2. Import test-utils, render helpers
3. Mock next/navigation, sonner
4. Implement describe blocks per category
5. Create `src/components/settings/__tests__/seller-table.test.tsx`
6. Test CRUD, search, pagination, delete dialog

## Todo List
- [ ] seller-form-modal.test.tsx - Rendering tests
- [ ] seller-form-modal.test.tsx - Validation tests
- [ ] seller-form-modal.test.tsx - Submit tests
- [ ] seller-form-modal.test.tsx - State tests
- [ ] seller-table.test.tsx - Rendering tests
- [ ] seller-table.test.tsx - CRUD tests
- [ ] seller-table.test.tsx - Search tests
- [ ] seller-table.test.tsx - Pagination tests

## Success Criteria
- [ ] 33 tests pass
- [ ] Vietnamese text assertions correct
- [ ] Modal open/close states tested
- [ ] API calls verified with jest.fn()
