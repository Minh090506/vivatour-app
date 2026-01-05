# Phase 1: Prisma Schema & Models

**Parent Plan:** [plan.md](./plan.md)
**Status:** ✅ COMPLETED
**Effort:** 1h
**Priority:** P0

---

## Overview

Create new Prisma models for Seller and FollowUpStatus, plus seed script.

---

## Requirements

1. Create `Seller` model (independent, no User relation)
2. Create `FollowUpStatus` model with aliases array
3. Create `Gender` enum
4. Write seed script for 14 statuses
5. Run migration

---

## Architecture

### Seller Model
```prisma
enum Gender {
  MALE
  FEMALE
}

model Seller {
  id          String   @id @default(cuid())
  telegramId  String   @unique
  sellerName  String   // "Ly - Jenny", "Tu - Tony"
  sheetName   String   // Google Sheet name
  metaName    String?  // Meta/Facebook name (optional)
  email       String
  gender      Gender
  sellerCode  String   // "J", "T", "V", "K", "L"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([telegramId])
  @@index([sellerCode])
  @@index([isActive])
  @@map("sellers")
}
```

### FollowUpStatus Model
```prisma
model FollowUpStatus {
  id              String   @id @default(cuid())
  status          String   @unique // "Đang LL - khách chưa trả lời"
  aliases         String[] // ["mới", "new", "moi", "chưa trả lời"]
  daysToFollowup  Int      // 0, 1, 2, 5, 6, 12
  sortOrder       Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([sortOrder])
  @@index([isActive])
  @@map("followup_statuses")
}
```

---

## Related Files

| File | Action |
|------|--------|
| `prisma/schema.prisma` | ADD models |
| `prisma/seed.ts` | CREATE |
| `package.json` | ADD seed script |

---

## Implementation Steps

### Step 1: Update Schema
Add to `prisma/schema.prisma`:
- Gender enum
- Seller model
- FollowUpStatus model

### Step 2: Create Seed Script
Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
  console.log('Seeding FollowUpStatus...');

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

  console.log('Seeded 14 follow-up statuses');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 3: Update package.json
Add to `package.json`:
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

### Step 4: Run Migration
```bash
npx prisma db push
npx prisma db seed
npx prisma generate
```

---

## Todo List

- [x] Add Gender enum to schema
- [x] Add Seller model to schema
- [x] Add FollowUpStatus model to schema
- [x] Create prisma/seed.ts
- [x] Update package.json with seed script
- [x] Run prisma db push
- [x] Run prisma db seed
- [x] Verify in Prisma Studio

---

## Success Criteria

- [x] `npx prisma db push` runs without errors
- [x] `npx prisma db seed` creates 14 statuses
- [x] Prisma Studio shows new tables
- [x] `npx prisma generate` updates client types

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Migration conflicts | Use `db push` for dev, proper migration for prod |
| Seed duplicates | Use `upsert` with unique status |

---

## Next Steps

After completion, proceed to [Phase 2: API Routes](./phase-02-api-routes.md)
