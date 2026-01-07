/**
 * Truncate Request Data Script
 *
 * Deletes all Revenue, Operator, Request records and related SyncLogs
 * in correct FK order to avoid constraint violations.
 *
 * Run: npx tsx scripts/truncate-request-data.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function truncate() {
  console.log('Starting truncation...\n');

  // Get counts before deletion
  const beforeCounts = {
    revenue: await prisma.revenue.count(),
    operator: await prisma.operator.count(),
    operatorHistory: await prisma.operatorHistory.count(),
    request: await prisma.request.count(),
    syncLog: await prisma.syncLog.count({
      where: { sheetName: { in: ['Request', 'Operator', 'Revenue'] } }
    })
  };

  console.log('Before deletion:');
  console.log(`  Revenue: ${beforeCounts.revenue}`);
  console.log(`  Operator: ${beforeCounts.operator}`);
  console.log(`  OperatorHistory: ${beforeCounts.operatorHistory}`);
  console.log(`  Request: ${beforeCounts.request}`);
  console.log(`  SyncLog (Request/Operator/Revenue): ${beforeCounts.syncLog}`);
  console.log('');

  // Delete in FK-safe order
  console.log('1. Deleting Revenue records...');
  const deletedRevenue = await prisma.revenue.deleteMany({});
  console.log(`   Deleted: ${deletedRevenue.count}`);

  console.log('2. Deleting OperatorHistory records...');
  const deletedHistory = await prisma.operatorHistory.deleteMany({});
  console.log(`   Deleted: ${deletedHistory.count}`);

  console.log('3. Deleting Operator records...');
  const deletedOperator = await prisma.operator.deleteMany({});
  console.log(`   Deleted: ${deletedOperator.count}`);

  console.log('4. Deleting Request records...');
  const deletedRequest = await prisma.request.deleteMany({});
  console.log(`   Deleted: ${deletedRequest.count}`);

  console.log('5. Clearing SyncLog for Request/Operator/Revenue...');
  const deletedSyncLog = await prisma.syncLog.deleteMany({
    where: { sheetName: { in: ['Request', 'Operator', 'Revenue'] } }
  });
  console.log(`   Deleted: ${deletedSyncLog.count}`);

  // Verify
  console.log('\nVerification:');
  const afterCounts = {
    revenue: await prisma.revenue.count(),
    operator: await prisma.operator.count(),
    operatorHistory: await prisma.operatorHistory.count(),
    request: await prisma.request.count(),
    syncLog: await prisma.syncLog.count({
      where: { sheetName: { in: ['Request', 'Operator', 'Revenue'] } }
    })
  };

  console.log(`  Revenue: ${afterCounts.revenue} (should be 0)`);
  console.log(`  Operator: ${afterCounts.operator} (should be 0)`);
  console.log(`  OperatorHistory: ${afterCounts.operatorHistory} (should be 0)`);
  console.log(`  Request: ${afterCounts.request} (should be 0)`);
  console.log(`  SyncLog: ${afterCounts.syncLog} (should be 0)`);

  const success =
    afterCounts.revenue === 0 &&
    afterCounts.operator === 0 &&
    afterCounts.operatorHistory === 0 &&
    afterCounts.request === 0 &&
    afterCounts.syncLog === 0;

  if (success) {
    console.log('\n✓ Truncation completed successfully!');
  } else {
    console.error('\n✗ Truncation incomplete - some records remain');
    process.exit(1);
  }
}

truncate()
  .catch((error) => {
    console.error('Truncation failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
