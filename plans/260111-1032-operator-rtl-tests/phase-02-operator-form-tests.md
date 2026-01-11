# Phase 02: OperatorForm Tests

**Parent**: [plan.md](./plan.md)
**Status**: Done
**Effort**: 45min
**Tests**: ~25

---

## Overview

Test `operator-form.tsx` component covering form rendering, validation, dropdown behavior, cost calculations, and submission.

---

## Component Analysis

**Props**:
```typescript
interface OperatorFormProps {
  operator?: OperatorData;   // Edit mode data
  requestId?: string;        // Pre-selected request
  onSuccess?: () => void;    // Success callback
}
```

**Key Features**:
- Booking selection dropdown (F5 requests from `/api/requests?status=F5`)
- Service type dropdown (SERVICE_TYPES config)
- Supplier selection with auto-fill (name + bank account)
- Cost calculation: VAT 10% auto, totalCost = costBeforeTax + VAT
- VND currency formatting
- Form validation with Zod

---

## Test Cases

### describe('Rendering')

```typescript
it('renders form with empty state (create mode)')
it('renders form with initial data (edit mode)')
it('displays loading state while fetching data')
it('renders all form sections: Booking, Service, Cost, Payment')
it('shows required field indicators (*)')
it('disables booking selector when requestId prop provided')
it('disables booking selector when editing')
```

### describe('Booking Selection')

```typescript
it('fetches F5 requests on mount')
it('populates dropdown with fetched requests')
it('shows "Không có Booking F5" when no requests')
it('displays request code and customer name in options')
it('shows helper text about F5 status')
```

### describe('Service Type')

```typescript
it('renders all service types from SERVICE_TYPES config')
it('displays Vietnamese labels for service types')
it('updates form state on selection')
it('shows validation error when not selected')
```

### describe('Cost Calculation')

```typescript
it('auto-calculates VAT at 10% when costBeforeTax changes')
it('updates totalCost when costBeforeTax changes')
it('updates totalCost when VAT manually changed')
it('formats currency in VND format with thousands separator')
it('calculates debt correctly: totalCost - paidAmount')
it('shows debt in red when positive')
it('shows debt in green when zero')
```

### describe('Supplier Selection')

```typescript
it('fetches active suppliers on mount')
it('populates dropdown with suppliers')
it('auto-fills supplier name when selected')
it('auto-fills bank account when selected')
it('enables manual supplier name input when "Nhập tay" selected')
it('clears supplier fields when "none" selected')
```

### describe('Validation')

```typescript
it('shows error for empty required fields on submit')
it('displays field-level error messages')
it('clears field error when user types')
it('prevents submission with validation errors')
```

### describe('Submission')

```typescript
it('calls POST /api/operators in create mode')
it('calls PUT /api/operators/:id in edit mode')
it('shows loading state during submission')
it('calls onSuccess callback on successful submit')
it('redirects to operator detail on success without onSuccess')
it('displays API error message on failure')
it('handles network errors gracefully')
```

---

## Mock Requirements

```typescript
// Fetch mocks
setupFetchMock({
  '/api/requests?status=F5': { success: true, data: [mockRequestF5] },
  '/api/suppliers': { success: true, data: [mockSupplier] },
  '/api/operators': { success: true, data: { id: 'new-op' } },
});

// Router mock for navigation
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
};
```

---

## Success Criteria

- [x] 25 tests pass
- [x] Form validation tested thoroughly
- [x] Cost calculation logic verified
- [x] API calls tested with correct payloads
- [x] Loading/error states covered
