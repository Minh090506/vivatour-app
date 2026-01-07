/**
 * Debug Request Sync
 *
 * Investigates why Request rows are not being synced
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { getSheetData, getSheetConfig } from '../src/lib/google-sheets';

async function main() {
  console.log('=== Debug Request Sync ===\n');

  // Get a few rows
  const rows = await getSheetData('Request', 2);
  console.log(`Total rows fetched: ${rows.length}\n`);

  // Check first 5 rows
  console.log('First 5 rows analysis:');
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const values = row.values;

    console.log(`\nRow ${row.rowIndex}:`);
    console.log(`  A (0) Seller: "${values[0] || ''}"`);
    console.log(`  B (1) Name: "${values[1] || ''}"`);
    console.log(`  C (2) Contact: "${values[2] || ''}"`);
    console.log(`  H (7) Status: "${values[7] || ''}"`);
    console.log(`  T (19) BookingCode: "${values[19] || ''}"`);
    console.log(`  AR (43) RequestID: "${values[43] || ''}"`);

    // Check why it might be skipped
    const requestId = values[43];
    const sellerName = values[0];
    const customerName = values[1];

    const skips: string[] = [];
    if (!requestId?.trim()) skips.push('No RequestID');
    if (requestId === 'Request ID' || sellerName === 'Seller') skips.push('Header row');
    if (!sellerName?.trim()) skips.push('No Seller');
    if (!customerName?.trim() || customerName === 'Name') skips.push('No CustomerName');

    if (skips.length > 0) {
      console.log(`  SKIP REASON: ${skips.join(', ')}`);
    } else {
      console.log(`  ✓ Should be processed`);
    }
  }

  // Count rows with Request ID
  let withRequestId = 0;
  let withSeller = 0;
  let withCustomer = 0;
  let processable = 0;

  for (const row of rows) {
    const requestId = row.values[43];
    const sellerName = row.values[0];
    const customerName = row.values[1];

    if (requestId?.trim() && requestId !== 'Request ID') withRequestId++;
    if (sellerName?.trim() && sellerName !== 'Seller') withSeller++;
    if (customerName?.trim() && customerName !== 'Name') withCustomer++;

    if (
      requestId?.trim() &&
      requestId !== 'Request ID' &&
      sellerName !== 'Seller' &&
      sellerName?.trim() &&
      customerName?.trim() &&
      customerName !== 'Name'
    ) {
      processable++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total rows: ${rows.length}`);
  console.log(`With Request ID (col AR): ${withRequestId}`);
  console.log(`With Seller (col A): ${withSeller}`);
  console.log(`With Customer (col B): ${withCustomer}`);
  console.log(`Processable (all required): ${processable}`);

  // Check if we have SELLER users
  const sellers = await prisma.user.findMany({
    where: { role: 'SELLER' },
    select: { id: true, name: true },
  });
  console.log(`\nSELLER users in database: ${sellers.length}`);
  sellers.forEach((s) => console.log(`  ${s.name}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
