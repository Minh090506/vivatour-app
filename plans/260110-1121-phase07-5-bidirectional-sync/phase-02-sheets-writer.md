---
date: 2026-01-10
priority: P1
status: pending
review: pending
parent: ./plan.md
---

# Phase 02: Google Sheets Writer + Retry Logic

## Context

- Parent: [Phase 07.5 Plan](./plan.md)
- Research: [Google Sheets Write API](./research/researcher-01-google-sheets-write-api.md)
- Current: `src/lib/google-sheets.ts` (read-only)

## Overview

Upgrade Google Sheets client from read-only to read-write. Implement `batchUpdate` wrapper with exponential backoff for rate limit handling.

## Requirements

1. Upgrade auth scope to `spreadsheets` (read-write)
2. Implement `updateSheetRows` for batch updates
3. Exponential backoff: 1s, 2s, 4s, 8s... max 64s
4. Rate limit manager to track quota usage

## Implementation

### 1. Upgrade Auth Scope

File: `src/lib/google-sheets.ts` (modify)

```typescript
// Change line 118 from:
scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],

// To:
scopes: ["https://www.googleapis.com/auth/spreadsheets"],
```

### 2. Create Sheets Writer Module

File: `src/lib/sync/sheets-writer.ts`

```typescript
/**
 * Google Sheets Write Operations
 *
 * Handles batch updates to Google Sheets with rate limit handling.
 */

import { google, sheets_v4 } from "googleapis";
import { getSheetConfig } from "@/lib/google-sheets";

// Lazy initialization
let sheetsClient: sheets_v4.Sheets | null = null;

/**
 * Parse private key (same as google-sheets.ts)
 */
function parsePrivateKey(key: string): string {
  let parsed = key.replace(/\\n/g, "\n");
  if (!parsed.includes("-----BEGIN")) {
    parsed = `-----BEGIN PRIVATE KEY-----\n${parsed.trim()}\n-----END PRIVATE KEY-----`;
  }
  return parsed;
}

/**
 * Get authenticated Sheets client (read-write)
 */
function getWriteClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error("Missing Google Sheets credentials");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: parsePrivateKey(privateKey),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 64000,
};

/**
 * Execute with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };

      // Only retry on rate limit (429)
      if (err.code !== 429) throw error;

      // Don't retry on last attempt
      if (attempt === RETRY_CONFIG.maxAttempts - 1) throw error;

      // Calculate delay with jitter
      const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const waitMs = Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);

      console.warn(`[SheetsWriter] ${context} rate limited. Retry ${attempt + 1}/${RETRY_CONFIG.maxAttempts} in ${Math.round(waitMs)}ms`);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw new Error("Unreachable");
}

/**
 * Row update data
 */
export interface RowUpdate {
  rowIndex: number; // 1-based row number in sheet
  values: (string | number | null)[]; // Column values
}

/**
 * Update multiple rows in a sheet
 *
 * @param sheetName - "Request" | "Operator" | "Revenue"
 * @param updates - Array of row updates with rowIndex and values
 * @returns Number of rows updated
 */
export async function updateSheetRows(
  sheetName: string,
  updates: RowUpdate[]
): Promise<number> {
  if (updates.length === 0) return 0;

  const config = getSheetConfig(sheetName);
  if (!config.spreadsheetId) {
    throw new Error(`No spreadsheet ID for ${sheetName}`);
  }

  const sheets = getWriteClient();

  // Build batch update data
  // Each row becomes a separate range for precision
  const data: sheets_v4.Schema$ValueRange[] = updates.map((update) => ({
    range: `${config.tabName}!A${update.rowIndex}:AZ${update.rowIndex}`,
    values: [update.values.map((v) => v ?? "")],
  }));

  // Execute with retry
  await withRetry(
    () =>
      sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: config.spreadsheetId!,
        requestBody: {
          valueInputOption: "USER_ENTERED", // Preserve formulas
          data,
        },
      }),
    `updateSheetRows(${sheetName})`
  );

  return updates.length;
}

/**
 * Append new row to sheet (for CREATE operations)
 *
 * @param sheetName - "Request" | "Operator" | "Revenue"
 * @param values - Column values for new row
 * @returns Appended row index (approximate)
 */
export async function appendSheetRow(
  sheetName: string,
  values: (string | number | null)[]
): Promise<number> {
  const config = getSheetConfig(sheetName);
  if (!config.spreadsheetId) {
    throw new Error(`No spreadsheet ID for ${sheetName}`);
  }

  const sheets = getWriteClient();

  const response = await withRetry(
    () =>
      sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId!,
        range: `${config.tabName}!A:AZ`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [values.map((v) => v ?? "")],
        },
      }),
    `appendSheetRow(${sheetName})`
  );

  // Extract row number from updatedRange (e.g., "Sheet1!A5:Z5" -> 5)
  const range = response.data.updates?.updatedRange || "";
  const match = range.match(/!A(\d+):/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Batch configuration
 */
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 100;

/**
 * Process large update batches (>25 rows)
 *
 * Splits into smaller batches with delay between to avoid rate limits.
 */
export async function updateSheetRowsBatched(
  sheetName: string,
  updates: RowUpdate[]
): Promise<number> {
  if (updates.length === 0) return 0;

  let totalUpdated = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    totalUpdated += await updateSheetRows(sheetName, batch);

    // Small delay between batches to spread load
    if (i + BATCH_SIZE < updates.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return totalUpdated;
}

/**
 * Rate limit tracker (simple in-memory)
 */
let requestCount = 0;
let windowStart = Date.now();
const WINDOW_MS = 60000; // 1 minute
const MAX_PER_MINUTE = 55; // Stay under 60/min quota

/**
 * Check if we should throttle
 */
export function shouldThrottle(): boolean {
  const now = Date.now();

  // Reset window if expired
  if (now - windowStart > WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }

  return requestCount >= MAX_PER_MINUTE;
}

/**
 * Record API request
 */
export function recordRequest(): void {
  requestCount++;
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(): {
  requestsInWindow: number;
  windowRemainingMs: number;
} {
  return {
    requestsInWindow: requestCount,
    windowRemainingMs: Math.max(0, WINDOW_MS - (Date.now() - windowStart)),
  };
}
```

## Success Criteria

1. Auth scope upgraded to read-write
2. `updateSheetRows` updates multiple rows in single API call
3. Exponential backoff handles 429 errors (1s, 2s, 4s, 8s, 16s, 32s, 64s)
4. Batch processing splits large updates (>25 rows)
5. Rate limit tracking prevents quota exhaustion

## Testing

```typescript
// Test in development (use test spreadsheet!)
import { updateSheetRows, appendSheetRow, getRateLimitStatus } from "@/lib/sync/sheets-writer";

// Update existing rows
await updateSheetRows("Request", [
  { rowIndex: 5, values: ["Seller", "Test Customer", "test@email.com", ...] },
  { rowIndex: 6, values: ["Seller", "Another Customer", "other@email.com", ...] },
]);

// Append new row
const newRowIndex = await appendSheetRow("Request", [
  "Seller", "New Customer", "new@email.com", ...
]);
console.log(`New row at index: ${newRowIndex}`);

// Check rate limit
console.log(getRateLimitStatus());
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Overwrite formulas | High | USER_ENTERED mode, skip formula cols in Phase 03 |
| Rate limit exceeded | Medium | Exponential backoff + batch processing |
| Credential exposure | High | Use env vars, never log credentials |
| Concurrent writes | Low | Queue serializes, cron runs sequentially |
