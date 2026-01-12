# Phase 01: Test Setup and Mocks

## Context
- Plan: [plan.md](./plan.md)
- Pattern: `src/components/revenues/__tests__/test-utils.ts`

## Overview
Create shared test utilities with mock fixtures, fetch helpers, and global mocks for Settings components testing.

## Key Insights
- Follow established pattern from revenues test-utils.ts
- Seller and FollowUpStatus types from `src/types/index.ts`
- Components use sonner toast, next/navigation, dnd-kit
- Mock DOM methods for Radix UI Select components

## Requirements

### Mock Fixtures
1. **Seller mocks**
   - `mockSeller` - base fixture with all fields
   - `mockInactiveSeller` - isActive: false variant
   - `mockSellers` - array for table tests

2. **FollowUpStatus mocks**
   - `mockFollowUpStatus` - base with aliases array
   - `mockFollowUpStatuses` - sorted array for table

3. **Sync status mocks**
   - `mockSyncStatus` - configured: true state
   - `mockSyncStatusUnconfigured` - configured: false

### Helper Functions
- `setupFetchMock(responses)` - URL pattern matching
- `setupFetchMockError(url, message)` - error simulation
- `resetMocks()` - clear all mocks in beforeEach
- `createMockSeller(overrides)` - factory function
- `createMockFollowUpStatus(overrides)` - factory function

### Global Mocks
- `mockRouter` - next/navigation push, back, refresh
- `mockToast` - sonner success, error, info
- Radix UI DOM mocks - scrollIntoView, hasPointerCapture

## Implementation Steps

1. Create `src/components/settings/__tests__/test-utils.ts`
2. Define Seller mock fixtures
3. Define FollowUpStatus mock fixtures
4. Define SyncStatus mock fixtures
5. Implement fetch mock helpers
6. Export factory functions and mocks

## Todo List
- [ ] Create test-utils.ts file
- [ ] Add mockSeller, mockInactiveSeller, mockSellers
- [ ] Add mockFollowUpStatus, mockFollowUpStatuses
- [ ] Add mockSyncStatus, mockSyncStatusUnconfigured
- [ ] Add setupFetchMock, setupFetchMockError, resetMocks
- [ ] Add mockRouter, mockToast exports
- [ ] Add factory functions

## Success Criteria
- [ ] File compiles without TS errors
- [ ] Exports all required mocks and helpers
- [ ] Follows revenues test-utils.ts pattern
- [ ] ~100 lines of utility code
