# Phase 02: RevenueForm Tests

## Objective
Test RevenueForm component: rendering, validation, submission, lock states.

## Output File
`src/components/revenues/__tests__/revenue-form.test.tsx`

## Test Coverage (~15 tests)

### Rendering (5 tests)

1. **renders form in create mode with empty fields**
   - Cards: "Thong tin Booking", "Thong tin thanh toan", "So tien", "Ghi chu"
   - Button: "Tao thu nhap"

2. **renders form in edit mode with initial data**
   - Pre-populated fields from revenue prop
   - Button: "Cap nhat"

3. **renders loading state while fetching requests**
   - Shows "Dang tai du lieu..." during request fetch

4. **renders cancel button when onCancel provided**
   - "Huy" button visible

5. **renders locked warning when revenue has any lock tier**
   - "Thu nhap da khoa - khong the chinh sua" message
   - Inputs disabled when locked

### Form Validation (4 tests)

6. **shows error for missing booking selection**
   - Submit with no requestId
   - Error: "Vui long chon Booking"

7. **shows error for missing payment type**
   - Submit with requestId but no paymentType
   - Error: "Vui long chon loai thanh toan"

8. **shows error for missing payment source**
   - Error: "Vui long chon nguon thanh toan"

9. **shows error for zero or negative VND amount**
   - Error: "So tien VND phai > 0"

### Form Submission (4 tests)

10. **submits form with valid data in create mode**
    - Mock fetch POST /api/revenues
    - Calls onSuccess after success

11. **submits form with valid data in edit mode**
    - Mock fetch PUT /api/revenues/:id
    - Calls onSuccess after success

12. **displays API error on submission failure**
    - Mock fetch returns error
    - Error message displayed

13. **disables submit button while loading**
    - Button shows "Dang luu..."
    - Button disabled during submit

### Interactions (2 tests)

14. **updates fields on user input**
    - Select booking from dropdown
    - Select payment type/source
    - Enter amount via CurrencyInput

15. **calls onCancel when cancel clicked**
    - Click "Huy" button
    - onCancel callback invoked

## Mock Setup

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('next-auth/react', () => ({
  useSession: () => mockSession,
}));

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ userId: 'user1' }),
}));

jest.mock('@/lib/api/fetch-utils', () => ({
  safeFetch: jest.fn(),
  safePost: jest.fn(),
  safePut: jest.fn(),
}));
```

## Key Assertions

### Lock State Display
```typescript
// Check locked warning
expect(screen.getByText(/Thu nhap da khoa/)).toBeInTheDocument();

// Check inputs disabled
const dateInput = screen.getByLabelText('Ngay thanh toan *');
expect(dateInput).toBeDisabled();
```

### Form Submission
```typescript
await act(async () => {
  fireEvent.click(submitButton);
});

await waitFor(() => {
  expect(safePost).toHaveBeenCalledWith('/api/revenues', expect.objectContaining({
    requestId: 'req1',
    paymentType: 'DEPOSIT',
    amountVND: 5000000,
  }));
});
```

## Estimated Lines
~350 lines
