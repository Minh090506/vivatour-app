/**
 * Backfill: Generate IDs for existing records
 *
 * - Request.requestId: Generated from seller code + timestamp
 * - Operator.serviceId: Generated from bookingCode + timestamp
 * - Revenue.revenueId: Generated from bookingCode + timestamp + row
 *
 * Usage: npx ts-node scripts/backfill-ids.ts
 */

import { prisma } from '../src/lib/db';
import { removeDiacritics, formatTimestamp } from '../src/lib/id-utils';

async function backfillRequestIds() {
  console.log('Backfilling Request IDs...');

  const total = await prisma.request.count({
    where: { requestId: null },
  });
  console.log(`Found ${total} requests without requestId`);

  if (total === 0) return { backfilled: 0, total: 0 };

  let processed = 0;
  let skipped = 0;

  // Get requests with seller info
  const requests = await prisma.request.findMany({
    where: { requestId: null },
    select: {
      id: true,
      createdAt: true,
      seller: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const req of requests) {
    // Get seller code from name or use 'X' as fallback
    let sellerCode = 'X';
    if (req.seller?.name) {
      // Use first 2 chars of seller name
      const cleanName = removeDiacritics(req.seller.name).toUpperCase();
      sellerCode = cleanName.substring(0, 2) || 'X';
    }

    // Use original creation date for ID to maintain chronology
    const requestId = `${sellerCode}${formatTimestamp(req.createdAt)}`;

    try {
      await prisma.request.update({
        where: { id: req.id },
        data: { requestId },
      });
      processed++;
    } catch {
      // Likely uniqueness conflict, generate new timestamp
      const newId = `${sellerCode}${formatTimestamp(new Date())}${Math.random().toString(36).substring(2, 5)}`;
      try {
        await prisma.request.update({
          where: { id: req.id },
          data: { requestId: newId },
        });
        processed++;
      } catch {
        console.log(`Skipping request ${req.id} - ID conflict`);
        skipped++;
      }
    }

    if (processed % 100 === 0 && processed > 0) {
      console.log(`Processed ${processed}/${total} requests`);
    }
  }

  console.log(`Backfilled ${processed} request IDs (${skipped} skipped)`);
  return { backfilled: processed, total, skipped };
}

async function backfillServiceIds() {
  console.log('Backfilling Operator Service IDs...');

  const total = await prisma.operator.count({
    where: { serviceId: null },
  });
  console.log(`Found ${total} operators without serviceId`);

  if (total === 0) return { backfilled: 0, total: 0, skipped: 0 };

  let processed = 0;
  let skipped = 0;

  const operators = await prisma.operator.findMany({
    where: { serviceId: null },
    select: {
      id: true,
      createdAt: true,
      request: {
        select: { bookingCode: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const op of operators) {
    if (!op.request?.bookingCode) {
      // Skip operators without booking code
      skipped++;
      continue;
    }

    const serviceId = `${op.request.bookingCode}-${formatTimestamp(op.createdAt)}`;

    try {
      await prisma.operator.update({
        where: { id: op.id },
        data: { serviceId },
      });
      processed++;
    } catch {
      // Conflict - generate unique ID
      const newId = `${op.request.bookingCode}-${formatTimestamp(new Date())}${Math.random().toString(36).substring(2, 5)}`;
      try {
        await prisma.operator.update({
          where: { id: op.id },
          data: { serviceId: newId },
        });
        processed++;
      } catch {
        console.log(`Skipping operator ${op.id} - ID conflict`);
        skipped++;
      }
    }

    if (processed % 100 === 0 && processed > 0) {
      console.log(`Processed ${processed}/${total} operators`);
    }
  }

  console.log(`Backfilled ${processed} service IDs (${skipped} skipped - no booking code)`);
  return { backfilled: processed, total, skipped };
}

async function backfillRevenueIds() {
  console.log('Backfilling Revenue IDs...');

  const total = await prisma.revenue.count({
    where: { revenueId: null },
  });
  console.log(`Found ${total} revenues without revenueId`);

  if (total === 0) return { backfilled: 0, total: 0, skipped: 0 };

  let processed = 0;
  let skipped = 0;

  // Group by request to handle row numbers
  const requests = await prisma.request.findMany({
    where: {
      revenues: {
        some: { revenueId: null },
      },
    },
    select: {
      id: true,
      bookingCode: true,
      revenues: {
        where: { revenueId: null },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  for (const req of requests) {
    if (!req.bookingCode) {
      skipped += req.revenues.length;
      continue;
    }

    let rowNum = 1;
    for (const rev of req.revenues) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateTime =
        rev.createdAt.getFullYear().toString() +
        pad(rev.createdAt.getMonth() + 1) +
        pad(rev.createdAt.getDate()) +
        pad(rev.createdAt.getHours()) +
        pad(rev.createdAt.getMinutes()) +
        pad(rev.createdAt.getSeconds());

      const revenueId = `${req.bookingCode}-${dateTime}-${rowNum}`;

      try {
        await prisma.revenue.update({
          where: { id: rev.id },
          data: { revenueId },
        });
        processed++;
      } catch {
        // Conflict - add random suffix
        const newId = `${req.bookingCode}-${dateTime}-${rowNum}-${Math.random().toString(36).substring(2, 4)}`;
        try {
          await prisma.revenue.update({
            where: { id: rev.id },
            data: { revenueId: newId },
          });
          processed++;
        } catch {
          console.log(`Skipping revenue ${rev.id} - ID conflict`);
          skipped++;
        }
      }

      rowNum++;
    }

    if (processed % 100 === 0 && processed > 0) {
      console.log(`Processed ${processed}/${total} revenues`);
    }
  }

  console.log(`Backfilled ${processed} revenue IDs (${skipped} skipped - no booking code)`);
  return { backfilled: processed, total, skipped };
}

async function showStats() {
  console.log('\n=== ID Stats ===');

  // Requests
  const reqTotal = await prisma.request.count();
  const reqWithId = await prisma.request.count({ where: { requestId: { not: null } } });
  console.log(`Requests: ${reqWithId}/${reqTotal} have requestId`);

  // Operators
  const opTotal = await prisma.operator.count();
  const opWithId = await prisma.operator.count({ where: { serviceId: { not: null } } });
  console.log(`Operators: ${opWithId}/${opTotal} have serviceId`);

  // Revenues
  const revTotal = await prisma.revenue.count();
  const revWithId = await prisma.revenue.count({ where: { revenueId: { not: null } } });
  console.log(`Revenues: ${revWithId}/${revTotal} have revenueId`);
}

async function main() {
  console.log('=== ID Backfill Script ===\n');
  console.log('Starting ID backfill...\n');

  try {
    // Show before stats
    await showStats();
    console.log('\n');

    const reqResult = await backfillRequestIds();
    console.log();
    const opResult = await backfillServiceIds();
    console.log();
    const revResult = await backfillRevenueIds();

    // Show after stats
    await showStats();

    console.log('\n=== Summary ===');
    console.log(`Requests backfilled: ${reqResult.backfilled}/${reqResult.total}`);
    console.log(`Operators backfilled: ${opResult.backfilled}/${opResult.total} (${opResult.skipped} skipped)`);
    console.log(`Revenues backfilled: ${revResult.backfilled}/${revResult.total} (${revResult.skipped} skipped)`);
    console.log('\nBackfill completed successfully!');
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
