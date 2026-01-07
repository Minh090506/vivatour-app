---
title: "Google Sheets Multi-Spreadsheet Support"
description: "Update sync to support separate spreadsheet IDs per sheet type"
status: complete
priority: P1
effort: 1h
branch: master
tags: [google-sheets, sync, refactor]
created: 2026-01-07
completed: 2026-01-07
---

# Google Sheets Multi-Spreadsheet Support

## Overview

Update Google Sheets sync to support separate spreadsheet IDs for Request, Operator, Revenue sheets while maintaining backward compatibility with single `GOOGLE_SHEET_ID`.

## Current State

- Single `GOOGLE_SHEET_ID` env var for all sheets
- Private key parsing only handles `\\n` escape
- No per-sheet configuration status in API

## Target State

- Per-sheet env vars: `SHEET_ID_REQUEST`, `SHEET_ID_OPERATOR`, `SHEET_ID_REVENUE`
- Fallback to `GOOGLE_SHEET_ID` for backward compatibility
- Robust private key parsing (handle various formats)
- Per-sheet configuration status in GET response

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| [Phase 01](./phase-01-multi-spreadsheet-support.md) | Update google-sheets.ts, API route, .env.example | done |

## Key Files

- `src/lib/google-sheets.ts` - Core API client
- `src/app/api/sync/sheets/route.ts` - Sync endpoints
- `.env.example` - Environment documentation

## Success Criteria

1. Each sheet type can use different spreadsheet ID
2. Existing single-ID setups continue working
3. Private key parsing handles edge cases
4. API shows per-sheet configuration status
