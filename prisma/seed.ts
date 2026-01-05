import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

// Prisma 7.x requires driver adapter for database connections
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FOLLOWUP_STATUSES = [
  { status: "Đang LL - khách chưa trả lời", aliases: ["mới", "new", "moi", "chưa trả lời"], daysToFollowup: 2, sortOrder: 1 },
  { status: "Đang LL - khách đã trả lời", aliases: ["đã trả lời", "replied"], daysToFollowup: 1, sortOrder: 2 },
  { status: "Đã báo giá", aliases: ["báo giá", "bao gia", "quoted", "bg"], daysToFollowup: 1, sortOrder: 3 },
  { status: "Đang xây Tour cho khách", aliases: ["xây tour", "building"], daysToFollowup: 0, sortOrder: 4 },
  { status: "Đã kết thúc", aliases: ["kết thúc", "done", "cancel", "hủy"], daysToFollowup: 0, sortOrder: 5 },
  { status: "Booking", aliases: ["booking", "booked", "đặt", "bk"], daysToFollowup: 0, sortOrder: 6 },
  { status: "Khách Hoãn", aliases: ["hoãn", "delay", "postpone"], daysToFollowup: 0, sortOrder: 7 },
  { status: "Khách đang suy nghĩ sẽ reply sau", aliases: ["suy nghĩ", "thinking"], daysToFollowup: 5, sortOrder: 8 },
  { status: "F1", aliases: ["f1", "f 1", "f-1"], daysToFollowup: 2, sortOrder: 9 },
  { status: "F2", aliases: ["f2", "f 2", "f-2"], daysToFollowup: 6, sortOrder: 10 },
  { status: "F3", aliases: ["f3", "f 3", "f-3"], daysToFollowup: 12, sortOrder: 11 },
  { status: "F4: Lần cuối", aliases: ["f4", "f 4", "f4 lần cuối"], daysToFollowup: 0, sortOrder: 12 },
  { status: "Không đủ tiêu chuẩn", aliases: ["không đủ tc", "kdtc"], daysToFollowup: 0, sortOrder: 13 },
  { status: "Cancel", aliases: ["cancel", "đã hủy"], daysToFollowup: 0, sortOrder: 14 },
];

async function seedFollowUpStatuses() {
  console.log("Seeding FollowUpStatus...");

  for (const status of FOLLOWUP_STATUSES) {
    await prisma.followUpStatus.upsert({
      where: { status: status.status },
      update: {
        aliases: status.aliases,
        daysToFollowup: status.daysToFollowup,
        sortOrder: status.sortOrder,
      },
      create: status,
    });
  }

  console.log("✓ Seeded 14 follow-up statuses");
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@vivatour.vn";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123!";

  console.log(`Seeding admin user: ${adminEmail}`);

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`✓ Admin user already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: "Administrator",
      role: "ADMIN",
    },
  });

  console.log(`✓ Admin user created: ${admin.email} (${admin.role})`);
  console.log("⚠️  Change password in production!");
}

async function main() {
  await seedFollowUpStatuses();
  await seedAdminUser();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
