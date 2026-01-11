# Code Review Report: Request Component Tests

**Reviewer**: code-reviewer
**Date**: 2026-01-11 10:16
**Scope**: Request component test suite

---

## Scope

**Files reviewed**:
- `src/components/requests/__tests__/test-utils.ts` (181 lines)
- `src/components/requests/__tests__/request-form.test.tsx` (296 lines)
- `src/components/requests/__tests__/request-table.test.tsx` (238 lines)
- `src/components/requests/__tests__/request-filters.test.tsx` (227 lines)
- `src/components/requests/__tests__/request-detail-panel.test.tsx` (419 lines)

**Lines tested**: ~1,361 test code lines
**Test results**: ✅ 69/69 passing
**Build status**: ✅ Passing
**Lint status**: ✅ Clean

---

## Overall Assessment

Test suite demonstrates **strong quality** with comprehensive coverage, proper isolation, correct async handling, and maintainable structure. Tests follow established patterns from code standards (Arrange-Act-Assert).

**Key strengths**:
- Proper test isolation via `beforeEach` cleanup
- Comprehensive state coverage (loading, error, empty, success)
- Good use of test utilities and shared fixtures
- Correct async/await patterns with `waitFor` and `act`
- Permission-based feature testing with proper mocking

**Minor improvements needed**:
- Add missing edge case coverage in forms
- Strengthen validation coverage
- Add accessibility tests for key interactions

---

## Critical Issues

**None found**. No security vulnerabilities, no breaking issues, no data loss risks.

---

## High Priority Findings

### 1. Missing Test Coverage for Form Validation Edge Cases

**Location**: `request-form.test.tsx`

**Issue**: While basic validation tested (empty required fields), missing coverage for:
- Email format validation in contact field
- WhatsApp phone number format validation
- Numeric bounds (pax min/max, tourDays max 365)
- Revenue/cost negative value prevention
- Date range validation (startDate before endDate)

**Impact**: Could miss validation bugs in production

**Recommendation**: Add validation edge case tests

```typescript
describe('Form Validation Edge Cases', () => {
  it('rejects invalid email format in contact field', async () => {
    render(<RequestForm onSubmit={mockOnSubmit} />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('email@example.com hoặc SĐT'), {
        target: { value: 'invalid-email' },
      });
    });

    const submitButton = screen.getByRole('button', { name: /tạo mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/email không hợp lệ/i)).toBeInTheDocument();
    });
  });

  it('prevents negative pax values', async () => {
    render(<RequestForm onSubmit={mockOnSubmit} />);

    const paxInput = screen.getAllByRole('spinbutton')[0];
    await act(async () => {
      fireEvent.change(paxInput, { target: { value: '-5' } });
    });

    expect((paxInput as HTMLInputElement).value).not.toBe('-5');
  });

  it('enforces tourDays max limit (365)', async () => {
    render(<RequestForm onSubmit={mockOnSubmit} />);

    const tourDaysInput = screen.getAllByRole('spinbutton').find(input =>
      (input as HTMLInputElement).max === '365'
    );

    await act(async () => {
      fireEvent.change(tourDaysInput!, { target: { value: '400' } });
    });

    const submitButton = screen.getByRole('button', { name: /tạo mới/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/số ngày không hợp lệ/i)).toBeInTheDocument();
    });
  });
});
```

---

### 2. Insufficient Revenue Section Error Handling Coverage

**Location**: `request-detail-panel.test.tsx`

**Issue**: Revenue loading tests cover:
- ✅ Loading state
- ✅ Error state with retry
- ❌ Network failure scenarios
- ❌ Partial data responses
- ❌ Permission changes during load

**Impact**: Could miss edge cases in revenue display logic

**Recommendation**: Add revenue error scenarios

```typescript
describe('Revenue Error Scenarios', () => {
  it('handles network failure gracefully', async () => {
    mockUsePermission.mockReturnValue({
      can: jest.fn(() => true),
      isAdmin: true,
    });

    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as jest.Mock;

    render(
      <RequestDetailPanel
        request={mockRequestWithBooking}
        isLoading={false}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/lỗi mạng/i)).toBeInTheDocument();
    });
  });

  it('retries revenue fetch when retry clicked', async () => {
    mockUsePermission.mockReturnValue({
      can: jest.fn(() => true),
      isAdmin: true,
    });

    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Failed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

    global.fetch = mockFetch as jest.Mock;

    render(
      <RequestDetailPanel
        request={mockRequestWithBooking}
        isLoading={false}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Thử lại'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
```

---

### 3. Mock Fetch Implementation Has Weak URL Matching

**Location**: `test-utils.ts:128-142`

**Issue**: Current `setupFetchMock` uses `url.includes(key)` which could cause false matches:

```typescript
const matchingKey = Object.keys(responses).find((key) => url.includes(key));
```

**Problem**: URL `/api/revenues-summary` would match key `/api/revenues`

**Recommendation**: Use exact URL path matching or regex patterns

```typescript
export function setupFetchMock(responses: Record<string, unknown> = {}): jest.Mock {
  const mockFetch = jest.fn((url: string) => {
    const urlObj = new URL(url, 'http://localhost');
    const path = urlObj.pathname;

    // Exact match first, then fallback to includes
    let matchingKey = Object.keys(responses).find((key) => path === key);
    if (!matchingKey) {
      matchingKey = Object.keys(responses).find((key) => path.includes(key));
    }

    const response = matchingKey ? responses[matchingKey] : { success: true, data: [] };

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
    });
  });

  global.fetch = mockFetch as unknown as typeof fetch;
  return mockFetch;
}
```

---

## Medium Priority Improvements

### 4. Test Utilities Could Be More Reusable

**Location**: `test-utils.ts`

**Observation**: Good shared fixtures and utilities, but could benefit from:
- Factory function for creating requests with specific stages/statuses
- Helper for setting up multiple permission scenarios
- Date fixture factory for follow-up testing

**Recommendation**: Add factory helpers

```typescript
/**
 * Create request with specific stage and matching status
 */
export function createRequestByStage(
  stage: RequestStage,
  overrides?: Partial<Request>
): Request {
  const statusesByStage = {
    LEAD: 'DANG_LL_CHUA_TL',
    QUOTE: 'DA_BAO_GIA',
    FOLLOWUP: 'F1',
    OUTCOME: 'BOOKING',
  };

  return createMockRequest({
    stage,
    status: statusesByStage[stage],
    ...overrides,
  });
}

/**
 * Create follow-up date scenarios
 */
export const followUpDates = {
  overdue: () => new Date(Date.now() - 3 * 86400000), // 3 days ago
  today: () => new Date(),
  tomorrow: () => new Date(Date.now() + 86400000),
  nextWeek: () => new Date(Date.now() + 7 * 86400000),
};

/**
 * Permission presets for common roles
 */
export const permissionPresets = {
  admin: () => createPermissionMock({
    role: 'ADMIN',
    isAdmin: true,
    can: jest.fn(() => true),
  }),
  seller: () => createPermissionMock({
    role: 'SELLER',
    isSeller: true,
    isAdmin: false,
    can: jest.fn((perm: string) => perm.startsWith('request:')),
  }),
  accountant: () => createPermissionMock({
    role: 'ACCOUNTANT',
    isAccountant: true,
    isAdmin: false,
    can: jest.fn((perm: string) => perm.startsWith('revenue:')),
  }),
};
```

---

### 5. Missing Accessibility Testing

**Location**: All component tests

**Issue**: No tests verify:
- ARIA labels on interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader announcements for loading states
- Focus management after actions

**Recommendation**: Add accessibility tests using `@testing-library/user-event`

```typescript
import userEvent from '@testing-library/user-event';

describe('Accessibility', () => {
  it('supports keyboard navigation in filters', async () => {
    const user = userEvent.setup();
    render(<RequestFilters filters={defaultFilters} onChange={mockOnChange} />);

    // Tab to search input
    await user.tab();
    const searchInput = screen.getByPlaceholderText('Tìm theo tên, mã...');
    expect(searchInput).toHaveFocus();

    // Type and submit with Enter
    await user.type(searchInput, 'test{Enter}');
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'test' })
    );
  });

  it('announces loading state to screen readers', () => {
    const { container } = render(
      <RequestDetailPanel request={null} isLoading={true} onRefresh={mockOnRefresh} />
    );

    // Should have aria-busy or aria-live region
    const loadingRegion = container.querySelector('[aria-busy="true"], [aria-live]');
    expect(loadingRegion).toBeInTheDocument();
  });

  it('provides ARIA labels for action buttons', () => {
    render(
      <RequestDetailPanel
        request={mockRequest}
        isLoading={false}
        onRefresh={mockOnRefresh}
        onEditClick={mockOnEditClick}
      />
    );

    const editButton = screen.getByRole('button', { name: /chỉnh sửa/i });
    expect(editButton).toHaveAttribute('aria-label');
  });
});
```

---

### 6. Table Tests Missing Sort/Filter Integration

**Location**: `request-table.test.tsx`

**Observation**: Tests cover data rendering and row clicks but not:
- Column sorting interactions (if implemented)
- Inline filtering/search (if present)
- Pagination controls (if added later)

**Recommendation**: If table supports sorting, add tests:

```typescript
describe('Table Sorting', () => {
  it('sorts by customer name when header clicked', async () => {
    const { container } = render(
      <RequestTable requests={mockRequests} onSortChange={mockOnSortChange} />
    );

    const customerHeader = screen.getByText('Khách hàng');
    fireEvent.click(customerHeader);

    await waitFor(() => {
      expect(mockOnSortChange).toHaveBeenCalledWith({
        field: 'customerName',
        direction: 'asc',
      });
    });
  });
});
```

---

### 7. Form Tests Missing Character Limit Enforcement

**Location**: `request-form.test.tsx:265-269`

**Issue**: Test verifies character counter display but not enforcement:

```typescript
it('shows character count for notes field', () => {
  expect(screen.getByText(/\/1000 ký tự/)).toBeInTheDocument();
});
```

**Recommendation**: Add enforcement test

```typescript
it('prevents notes exceeding 1000 characters', async () => {
  render(<RequestForm onSubmit={mockOnSubmit} />);

  const notesField = screen.getByLabelText(/ghi chú/i);
  const longText = 'a'.repeat(1001);

  await act(async () => {
    fireEvent.change(notesField, { target: { value: longText } });
  });

  // Should truncate or show validation error
  expect((notesField as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(1000);
});
```

---

## Low Priority Suggestions

### 8. Consider Snapshot Testing for Complex UI States

**Recommendation**: For components with many conditional renders (like `RequestDetailPanel`), snapshot tests could catch unintended UI changes:

```typescript
it('matches snapshot for booking request with all data', () => {
  setupFetchMock({ '/api/revenues': { success: true, data: [] } });

  const { container } = render(
    <RequestDetailPanel
      request={mockRequestWithBooking}
      isLoading={false}
      onRefresh={mockOnRefresh}
    />
  );

  expect(container).toMatchSnapshot();
});
```

**Note**: Use sparingly. Snapshots can become maintenance burden.

---

### 9. Extract Common Test Setup into Custom Render

**Recommendation**: Create custom render wrapper to reduce boilerplate:

```typescript
// test-utils.ts
import { render, RenderOptions } from '@testing-library/react';

interface CustomRenderOptions extends RenderOptions {
  permissions?: Partial<typeof defaultPermissionMock>;
  session?: { user: { id: string; role: string } };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  // Setup mocks based on options
  if (options?.permissions) {
    mockUsePermission.mockReturnValue({
      ...defaultPermissionMock,
      ...options.permissions,
    });
  }

  return render(ui, options);
}

// Usage in tests
renderWithProviders(<RequestDetailPanel />, {
  permissions: { role: 'SELLER', isAdmin: false },
});
```

---

## Positive Observations

✅ **Excellent test isolation**: All tests use `beforeEach` cleanup
✅ **Proper async handling**: Consistent use of `act` and `waitFor`
✅ **Good mock organization**: Centralized in `test-utils.ts`
✅ **Comprehensive state coverage**: Loading, error, empty, success states
✅ **Permission testing**: Correctly mocks and tests RBAC features
✅ **Vietnamese text handling**: Tests verify i18n requirements
✅ **Follow-up indicator logic**: Thorough coverage of date-based styling
✅ **Error state UX**: Tests verify retry buttons and error messages
✅ **Conditional rendering**: Tests cover presence/absence of optional props

---

## Code Quality Metrics

| Aspect | Score | Notes |
|--------|-------|-------|
| Test Coverage | ⭐⭐⭐⭐ | 4/5 - Missing validation edge cases |
| Mock Quality | ⭐⭐⭐⭐⭐ | 5/5 - Excellent isolation and setup |
| Async Handling | ⭐⭐⭐⭐⭐ | 5/5 - Correct use of act/waitFor |
| Test Organization | ⭐⭐⭐⭐⭐ | 5/5 - Clear describe blocks, good naming |
| Edge Case Coverage | ⭐⭐⭐ | 3/5 - Needs validation and error scenarios |
| Maintainability | ⭐⭐⭐⭐ | 4/5 - Good utilities, could reduce duplication |

**Overall**: ⭐⭐⭐⭐ (4/5)

---

## Architecture & Design Principles

### YAGNI (You Aren't Gonna Need It)
✅ **Pass** - Tests focus on actual component behavior, no over-engineering

### KISS (Keep It Simple, Stupid)
✅ **Pass** - Tests are straightforward and readable

### DRY (Don't Repeat Yourself)
⚠️ **Partial** - Some duplication in mock setup, mitigated by test-utils.ts
- **Suggestion**: Use custom render wrapper to reduce mock initialization

### Security
✅ **Pass** - No security issues detected in test code
- Mock data uses safe test values
- No real credentials or sensitive data
- fetch mocking prevents actual network calls

### Performance
✅ **Pass** - Tests run efficiently (8.6s for 69 tests)
- Proper cleanup prevents memory leaks
- Mock data is lightweight

---

## Recommended Actions

### Immediate (High Priority)
1. ✅ **Add form validation edge case tests** (email, phone, bounds)
2. ✅ **Add revenue error scenario coverage** (network, retry, partial data)
3. ✅ **Fix fetch mock URL matching** to prevent false positives

### Short-term (Medium Priority)
4. **Add accessibility tests** for keyboard navigation and ARIA
5. **Extract common render wrapper** to reduce boilerplate
6. **Add test factory helpers** for stage/status/permission scenarios
7. **Test character limit enforcement** in notes field

### Long-term (Low Priority)
8. **Consider snapshot tests** for complex UI states (use sparingly)
9. **Add table sorting/pagination tests** when features implemented
10. **Monitor test execution time** as suite grows

---

## Compliance with Code Standards

Checked against `docs/code-standards.md`:

✅ **Test File Organization** - Follows `__tests__` pattern
✅ **Test Structure** - Uses Arrange-Act-Assert
✅ **TypeScript Types** - Proper type imports and mocking
✅ **Naming Conventions** - kebab-case for files, clear test names
✅ **Error Handling** - Tests verify error states and messages
✅ **Mocking Patterns** - Uses jest.mock correctly
✅ **Coverage Expectations** - Tests pass, no coverage threshold failures

---

## Summary

Request component test suite demonstrates **strong engineering practices** with comprehensive coverage of core functionality. Tests are well-isolated, properly handle async operations, and follow established patterns.

**Main gaps**: Validation edge cases, some error scenarios, accessibility testing.

**No critical issues found**. Code is production-ready with recommended enhancements for robustness.

---

## Unresolved Questions

1. **Coverage Thresholds**: Are there specific coverage % targets for this project? (Standards doc mentions 70% global, but not enforced in test run)
2. **E2E Testing**: Should integration tests be added for full user workflows? (e.g., create request → edit → view details)
3. **Visual Regression**: Should screenshot tests be added for critical UI components?
4. **Performance Testing**: Should tests verify render performance for large data sets? (e.g., 100+ requests in table)
5. **Component Library Tests**: Are RequestStatusBadge, RequestListItem, RequestServicesTable covered elsewhere?

---

**Review completed**: 2026-01-11 10:16
**Recommended for**: Production deployment with suggested enhancements
**Next review**: After adding validation/accessibility tests
