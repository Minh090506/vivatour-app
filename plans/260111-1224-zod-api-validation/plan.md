---
title: "Add Zod Validation to API Routes"
description: "Add input validation schemas with Vietnamese error messages to 6 API routes"
status: completed
priority: P2
effort: 1h
branch: master
tags: [api, validation, backend]
created: 2026-01-11
---

# Add Zod Validation to API Routes

## Overview

Add Zod validation schemas to 6 API routes following existing patterns from `request-validation.ts`. Use `safeParse` for error handling, return 400 with Vietnamese error messages on validation failure.

## Pattern Reference

From `src/lib/validations/request-validation.ts`:
- Define schemas inline (simple) or in lib/validations (shared)
- Use `safeParse` → return 400 with `extractZodErrors()` details
- Vietnamese error messages

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Add Zod validation to API routes | ✅ Done | 1h | [phase-01](./phase-01-add-zod-validation.md) |

## Routes Summary

| Route | Method | Input Type | Validation |
|-------|--------|------------|------------|
| /api/suppliers/generate-code | GET | Query params | type, name required; location optional |
| /api/operators/pending-payments | GET | Query params | filter enum, optional strings |
| /api/operators/archive | POST | Body | ids[] OR autoArchive required |
| /api/operators/lock-period | POST/GET | Body/Query | month YYYY-MM, tier enum |
| /api/sync/sheets | POST | Body | sheetName enum |
| /api/users | GET | Query params | role enum optional |

## Skipped Routes

- `/api/sync/write-back` - Cron/admin auth only, no body validation needed
- `/api/config/user/me` - Auth only, no input to validate

## Dependencies

- Existing Zod patterns in `src/lib/validations/*.ts`
- `extractZodErrors` helper from `request-validation.ts`
