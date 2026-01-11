---
title: "Validation Schema Unit Tests"
description: "Comprehensive Jest tests for Zod validation schemas"
status: pending
priority: P2
effort: 3h
branch: master
tags: [testing, validation, zod, jest]
created: 2026-01-11
---

# Validation Schema Unit Tests

## Overview

Create comprehensive unit tests for 4 validation schema files using Jest + Zod. Tests cover valid data, required fields, type validation, format validation, range validation, Vietnamese character handling, and refinement logic.

## Target Files

| File | Schemas | Test File |
|------|---------|-----------|
| `src/lib/validations/request-validation.ts` | requestFormSchema, createRequestSchema, updateRequestSchema, requestFiltersSchema | `request-validation.test.ts` |
| `src/lib/validations/operator-validation.ts` | operatorFormSchema, createOperatorSchema, updateOperatorSchema, operatorFiltersSchema | `operator-validation.test.ts` |
| `src/lib/validations/revenue-validation.ts` | createRevenueApiSchema, updateRevenueApiSchema | `revenue-validation.test.ts` |
| `src/lib/validations/config-validation.ts` | sellerSchema, followUpStatusSchema, reorderSchema | `config-validation.test.ts` |

## Test Categories (per schema)

1. Valid data passes validation
2. Required fields - missing field returns error
3. Field type validation (string vs number)
4. Format validation (email, phone, date, UUID)
5. Range validation (pax 1-100, VAT ≥0, amounts ≥0)
6. Vietnamese character handling (tên khách)
7. ID format validation (sellerCode: 1-2 uppercase)
8. Refinement validations (cross-field logic)

## Implementation Phases

| Phase | File | Status | Progress |
|-------|------|--------|----------|
| [Phase 01](./phase-01-request-validation-tests.md) | request-validation.test.ts | pending | 0% |
| [Phase 02](./phase-02-operator-validation-tests.md) | operator-validation.test.ts | pending | 0% |
| [Phase 03](./phase-03-revenue-validation-tests.md) | revenue-validation.test.ts | pending | 0% |
| [Phase 04](./phase-04-config-validation-tests.md) | config-validation.test.ts | pending | 0% |

## Output Directory

```
src/lib/validations/__tests__/
├── request-validation.test.ts
├── operator-validation.test.ts
├── revenue-validation.test.ts
└── config-validation.test.ts
```

## Success Criteria

- [ ] All 4 test files created
- [ ] Tests run with `npm test`
- [ ] 100% schema coverage
- [ ] Vietnamese error messages verified
- [ ] Refinement logic tested
- [ ] No regressions in existing tests

## Dependencies

- Jest 30.x (installed)
- @testing-library/jest-dom (installed)
- Zod 4.x (installed)
