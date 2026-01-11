---
title: "Revenue Component RTL Tests"
description: "Create React Testing Library tests for 5 Revenue components (~65 tests)"
status: completed
priority: P2
effort: 4h
branch: master
tags: [testing, rtl, revenue, components]
created: 2026-01-11
completed: 2026-01-11T12:18:00Z
---

# Revenue Component RTL Tests Implementation Plan

## Overview

Implement React Testing Library tests for 5 Revenue components following patterns established in `src/components/operators/__tests__/`. Target: ~65 tests covering form validation, table rendering, lock dialogs, history panels, and summary calculations.

## Components to Test

| Component | Lines | Est. Tests | Priority |
|-----------|-------|------------|----------|
| `revenue-form.tsx` | 329 | ~15 | High |
| `revenue-table.tsx` | 379 | ~18 | High |
| `revenue-lock-dialog.tsx` | 145 | ~12 | Medium |
| `revenue-history-panel.tsx` | 180 | ~10 | Medium |
| `revenue-summary-card.tsx` | 160 | ~10 | Low |

**Total**: ~65 tests

## Phases

### Phase 01: Test Utils Setup
- Create `src/components/revenues/__tests__/test-utils.ts`
- Mock fixtures: Revenue, Request, history entries
- Helper functions: createMockRevenue, setupFetchMock
- Permission mocks, router mocks, toast mocks

### Phase 02: RevenueForm Tests
- Form rendering (create/edit modes)
- Validation: required fields, currency input
- Lock state display (3-tier)
- Submission flow with API mocking
- Cancel behavior

### Phase 03: RevenueTable Tests
- Table rendering with data
- Empty state display
- Row actions: edit, delete, lock, history
- Permission-based action visibility
- 3-tier lock badge display
- Delete confirmation dialog

### Phase 04: RevenueLockDialog Tests
- Dialog rendering and opening
- Tier selection with sequential progression
- Lock API calls
- Error handling
- Success callbacks

### Phase 05: RevenueHistoryPanel Tests
- Loading state (skeleton)
- Empty state
- History entry rendering
- Action type colors/icons
- Timestamp formatting (Vietnamese)
- User name display

### Phase 06: RevenueSummaryCard Tests
- Total calculations (including refunds)
- Deposit total
- Lock tier breakdown
- Transaction counts
- Currency formatting

## Output Files

```
src/components/revenues/__tests__/
├── test-utils.ts              (~150 lines)
├── revenue-form.test.tsx      (~350 lines)
├── revenue-table.test.tsx     (~450 lines)
├── revenue-lock-dialog.test.tsx (~300 lines)
├── revenue-history-panel.test.tsx (~200 lines)
└── revenue-summary-card.test.tsx (~200 lines)
```

## Test Patterns

### Mock Setup (per test file)
```typescript
// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => mockSession,
}));

// Mock permission hook
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => defaultPermissionMock,
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: mockToast,
}));
```

### Component Testing
- Use `@testing-library/react`: render, screen, fireEvent, waitFor
- Follow AAA pattern: Arrange, Act, Assert
- Test user interactions over implementation details
- Mock API calls with `setupFetchMock` helper

## Dependencies

- Vitest (test runner)
- @testing-library/react
- @testing-library/jest-dom
- Existing patterns from operators/__tests__/

## Success Criteria

1. All 65+ tests pass
2. Coverage for key user flows
3. No flaky tests
4. Vietnamese UI text assertions
5. 3-tier lock system coverage

## Completion Summary (2026-01-11)

### Accomplished
- 6 test files created in `src/components/revenues/__tests__/`
- 63 comprehensive tests implemented
- All tests passing
- Components covered:
  - RevenueForm (15+ tests)
  - RevenueTable (18+ tests)
  - RevenueLockDialog (12+ tests)
  - RevenueHistoryPanel (10+ tests)
  - RevenueSummaryCard (10+ tests)
  - Test Utils with shared mocks and fixtures

### Quality Metrics
- Code Review: Grade A
- Test Coverage: All key user flows covered
- Lock System: Full 3-tier locking mechanism tested
- Vietnamese Localization: All UI text assertions validated

### Deliverables
- All test files follow RTL best practices
- Consistent with operators test patterns
- Mock fixtures for all test scenarios
- API mocking with fetch-utils integration
- Permission-based visibility tested
