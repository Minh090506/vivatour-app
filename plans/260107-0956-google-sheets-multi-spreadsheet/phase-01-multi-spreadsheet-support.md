---
parent: plan.md
phase: 01
title: "Multi-Spreadsheet Support Implementation"
status: done
effort: 1h
completed: 2026-01-07
---

# Phase 01: Multi-Spreadsheet Support

## Overview

Single phase to update Google Sheets sync with separate spreadsheet ID support.

## Key Insights

1. Current code uses `process.env.GOOGLE_SHEET_ID` directly in functions
2. `isGoogleSheetsConfigured()` checks single ID only
3. Private key parsing: `privateKey.replace(/\\n/g, "\n")` - handles escaped newlines but not missing PEM headers

## Requirements

- [x] Backward compatible with `GOOGLE_SHEET_ID`
- [x] Per-sheet IDs: `SHEET_ID_REQUEST`, `SHEET_ID_OPERATOR`, `SHEET_ID_REVENUE`
- [x] Robust private key parsing
- [x] Per-sheet config status in API response

## Implementation Steps

### Step 1: Update google-sheets.ts

```typescript
// Add helper to resolve sheet ID
export function getSheetIdForType(sheetName: string): string {
  const sheetEnvMap: Record<string, string | undefined> = {
    Request: process.env.SHEET_ID_REQUEST,
    Operator: process.env.SHEET_ID_OPERATOR,
    Revenue: process.env.SHEET_ID_REVENUE,
  };

  const sheetId = sheetEnvMap[sheetName] || process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error(`No spreadsheet ID for ${sheetName}. Set SHEET_ID_${sheetName.toUpperCase()} or GOOGLE_SHEET_ID`);
  }
  return sheetId;
}

// Fix private key parsing
function parsePrivateKey(key: string): string {
  let parsed = key.replace(/\\n/g, "\n");
  // Add PEM headers if missing
  if (!parsed.includes("-----BEGIN")) {
    parsed = `-----BEGIN PRIVATE KEY-----\n${parsed}\n-----END PRIVATE KEY-----`;
  }
  return parsed;
}

// Update getSheetData signature
export async function getSheetData(
  sheetName: string,
  startRow: number = 2,
  spreadsheetId?: string
): Promise<SheetRow[]>

// Update getSheetHeaders signature
export async function getSheetHeaders(
  sheetName: string,
  spreadsheetId?: string
): Promise<string[]>

// Update isGoogleSheetsConfigured to check per-sheet
export function getSheetConfigStatus(): Record<string, boolean> {
  return {
    Request: !!(process.env.SHEET_ID_REQUEST || process.env.GOOGLE_SHEET_ID),
    Operator: !!(process.env.SHEET_ID_OPERATOR || process.env.GOOGLE_SHEET_ID),
    Revenue: !!(process.env.SHEET_ID_REVENUE || process.env.GOOGLE_SHEET_ID),
  };
}
```

### Step 2: Update API Route

- POST: Use `getSheetIdForType(sheetName)` before sync
- GET: Return per-sheet config via `getSheetConfigStatus()`

### Step 3: Update .env.example

```env
# Google Sheets API (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Spreadsheet IDs (per-sheet or single fallback)
SHEET_ID_REQUEST="spreadsheet-id-for-requests"
SHEET_ID_OPERATOR="spreadsheet-id-for-operators"
SHEET_ID_REVENUE="spreadsheet-id-for-revenues"
GOOGLE_SHEET_ID="fallback-if-all-same"
```

## Todo List

- [x] Add `getSheetIdForType()` helper
- [x] Add `parsePrivateKey()` helper
- [x] Update `getSheetData()` signature
- [x] Update `getSheetHeaders()` signature
- [x] Add `getSheetConfigStatus()` function
- [x] Update `isGoogleSheetsConfigured()` logic
- [x] Update POST handler to use sheet-specific ID
- [x] Update GET handler to return per-sheet config
- [x] Update `.env.example` with new vars

## Success Criteria

1. `SHEET_ID_REQUEST` takes precedence over `GOOGLE_SHEET_ID` for Request
2. Missing per-sheet ID falls back to `GOOGLE_SHEET_ID`
3. Private key without headers still works
4. GET /api/sync/sheets shows per-sheet config status

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing setups | Fallback to GOOGLE_SHEET_ID |
| Invalid private key format | Robust parsing + clear error |
