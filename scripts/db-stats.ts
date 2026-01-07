import { prisma } from '../src/lib/db';

async function main() {
  // 1. Total records
  const total = await prisma.request.count();
  console.log('1. Total records:', total);

  // 2. Records with RQ- prefix (leads)
  const leads = await prisma.request.count({
    where: { rqid: { startsWith: 'RQ-' } }
  });
  console.log('2. Records with RQ- prefix (leads):', leads);

  // 3. Records without RQ- prefix or null
  const noRqid = await prisma.request.count({
    where: { rqid: null }
  });
  const otherRqid = await prisma.request.count({
    where: {
      rqid: { not: null },
      NOT: { rqid: { startsWith: 'RQ-' } }
    }
  });
  console.log('3. Records without RQ- prefix:', noRqid + otherRqid, '(null:', noRqid, ', other:', otherRqid, ')');

  // 4. Latest 10 records
  const latest = await prisma.request.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('\n4. Latest 10 records:');
  latest.forEach((r, i) => {
    console.log(`  ${i+1}. code=${r.code}, rqid=${r.rqid}, bookingCode=${r.bookingCode}, customer=${r.customerName}, status=${r.status}, stage=${r.stage}`);
  });

  // 5. Stage breakdown
  const byStage = await prisma.request.groupBy({
    by: ['stage'],
    _count: true
  });
  console.log('\n5. Records by stage:');
  byStage.forEach(s => console.log(`  ${s.stage}: ${s._count}`));

  // 6. Status breakdown
  const byStatus = await prisma.request.groupBy({
    by: ['status'],
    _count: true,
    orderBy: { _count: { status: 'desc' } }
  });
  console.log('\n6. Records by status (top 10):');
  byStatus.slice(0, 10).forEach(s => console.log(`  ${s.status}: ${s._count}`));
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
