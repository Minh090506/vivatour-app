/**
 * Re-sync All Sheets Script
 *
 * Syncs Request, Operator, Revenue sheets from Google Sheets to database.
 * Bypasses API auth for direct execution.
 *
 * Run: npx tsx scripts/resync-all-sheets.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';
import {
  getSheetData,
  getLastSyncedRow,
  isGoogleSheetsConfigured,
  getSheetConfigStatus,
  getSheetConfig,
} from '../src/lib/google-sheets';
import {
  mapRequestRow,
  mapOperatorRow,
  mapRevenueRow,
} from '../src/lib/sheet-mappers';

const VALID_SHEETS = ['Request', 'Operator', 'Revenue'] as const;
type SheetName = (typeof VALID_SHEETS)[number];

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

      // Upsert by unique code (Request ID from column AR)
      await prisma.request.upsert({
        where: { code: data.code },
        update: {
          bookingCode: data.bookingCode,
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
          sheetName: 'Request',
          action: 'SYNC',
          rowIndex: row.rowIndex,
          recordId: data.code,
          status: 'SUCCESS',
        },
      });

      synced++;
    } catch (error) {
      // Log failure
      await prisma.syncLog.create({
        data: {
          sheetName: 'Request',
          action: 'SYNC',
          rowIndex: row.rowIndex,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
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

      // Find the request by bookingCode (Operator sheet uses booking code, not request ID)
      const request = await prisma.request.findFirst({
        where: { bookingCode: data.requestCode },
      });

      if (!request) {
        throw new Error(`Request not found for bookingCode: ${data.requestCode}`);
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
          sheetName: 'Operator',
          action: 'SYNC',
          rowIndex: row.rowIndex,
          recordId: data.requestCode,
          status: 'SUCCESS',
        },
      });

      synced++;
    } catch (error) {
      await prisma.syncLog.create({
        data: {
          sheetName: 'Operator',
          action: 'SYNC',
          rowIndex: row.rowIndex,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
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

      // Find the request by bookingCode (Revenue sheet uses booking code, not request ID)
      const request = await prisma.request.findFirst({
        where: { bookingCode: data.requestCode },
      });

      if (!request) {
        throw new Error(`Request not found for bookingCode: ${data.requestCode}`);
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
          sheetName: 'Revenue',
          action: 'SYNC',
          rowIndex: row.rowIndex,
          recordId: data.requestCode,
          status: 'SUCCESS',
        },
      });

      synced++;
    } catch (error) {
      await prisma.syncLog.create({
        data: {
          sheetName: 'Revenue',
          action: 'SYNC',
          rowIndex: row.rowIndex,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Main sync function
 */
async function syncSheet(sheetName: SheetName): Promise<{
  success: boolean;
  synced: number;
  errors: number;
  lastRowIndex?: number;
}> {
  console.log(`\n--- Syncing ${sheetName} ---`);

  // Check if sheet is configured
  const sheetConfig = getSheetConfigStatus();
  if (!sheetConfig[sheetName]) {
    console.log(`  ✗ No spreadsheet ID for ${sheetName}`);
    return { success: false, synced: 0, errors: 0 };
  }

  // Get last synced row
  const lastRow = await getLastSyncedRow(sheetName);
  const config = getSheetConfig(sheetName);
  const startRow = lastRow + 1;
  console.log(`  Starting from row ${startRow} (header row: ${config.headerRow})`);

  // Fetch rows from sheet
  const rows = await getSheetData(sheetName, startRow);
  console.log(`  Fetched ${rows.length} rows`);

  if (rows.length === 0) {
    console.log('  No new rows to sync');
    return { success: true, synced: 0, errors: 0 };
  }

  // Sync based on sheet type
  let result: { synced: number; errors: number };

  switch (sheetName) {
    case 'Request':
      result = await syncRequestSheet(rows);
      break;
    case 'Operator':
      result = await syncOperatorSheet(rows);
      break;
    case 'Revenue':
      result = await syncRevenueSheet(rows);
      break;
  }

  const lastRowIndex = rows[rows.length - 1]?.rowIndex;
  console.log(`  Synced: ${result.synced}, Errors: ${result.errors}, Last row: ${lastRowIndex}`);

  return {
    success: true,
    synced: result.synced,
    errors: result.errors,
    lastRowIndex,
  };
}

async function main() {
  console.log('=== Re-sync All Sheets ===\n');

  // Check configuration
  if (!isGoogleSheetsConfigured()) {
    console.error('Google Sheets not configured. Check env vars.');
    process.exit(1);
  }

  const results: Record<string, { synced: number; errors: number }> = {};

  // Sync in order: Request → Operator → Revenue
  for (const sheet of VALID_SHEETS) {
    const result = await syncSheet(sheet);
    results[sheet] = { synced: result.synced, errors: result.errors };
  }

  // Summary
  console.log('\n=== Summary ===');
  for (const [sheet, result] of Object.entries(results)) {
    console.log(`  ${sheet}: ${result.synced} synced, ${result.errors} errors`);
  }

  // Verify data integrity
  console.log('\n=== Data Verification ===');

  // Check Request status values
  const statusCheck = await prisma.request.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('\nRequest status values:');
  statusCheck.forEach((s) => console.log(`  ${s.status}: ${s._count}`));

  // Check for Vietnamese status values (should be none)
  const vietnameseStatuses = statusCheck.filter((s) =>
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      s.status
    )
  );
  if (vietnameseStatuses.length > 0) {
    console.log('\n⚠ Found Vietnamese status values (should not exist):');
    vietnameseStatuses.forEach((s) => console.log(`  ${s.status}: ${s._count}`));
  } else {
    console.log('\n✓ All status values are enum keys (no Vietnamese)');
  }

  // Check Operator/Revenue links
  const operatorCount = await prisma.operator.count();
  const operatorWithRequest = await prisma.operator.count({
    where: { requestId: { not: undefined } },
  });
  console.log(
    `\nOperator: ${operatorCount} total, ${operatorWithRequest} linked to requests`
  );

  const revenueCount = await prisma.revenue.count();
  const revenueWithRequest = await prisma.revenue.count({
    where: { requestId: { not: undefined } },
  });
  console.log(
    `Revenue: ${revenueCount} total, ${revenueWithRequest} linked to requests`
  );

  // Check sample Request with bookingCode
  const sampleBookings = await prisma.request.findMany({
    where: { bookingCode: { not: null } },
    take: 5,
    select: { code: true, bookingCode: true, customerName: true, status: true },
  });
  console.log('\nSample Requests with bookingCode:');
  sampleBookings.forEach((r) =>
    console.log(`  code=${r.code}, bookingCode=${r.bookingCode}, status=${r.status}`)
  );

  console.log('\n=== Re-sync Complete ===');
}

main()
  .catch((error) => {
    console.error('Re-sync failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
