/**
 * Google Sheets Sync API
 *
 * POST - Trigger sync for a specific sheet (ADMIN only)
 * GET - Get sync status and statistics
 *
 * Supports: Request, Operator, Revenue sheets
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  getSheetData,
  getLastSyncedRow,
  isGoogleSheetsConfigured,
  getSheetConfigStatus,
} from "@/lib/google-sheets";
import {
  mapRequestRow,
  mapOperatorRow,
  mapRevenueRow,
} from "@/lib/sheet-mappers";
import { logError, logInfo } from "@/lib/logger";

const VALID_SHEETS = ["Request", "Operator", "Revenue"] as const;
type SheetName = (typeof VALID_SHEETS)[number];

interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
  errors: number;
  lastRowIndex?: number;
}

/**
 * Sync Request sheet rows to database
 */
async function syncRequestSheet(
  rows: { rowIndex: number; values: string[] }[]
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const data = await mapRequestRow(row.values, row.rowIndex);
      if (!data) continue;

      // Upsert by unique code
      await prisma.request.upsert({
        where: { code: data.code },
        update: {
          customerName: data.customerName,
          contact: data.contact,
          country: data.country,
          source: data.source,
          status: data.status,
          stage: data.stage,
          pax: data.pax,
          tourDays: data.tourDays,
          startDate: data.startDate,
          endDate: data.endDate,
          expectedRevenue: data.expectedRevenue,
          expectedCost: data.expectedCost,
          notes: data.notes,
          sheetRowIndex: data.sheetRowIndex,
          updatedAt: new Date(),
        },
        create: data,
      });

      // Log success
      await prisma.syncLog.create({
        data: {
          sheetName: "Request",
          action: "SYNC",
          rowIndex: row.rowIndex,
          recordId: data.code,
          status: "SUCCESS",
        },
      });

      synced++;
    } catch (error) {
      // Log failure
      await prisma.syncLog.create({
        data: {
          sheetName: "Request",
          action: "SYNC",
          rowIndex: row.rowIndex,
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Sync Operator sheet rows to database
 */
async function syncOperatorSheet(
  rows: { rowIndex: number; values: string[] }[]
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const data = await mapOperatorRow(row.values, row.rowIndex);
      if (!data) continue;

      // Find the request by code
      const request = await prisma.request.findUnique({
        where: { code: data.requestCode },
      });

      if (!request) {
        throw new Error(`Request not found: ${data.requestCode}`);
      }

      // Create operator (no upsert - operators can duplicate)
      await prisma.operator.create({
        data: {
          requestId: request.id,
          serviceDate: data.serviceDate,
          serviceType: data.serviceType,
          serviceName: data.serviceName,
          supplier: data.supplier,
          costBeforeTax: data.costBeforeTax,
          vat: data.vat,
          totalCost: data.totalCost,
          paymentStatus: data.paymentStatus,
          notes: data.notes,
          userId: data.userId,
          sheetRowIndex: data.sheetRowIndex,
        },
      });

      await prisma.syncLog.create({
        data: {
          sheetName: "Operator",
          action: "SYNC",
          rowIndex: row.rowIndex,
          recordId: data.requestCode,
          status: "SUCCESS",
        },
      });

      synced++;
    } catch (error) {
      await prisma.syncLog.create({
        data: {
          sheetName: "Operator",
          action: "SYNC",
          rowIndex: row.rowIndex,
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Sync Revenue sheet rows to database
 */
async function syncRevenueSheet(
  rows: { rowIndex: number; values: string[] }[]
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const data = await mapRevenueRow(row.values, row.rowIndex);
      if (!data) continue;

      // Find the request by code
      const request = await prisma.request.findUnique({
        where: { code: data.requestCode },
      });

      if (!request) {
        throw new Error(`Request not found: ${data.requestCode}`);
      }

      // Create revenue (no upsert - revenues can have multiple entries)
      await prisma.revenue.create({
        data: {
          requestId: request.id,
          paymentDate: data.paymentDate,
          paymentType: data.paymentType,
          foreignAmount: data.foreignAmount,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
          amountVND: data.amountVND,
          paymentSource: data.paymentSource,
          notes: data.notes,
          userId: data.userId,
          sheetRowIndex: data.sheetRowIndex,
        },
      });

      await prisma.syncLog.create({
        data: {
          sheetName: "Revenue",
          action: "SYNC",
          rowIndex: row.rowIndex,
          recordId: data.requestCode,
          status: "SUCCESS",
        },
      });

      synced++;
    } catch (error) {
      await prisma.syncLog.create({
        data: {
          sheetName: "Revenue",
          action: "SYNC",
          rowIndex: row.rowIndex,
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * POST - Trigger sync for a sheet
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check - ADMIN only
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user.role as Role, "*")) {
      return NextResponse.json(
        { success: false, error: "Admin only" },
        { status: 403 }
      );
    }

    // Check if Google Sheets is configured
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and SHEET_ID_* or GOOGLE_SHEET_ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const sheetName = body.sheetName as SheetName;

    if (!VALID_SHEETS.includes(sheetName)) {
      return NextResponse.json(
        { success: false, error: `Invalid sheet. Use: ${VALID_SHEETS.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if this specific sheet is configured
    const sheetConfig = getSheetConfigStatus();
    if (!sheetConfig[sheetName]) {
      return NextResponse.json(
        {
          success: false,
          error: `No spreadsheet ID for ${sheetName}. Set SHEET_ID_${sheetName.toUpperCase()} or GOOGLE_SHEET_ID`,
        },
        { status: 400 }
      );
    }

    logInfo("api/sync/sheets", `Starting sync for ${sheetName}`, {
      userId: session.user.id,
    });

    // Get last synced row
    const lastRow = await getLastSyncedRow(sheetName);

    // Fetch new rows from sheet (starting after last synced)
    const rows = await getSheetData(sheetName, lastRow + 1);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new rows to sync",
        synced: 0,
        errors: 0,
      } satisfies SyncResult);
    }

    // Sync based on sheet type
    let result: { synced: number; errors: number };

    switch (sheetName) {
      case "Request":
        result = await syncRequestSheet(rows);
        break;
      case "Operator":
        result = await syncOperatorSheet(rows);
        break;
      case "Revenue":
        result = await syncRevenueSheet(rows);
        break;
    }

    const lastRowIndex = rows[rows.length - 1]?.rowIndex;

    logInfo("api/sync/sheets", `Sync completed for ${sheetName}`, {
      synced: result.synced,
      errors: result.errors,
      lastRowIndex,
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} rows, ${result.errors} errors`,
      synced: result.synced,
      errors: result.errors,
      lastRowIndex,
    } satisfies SyncResult);
  } catch (error) {
    logError("api/sync/sheets", error);
    return NextResponse.json(
      { success: false, error: "Sync failed. Check server logs." },
      { status: 500 }
    );
  }
}

/**
 * GET - Get sync status and statistics
 */
export async function GET() {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get stats grouped by sheet and status
    const stats = await prisma.syncLog.groupBy({
      by: ["sheetName", "status"],
      _count: true,
      orderBy: { sheetName: "asc" },
    });

    // Get last sync per sheet
    const lastSyncs = await Promise.all(
      VALID_SHEETS.map(async (sheetName) => {
        const last = await prisma.syncLog.findFirst({
          where: { sheetName, status: "SUCCESS" },
          orderBy: { syncedAt: "desc" },
        });
        return { sheetName, lastSync: last?.syncedAt, lastRow: last?.rowIndex };
      })
    );

    // Check configuration (overall and per-sheet)
    const configured = isGoogleSheetsConfigured();
    const sheetConfig = getSheetConfigStatus();

    return NextResponse.json({
      success: true,
      data: {
        configured,
        sheetConfig,
        stats,
        lastSyncs,
      },
    });
  } catch (error) {
    logError("api/sync/sheets", error);
    return NextResponse.json(
      { success: false, error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
