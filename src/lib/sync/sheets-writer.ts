/**
 * Google Sheets Write Operations
 *
 * Handles batch updates to Google Sheets with rate limit handling.
 * Used by bidirectional sync to write DB changes back to Sheets.
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

      console.warn(
        `[SheetsWriter] ${context} rate limited. Retry ${attempt + 1}/${RETRY_CONFIG.maxAttempts} in ${Math.round(waitMs)}ms`
      );

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

  // Track API request
  recordRequest();

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

  // Track API request
  recordRequest();

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
 * Note: State resets on restart. Not suitable for multi-instance deployment.
 * For serverless/distributed, consider Redis-based rate limiting.
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
  const now = Date.now();

  // Reset window if expired
  if (now - windowStart > WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }

  requestCount++;
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(): {
  requestsInWindow: number;
  windowRemainingMs: number;
  shouldThrottle: boolean;
} {
  const now = Date.now();

  // Reset if window expired
  if (now - windowStart > WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }

  return {
    requestsInWindow: requestCount,
    windowRemainingMs: Math.max(0, WINDOW_MS - (now - windowStart)),
    shouldThrottle: requestCount >= MAX_PER_MINUTE,
  };
}

/**
 * Reset rate limit tracker (for testing)
 */
export function resetRateLimiter(): void {
  requestCount = 0;
  windowStart = Date.now();
}
