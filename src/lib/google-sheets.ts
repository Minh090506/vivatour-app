/**
 * Google Sheets API Client
 *
 * Provides read-only access to Google Sheets for one-way sync.
 * Uses Service Account authentication.
 *
 * Required ENV vars:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_PRIVATE_KEY
 * - SHEET_ID_REQUEST / SHEET_ID_OPERATOR / SHEET_ID_REVENUE (per-sheet)
 * - GOOGLE_SHEET_ID (fallback if all same)
 *
 * @example
 * import { getSheetData, getLastSyncedRow } from '@/lib/google-sheets';
 * const rows = await getSheetData('Request', 2);
 */

import { google } from "googleapis";
import { prisma } from "@/lib/db";

// Lazy initialization to avoid build-time errors when env vars not set
let sheetsClient: ReturnType<typeof google.sheets> | null = null;

/**
 * Parse private key handling various formats:
 * - Escaped newlines (\\n -> \n)
 * - Missing PEM headers (adds them if needed)
 */
function parsePrivateKey(key: string): string {
  // Handle escaped newlines from env vars
  let parsed = key.replace(/\\n/g, "\n");

  // Add PEM headers if missing (raw base64 key)
  if (!parsed.includes("-----BEGIN")) {
    parsed = `-----BEGIN PRIVATE KEY-----\n${parsed.trim()}\n-----END PRIVATE KEY-----`;
  }

  return parsed;
}

/**
 * Get spreadsheet ID for a specific sheet type.
 * Checks per-sheet env var first, falls back to GOOGLE_SHEET_ID.
 */
export function getSheetIdForType(sheetName: string): string {
  const sheetEnvMap: Record<string, string | undefined> = {
    Request: process.env.SHEET_ID_REQUEST,
    Operator: process.env.SHEET_ID_OPERATOR,
    Revenue: process.env.SHEET_ID_REVENUE,
  };

  const sheetId = sheetEnvMap[sheetName] || process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error(
      `No spreadsheet ID for ${sheetName}. Set SHEET_ID_${sheetName.toUpperCase()} or GOOGLE_SHEET_ID`
    );
  }
  return sheetId;
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: parsePrivateKey(privateKey),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

/**
 * Row data from Google Sheet
 */
export interface SheetRow {
  rowIndex: number;
  values: string[];
}

/**
 * Fetch data from a Google Sheet tab
 *
 * @param sheetName - Tab name (e.g., 'Request', 'Operator', 'Revenue')
 * @param startRow - Row to start from (default: 2, skips header)
 * @param spreadsheetId - Optional spreadsheet ID (defaults to getSheetIdForType)
 * @returns Array of SheetRow with rowIndex and values
 */
export async function getSheetData(
  sheetName: string,
  startRow: number = 2,
  spreadsheetId?: string
): Promise<SheetRow[]> {
  const sheetId = spreadsheetId || getSheetIdForType(sheetName);
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A${startRow}:Z`,
  });

  const rows = response.data.values || [];

  return rows.map((values, idx) => ({
    rowIndex: startRow + idx,
    values: values as string[],
  }));
}

/**
 * Get the last successfully synced row for a sheet
 *
 * @param sheetName - Tab name to check
 * @returns Last synced rowIndex, or 1 if no prior sync
 */
export async function getLastSyncedRow(sheetName: string): Promise<number> {
  const lastSync = await prisma.syncLog.findFirst({
    where: { sheetName, status: "SUCCESS" },
    orderBy: { rowIndex: "desc" },
  });

  // Return 1 so next fetch starts from row 2 (after header)
  return lastSync?.rowIndex ?? 1;
}

/**
 * Get sheet headers (first row)
 *
 * @param sheetName - Tab name
 * @param spreadsheetId - Optional spreadsheet ID (defaults to getSheetIdForType)
 * @returns Array of header column names
 */
export async function getSheetHeaders(
  sheetName: string,
  spreadsheetId?: string
): Promise<string[]> {
  const sheetId = spreadsheetId || getSheetIdForType(sheetName);
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:Z1`,
  });

  return (response.data.values?.[0] as string[]) || [];
}

/**
 * Check if Google Sheets API is configured (at least one sheet has ID)
 */
export function isGoogleSheetsConfigured(): boolean {
  const hasCredentials = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );

  const hasAnySheetId = !!(
    process.env.SHEET_ID_REQUEST ||
    process.env.SHEET_ID_OPERATOR ||
    process.env.SHEET_ID_REVENUE ||
    process.env.GOOGLE_SHEET_ID
  );

  return hasCredentials && hasAnySheetId;
}

/**
 * Get per-sheet configuration status
 * @returns Object with sheet names as keys and configured status as values
 */
export function getSheetConfigStatus(): Record<string, boolean> {
  return {
    Request: !!(process.env.SHEET_ID_REQUEST || process.env.GOOGLE_SHEET_ID),
    Operator: !!(process.env.SHEET_ID_OPERATOR || process.env.GOOGLE_SHEET_ID),
    Revenue: !!(process.env.SHEET_ID_REVENUE || process.env.GOOGLE_SHEET_ID),
  };
}
