# Phase 04: OperatorLockDialog Tests

**Parent**: [plan.md](./plan.md)
**Status**: Done
**Effort**: 35min
**Tests**: ~18

---

## Overview

Test `operator-lock-dialog.tsx` component covering dialog state, tier selection based on role, preview flow, and confirmation.

---

## Component Analysis

**Props**:
```typescript
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  userRole?: Role;  // Controls visible tiers
}
```

**Key Features**:
- Dialog with month input and tier select
- Role-based tier visibility (ACCOUNTANT: KT only, ADMIN: all 3)
- Preview flow: fetch count before confirm
- Operator list preview (up to 10 items)
- Lock confirmation with toast notification
- State reset on close

---

## Test Cases

### describe('Rendering')

```typescript
it('renders dialog when open=true')
it('does not render when open=false')
it('displays dialog title with lock icon')
it('displays dialog description')
it('renders month input with current month default')
it('renders tier select dropdown')
it('renders tier info section')
```

### describe('Role-based Tiers')

```typescript
it('shows only KT tier for ACCOUNTANT role')
it('shows all 3 tiers (KT, Admin, Final) for ADMIN role')
it('defaults to KT tier selection')
```

### describe('Tier Info Display')

```typescript
it('shows KT tier info when KT selected')
it('shows Admin tier info when Admin selected')
it('shows Final tier info when Final selected')
it('updates info when tier selection changes')
```

### describe('Preview Flow')

```typescript
it('shows "Xem trước" button initially')
it('calls GET /api/operators/lock-period on preview click')
it('passes month and tier as query params')
it('displays loading spinner during fetch')
it('shows operator count after preview')
it('displays operator list when count <= 10')
it('shows "Xác nhận khóa" button after preview')
it('shows message when count is 0')
it('resets preview when month changes')
it('resets preview when tier changes')
```

### describe('Confirmation Flow')

```typescript
it('calls POST /api/operators/lock-period on confirm')
it('sends month and tier in request body')
it('shows loading state during confirm')
it('shows success toast on completion')
it('calls onSuccess callback after lock')
it('closes dialog after successful lock')
it('disables confirm button when count is 0')
```

### describe('Error Handling')

```typescript
it('displays error message on preview failure')
it('displays error message on confirm failure')
it('keeps dialog open on error')
```

### describe('Dialog Close')

```typescript
it('calls onOpenChange(false) when Cancel clicked')
it('resets month to current month on close')
it('resets tier to KT on close')
it('clears preview data on close')
it('clears error on close')
```

---

## Mock Requirements

```typescript
// Fetch mocks
setupFetchMock({
  '/api/operators/lock-period?month=2026-01&tier=KT': {
    success: true,
    data: {
      count: 5,
      operators: [
        { id: 'op1', serviceName: 'Hotel A', serviceDate: '2026-01-10', totalCost: 1000000 },
        { id: 'op2', serviceName: 'Hotel B', serviceDate: '2026-01-12', totalCost: 2000000 },
      ],
    },
  },
  'POST /api/operators/lock-period': {
    success: true,
    data: { count: 5 },
  },
});

// Toast mock
const mockToast = { success: jest.fn(), error: jest.fn() };
```

---

## Success Criteria

- [x] 18 tests pass
- [x] Role-based tier visibility works
- [x] Preview/confirm flow tested end-to-end
- [x] State reset on close verified
- [x] Error states handled
