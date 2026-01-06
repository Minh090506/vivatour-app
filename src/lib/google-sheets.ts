/**
 * Google Sheets API Client
 *
 * Provides read-only access to Google Sheets for one-way sync.
 * Uses Service Account authentication.
 *
 * Required ENV vars:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_PRIVATE_KEY
 * - GOOGLE_SHEET_ID
 *
 * @example
 * import { getSheetData, getLastSyncedRow } from '@/lib/google-sheets';
 * const rows = await getSheetData('Request', 2);
 */

import { google } from "googleapis";
import { prisma } from "@/lib/db";

// Lazy initialization to avoid build-time errors when env vars not set
let sheetsClient: ReturnType<typeof google.sheets> | null = null;

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
      // Handle escaped newlines from env vars
      private_key: privateKey.replace(/\\n/g, "\n"),
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
 * @returns Array of SheetRow with rowIndex and values
 */
export async function getSheetData(
  sheetName: string,
  startRow: number = 2
): Promise<SheetRow[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID");
  }

  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
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
 * @returns Array of header column names
 */
export async function getSheetHeaders(sheetName: string): Promise<string[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID");
  }

  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1`,
  });

  return (response.data.values?.[0] as string[]) || [];
}

/**
 * Check if Google Sheets API is configured
 */
export function isGoogleSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}
