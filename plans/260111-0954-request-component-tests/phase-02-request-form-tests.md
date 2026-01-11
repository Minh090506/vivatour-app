# Phase 02: RequestForm Tests

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 01 (test-utils)

## Overview
- **Date**: 2026-01-11
- **Priority**: P2
- **Status**: pending
- **Review**: pending

## Key Insights
- Form uses Zod validation via `requestFormSchema`
- 4 Card sections: Customer Info, Tour Info, Status, Notes
- Auto-calculates endDate from startDate + tourDays
- Status dropdown grouped by REQUEST_STAGE_KEYS

## Requirements

### Test Scenarios
1. **Rendering**
   - Empty state (create mode) - default values
   - Edit mode with initialData

2. **Validation**
   - Required fields: customerName, contact, pax, country, source
   - Show errors on invalid submit
   - Clear errors on valid input

3. **Interactions**
   - Vietnamese text input (diacritics: Nguyễn Văn A)
   - Date picker changes
   - Status dropdown selection
   - Cancel button calls onCancel
   - Submit calls onSubmit with valid data

4. **Auto-calculation**
   - endDate = startDate + tourDays - 1

## Architecture

### File: `src/components/requests/__tests__/request-form.test.tsx`

```typescript
describe('RequestForm', () => {
  describe('Rendering', () => {
    it('renders form with empty state (create mode)')
    it('renders form with initial data (edit mode)')
    it('displays all required field labels with asterisks')
  })

  describe('Validation', () => {
    it('shows error for empty required fields on submit')
    it('shows error for invalid pax (0 or negative)')
    it('clears field error when user types valid value')
  })

  describe('Form Submission', () => {
    it('calls onSubmit with valid data')
    it('shows loading state during submission')
    it('displays error message on submit failure')
  })

  describe('Interactions', () => {
    it('handles Vietnamese text input')
    it('updates endDate when startDate or tourDays change')
    it('allows status selection from grouped dropdown')
    it('calls onCancel when cancel button clicked')
  })
})
```

## Related Code Files
- `src/components/requests/request-form.tsx` (396 lines)
- `src/lib/validations/request-validation.ts` (schema)
- `src/config/request-config.ts` (status/stage config)

## Implementation Steps

### 1. Setup test file with imports
```typescript
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RequestForm } from '../request-form';
import { mockRequest } from './test-utils';
```

### 2. Implement rendering tests
- Check for card titles: "Thông tin khách hàng", "Thông tin Tour", etc.
- Verify input placeholders
- Check edit mode populates fields

### 3. Implement validation tests
- Submit empty form → check error messages
- Check required field asterisks (*)

### 4. Implement interaction tests
- `fireEvent.change()` for inputs
- `fireEvent.click()` for buttons
- Check onSubmit/onCancel callbacks

## Todo List
- [ ] Create request-form.test.tsx
- [ ] Rendering tests (2 scenarios)
- [ ] Validation tests (3 scenarios)
- [ ] Form submission tests (3 scenarios)
- [ ] Interaction tests (4 scenarios)

## Success Criteria
- [ ] All tests pass
- [ ] Covers main form behaviors
- [ ] Vietnamese text handled correctly
- [ ] Async operations use waitFor/act

## Risk Assessment
- **Medium**: Zod validation async - need proper waitFor
- **Low**: Status dropdown uses Radix - may need userEvent

## Next Steps
→ Phase 03: RequestTable tests
