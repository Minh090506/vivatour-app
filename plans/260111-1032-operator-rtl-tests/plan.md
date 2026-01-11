---
title: "Operator Components RTL Tests"
description: "React Testing Library tests for 5 operator components (~82 tests)"
status: completed
priority: P2
effort: 3h
branch: master
tags: [testing, rtl, operators, components]
created: 2026-01-11
---

# Operator Components RTL Tests Plan

## Overview

Implementation plan for React Testing Library tests for 5 Operator module components. Follows existing test patterns from `src/components/requests/__tests__/`.

**Target**: ~82 tests across 5 components
**Effort**: 3h
**Priority**: P2

---

## Components to Test

| Component | File | Tests | Status |
|-----------|------|-------|--------|
| OperatorForm | `operator-form.tsx` | ~25 | Done |
| OperatorApprovalTable | `operator-approval-table.tsx` | ~15 | Done |
| OperatorLockDialog | `operator-lock-dialog.tsx` | ~18 | Done |
| OperatorHistoryPanel | `operator-history-panel.tsx` | ~12 | Done |
| OperatorListFilters | `operator-list-filters.tsx` | ~12 | Done |

---

## Phase Structure

1. **[Phase 01: Test Utils Setup](./phase-01-test-utils-setup.md)** - Shared mocks and fixtures
2. **[Phase 02: OperatorForm Tests](./phase-02-operator-form-tests.md)** - Form rendering, validation, submission (~25 tests)
3. **[Phase 03: OperatorApprovalTable Tests](./phase-03-operator-approval-table-tests.md)** - Table, selection, approval actions (~15 tests)
4. **[Phase 04: OperatorLockDialog Tests](./phase-04-operator-lock-dialog-tests.md)** - Dialog, tier selection, preview flow (~18 tests)
5. **[Phase 05: OperatorHistoryPanel Tests](./phase-05-operator-history-panel-tests.md)** - History timeline, formatting (~12 tests)
6. **[Phase 06: OperatorListFilters Tests](./phase-06-operator-list-filters-tests.md)** - Filters, checkboxes, clear (~12 tests)

---

## Mocking Strategy

### Global Mocks (in test-utils.ts)

```typescript
// next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));

// next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', role: 'ADMIN' } },
    status: 'authenticated',
  })),
}));

// sonner toast
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// global.fetch
export function setupFetchMock(responses: Record<string, unknown>): jest.Mock;
```

### Component-Specific Mocks

- **OperatorForm**: Fetch requests (F5 status), suppliers
- **OperatorApprovalTable**: ApprovalQueueItem[] data
- **OperatorLockDialog**: Lock preview API, lock confirm API
- **OperatorHistoryPanel**: OperatorHistoryEntry[] data
- **OperatorListFilters**: Filter state callbacks

---

## Test File Structure

```
src/components/operators/__tests__/
├── test-utils.ts                  # Shared mocks + fixtures
├── operator-form.test.tsx          # 25 tests
├── operator-approval-table.test.tsx # 15 tests
├── operator-lock-dialog.test.tsx   # 18 tests
├── operator-history-panel.test.tsx # 12 tests
└── operator-list-filters.test.tsx  # 12 tests
```

---

## Success Criteria

- [x] All 82 tests pass with `npm test`
- [x] No console warnings/errors in test output
- [x] Coverage: >80% for tested components
- [x] Test patterns consistent with existing Request tests
- [x] Vietnamese labels tested (internationalization)

---

## Dependencies

- Jest 30.x
- @testing-library/react
- @testing-library/jest-dom
- jest-mock-extended (for Prisma mocking if needed)

---

## Related Files

- **Existing patterns**: `src/components/requests/__tests__/`
- **Components**: `src/components/operators/*.tsx`
- **Config**: `src/config/operator-config.ts`
- **Types**: `src/types/index.ts`
