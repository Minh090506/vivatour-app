import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('Request count:', await prisma.request.count());
  console.log('SyncLog count:', await prisma.syncLog.count({
    where: { sheetName: { in: ['Request', 'Operator', 'Revenue'] } }
  }));
}

main().finally(() => prisma.$disconnect());
