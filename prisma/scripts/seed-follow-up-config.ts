/**
 * Seed ConfigFollowUp with default values
 * Run: npx tsx prisma/scripts/seed-follow-up-config.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const defaultConfigs = [
  { stage: 'F1', daysToWait: 2 },
  { stage: 'F2', daysToWait: 5 },
  { stage: 'F3', daysToWait: 7 },
  { stage: 'F4', daysToWait: 10 },
];

async function seedFollowUpConfig() {
  console.log('Seeding ConfigFollowUp...');

  for (const config of defaultConfigs) {
    const result = await prisma.configFollowUp.upsert({
      where: { stage: config.stage },
      update: { daysToWait: config.daysToWait },
      create: { stage: config.stage, daysToWait: config.daysToWait, isActive: true },
    });

    console.log(`Upserted: ${result.stage} → ${result.daysToWait} days`);
  }

  console.log('\nSeed complete.');
}

seedFollowUpConfig()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
