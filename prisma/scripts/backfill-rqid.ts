/**
 * Backfill RQID for existing requests
 * Run: npx tsx prisma/scripts/backfill-rqid.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function backfillRqid() {
  console.log('Starting RQID backfill...');

  const requests = await prisma.request.findMany({
    where: { rqid: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true },
  });

  console.log(`Found ${requests.length} requests without RQID`);

  // Group by date for sequential numbering
  const byDate = new Map<string, typeof requests>();

  for (const req of requests) {
    const year = String(req.createdAt.getFullYear()).slice(-2);
    const month = String(req.createdAt.getMonth() + 1).padStart(2, '0');
    const day = String(req.createdAt.getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(req);
  }

  let updated = 0;

  for (const [dateStr, dateRequests] of byDate) {
    // Get existing count for this date
    const prefix = `RQ-${dateStr}-`;
    const existingCount = await prisma.request.count({
      where: { rqid: { startsWith: prefix } },
    });

    let seq = existingCount;

    for (const req of dateRequests) {
      seq++;
      const rqid = `${prefix}${String(seq).padStart(4, '0')}`;

      await prisma.request.update({
        where: { id: req.id },
        data: { rqid },
      });

      console.log(`Updated ${req.id} → ${rqid}`);
      updated++;
    }
  }

  console.log(`\nBackfill complete. Updated ${updated} requests.`);
}

backfillRqid()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
