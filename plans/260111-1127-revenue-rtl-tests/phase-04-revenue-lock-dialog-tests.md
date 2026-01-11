# Phase 04: RevenueLockDialog Tests

## Objective
Test RevenueLockDialog component: tier selection, sequential locking, API calls.

## Output File
`src/components/revenues/__tests__/revenue-lock-dialog.test.tsx`

## Test Coverage (~12 tests)

### Rendering (4 tests)

1. **renders dialog when open=true**
   - Title: "Khoa Doanh thu"
   - Description: "Chon muc khoa de ap dung..."

2. **does not render when open=false**
   - No dialog content visible

3. **displays tier select dropdown**
   - Label: "Muc khoa"
   - Select component with options

4. **renders action buttons**
   - "Huy" cancel button
   - "Xac nhan" submit button

### Tier Selection Logic (4 tests)

5. **enables KT tier when no locks applied**
   - currentState: all false
   - KT option enabled

6. **disables KT when already locked, enables Admin**
   - currentState: lockKT=true
   - KT: "(da khoa)"
   - Admin: enabled

7. **disables Admin when KT not locked**
   - currentState: all false
   - Admin: "(can khoa KT truoc)"

8. **enables Final only when Admin locked**
   - currentState: lockKT=true, lockAdmin=true
   - Final: enabled
   - KT, Admin: disabled

### Lock API Calls (2 tests)

9. **calls lock API with selected tier on confirm**
   - Select tier, click "Xac nhan"
   - POST /api/revenues/:id/lock
   - Body: { tier: 'KT' }

10. **calls onSuccess and closes dialog on success**
    - API returns 200
    - onSuccess invoked
    - onOpenChange(false)

### Error Handling (2 tests)

11. **displays error message on API failure**
    - API returns 400/500
    - Error icon + message displayed

12. **resets error and tier on dialog close**
    - Close dialog
    - Reopen
    - Error cleared, tier reset to next available

## Mock Setup

```typescript
// Mock scrollIntoView for Select
Element.prototype.scrollIntoView = jest.fn();

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  revenueId: 'rev1',
  currentState: { lockKT: false, lockAdmin: false, lockFinal: false },
  onSuccess: jest.fn(),
};
```

## Key Test Patterns

### Sequential Tier Validation
```typescript
describe('Sequential Tier Progression', () => {
  it('KT must be locked before Admin', () => {
    render(<RevenueLockDialog {...defaultProps} currentState={{ lockKT: false, lockAdmin: false, lockFinal: false }} />);

    fireEvent.click(screen.getByLabelText('Muc khoa'));

    const adminOption = screen.getByRole('option', { name: /Admin/ });
    expect(adminOption).toHaveAttribute('aria-disabled', 'true');
    expect(adminOption).toHaveTextContent('can khoa KT truoc');
  });
});
```

### API Call Assertion
```typescript
await act(async () => {
  fireEvent.click(screen.getByText('Xac nhan'));
});

await waitFor(() => {
  expect(fetch).toHaveBeenCalledWith('/api/revenues/rev1/lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: 'KT' }),
  });
});
```

### Error Display
```typescript
setupFetchMockError('/api/revenues/rev1/lock', 'Khong co quyen khoa');

await act(async () => {
  fireEvent.click(screen.getByText('Xac nhan'));
});

await waitFor(() => {
  expect(screen.getByText('Khong co quyen khoa')).toBeInTheDocument();
});
```

## Estimated Lines
~300 lines
