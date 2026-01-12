---
title: "Settings Module RTL Tests"
description: "Comprehensive RTL tests for 5 Settings components: seller forms, tables, followup status, and Google Sheets sync"
status: pending
priority: P2
effort: 6h
branch: master
tags: [testing, rtl, settings, components]
created: 2026-01-12
---

# Settings Module RTL Tests Implementation Plan

## Overview

Add comprehensive React Testing Library (RTL) tests for 5 Settings module components following established patterns from operators and revenues test suites.

## Target Components

| Component | Lines | Key Features |
|-----------|-------|--------------|
| seller-form-modal.tsx | 289 | Form validation, CRUD, modal states |
| seller-table.tsx | 312 | Table CRUD, pagination, search, delete dialog |
| followup-status-form-modal.tsx | 239 | Zod validation, alias management |
| followup-status-table.tsx | 337 | Drag & drop reorder, delete confirmation |
| google-sheets-sync.tsx | 225 | Connection status, sync trigger, loading states |

## Phases

### Phase 1: Test Setup and Mocks (1h)
- Create shared test utilities
- Define mock fixtures for Seller, FollowUpStatus
- Setup fetch mocks, toast mocks, dnd-kit mocks
- See: [phase-01-test-setup-and-mocks.md](./phase-01-test-setup-and-mocks.md)

### Phase 2: Seller Components Tests (2h)
- seller-form-modal.test.tsx (~15 tests)
- seller-table.test.tsx (~18 tests)
- See: [phase-02-seller-components-tests.md](./phase-02-seller-components-tests.md)

### Phase 3: FollowUp Status Tests (2h)
- followup-status-form-modal.test.tsx (~12 tests)
- followup-status-table.test.tsx (~15 tests)
- See: [phase-03-followup-status-tests.md](./phase-03-followup-status-tests.md)

### Phase 4: Google Sheets Sync Tests (1h)
- google-sheets-sync.test.tsx (~12 tests)
- See: [phase-04-google-sheets-sync-tests.md](./phase-04-google-sheets-sync-tests.md)

## Test Count Estimate

| File | Tests |
|------|-------|
| test-utils.ts | - |
| seller-form-modal.test.tsx | 15 |
| seller-table.test.tsx | 18 |
| followup-status-form-modal.test.tsx | 12 |
| followup-status-table.test.tsx | 15 |
| google-sheets-sync.test.tsx | 12 |
| **Total** | **~72 tests** |

## Success Criteria

- [ ] All 72+ tests pass
- [ ] No console errors/warnings in test output
- [ ] Follows existing test patterns (operators, revenues)
- [ ] Vietnamese UI text properly tested
- [ ] Coverage for CRUD, validation, loading, error states

## Dependencies

- Existing test patterns: `src/components/operators/__tests__/`
- Existing test patterns: `src/components/revenues/__tests__/`
- Types: `src/types/index.ts` (Seller, FollowUpStatus)
- UI components: shadcn/ui Dialog, Table, AlertDialog, Badge

## File Structure

```
src/components/settings/__tests__/
├── test-utils.ts                      # Shared mocks and fixtures
├── seller-form-modal.test.tsx         # Form modal tests
├── seller-table.test.tsx              # Table CRUD tests
├── followup-status-form-modal.test.tsx # Status form tests
├── followup-status-table.test.tsx     # Drag/drop table tests
└── google-sheets-sync.test.tsx        # Sync component tests
```
