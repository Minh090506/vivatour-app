---
phase: 1
title: "Schema & Config"
status: pending
effort: 1d
---

# Phase 1: Schema & Config

## Context

- **Parent Plan:** [plan.md](plan.md)
- **Dependencies:** None
- **Docs:** [code-standards.md](../../docs/code-standards.md), [prisma-patterns-report](research/prisma-patterns-report.md)

---

## Overview

Update Prisma schema with new Request fields, add ConfigFollowUp and ConfigUser models, create request-config.ts with status/stage constants.

---

## Requirements

### 1.1 Update Request Model (prisma/schema.prisma)

Add fields:
```prisma
model Request {
  // ... existing fields ...

  // New fields
  rqid            String    @unique
  stage           String    @default("LEAD")
  bookingCode     String?   @unique
  startDate       DateTime?
  endDate         DateTime?
  receivedDate    DateTime  @default(now())
  lastContactDate DateTime?

  // Update indexes
  @@index([stage])
  @@index([bookingCode])
  @@index([sellerId, stage])  // Compound for dashboard
}
```

### 1.2 Add ConfigFollowUp Model

```prisma
model ConfigFollowUp {
  id          String   @id @default(cuid())
  stage       String   @unique  // F1, F2, F3, F4
  daysToWait  Int
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("config_follow_up")
}
```

### 1.3 Add ConfigUser Model

```prisma
model ConfigUser {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  sellerCode  String   // L, N, T (single char)
  canViewAll  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("config_user")
}
```

Update User model to add relation:
```prisma
model User {
  // ... existing ...
  config      ConfigUser?
}
```

### 1.4 Create src/config/request-config.ts

```typescript
// Stage definitions
export const REQUEST_STAGES = {
  LEAD: { label: 'Lead', color: 'blue' },
  QUOTE: { label: 'Báo giá', color: 'purple' },
  FOLLOWUP: { label: 'Follow-up', color: 'orange' },
  OUTCOME: { label: 'Kết quả', color: 'gray' },
} as const;

// Status definitions grouped by stage
export const REQUEST_STATUSES = {
  // LEAD stage
  DANG_LL_CHUA_TL: { label: 'Đang LL - chưa trả lời', stage: 'LEAD', color: 'blue' },
  DANG_LL_DA_TL: { label: 'Đang LL - đã trả lời', stage: 'LEAD', color: 'cyan' },
  // QUOTE stage
  DA_BAO_GIA: { label: 'Đã báo giá', stage: 'QUOTE', color: 'purple' },
  DANG_XAY_TOUR: { label: 'Đang xây Tour', stage: 'QUOTE', color: 'violet' },
  // FOLLOWUP stage
  F1: { label: 'Follow-up 1', stage: 'FOLLOWUP', color: 'orange' },
  F2: { label: 'Follow-up 2', stage: 'FOLLOWUP', color: 'amber' },
  F3: { label: 'Follow-up 3', stage: 'FOLLOWUP', color: 'yellow' },
  F4: { label: 'Lần cuối', stage: 'FOLLOWUP', color: 'red' },
  // OUTCOME stage
  BOOKING: { label: 'Booking', stage: 'OUTCOME', color: 'green' },
  KHACH_HOAN: { label: 'Khách hoãn', stage: 'OUTCOME', color: 'slate' },
  KHACH_SUY_NGHI: { label: 'Đang suy nghĩ', stage: 'OUTCOME', color: 'gray' },
  KHONG_DU_TC: { label: 'Không đủ TC', stage: 'OUTCOME', color: 'rose' },
  DA_KET_THUC: { label: 'Đã kết thúc', stage: 'OUTCOME', color: 'neutral' },
  CANCEL: { label: 'Cancel', stage: 'OUTCOME', color: 'red' },
} as const;

// Type exports
export type RequestStage = keyof typeof REQUEST_STAGES;
export type RequestStatus = keyof typeof REQUEST_STATUSES;
export const REQUEST_STAGE_KEYS = Object.keys(REQUEST_STAGES) as RequestStage[];
export const REQUEST_STATUS_KEYS = Object.keys(REQUEST_STATUSES) as RequestStatus[];

// Helper: Get statuses by stage
export function getStatusesByStage(stage: RequestStage): RequestStatus[] {
  return REQUEST_STATUS_KEYS.filter(s => REQUEST_STATUSES[s].stage === stage);
}

// Helper: Get stage from status
export function getStageFromStatus(status: RequestStatus): RequestStage {
  return REQUEST_STATUSES[status].stage as RequestStage;
}
```

### 1.5 Create src/lib/request-utils.ts

```typescript
import { prisma } from '@/lib/db';

// Generate RQID: RQ-YYMMDD-0001
export async function generateRQID(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const prefix = `RQ-${dateStr}-`;

  // Get today's count
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  const count = await prisma.request.count({
    where: {
      createdAt: { gte: todayStart, lte: todayEnd }
    }
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

// Generate Booking Code: YYYYMMDD + SellerCode + Seq
export async function generateBookingCode(
  startDate: Date,
  sellerCode: string
): Promise<string> {
  const dateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `${dateStr}${sellerCode}`;

  // Get count for this seller on this date
  const count = await prisma.request.count({
    where: {
      bookingCode: { startsWith: prefix }
    }
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

// Calculate end date from start + days
export function calculateEndDate(startDate: Date, tourDays: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + tourDays - 1);
  return end;
}

// Calculate next follow-up date
export async function calculateNextFollowUp(
  stage: string,
  lastContactDate: Date
): Promise<Date | null> {
  const config = await prisma.configFollowUp.findUnique({
    where: { stage }
  });

  if (!config || !config.isActive) return null;

  const next = new Date(lastContactDate);
  next.setDate(next.getDate() + config.daysToWait);
  return next;
}
```

### 1.6 Update src/types/index.ts

Add/update types:
```typescript
// Request stages and statuses
export type RequestStage = 'LEAD' | 'QUOTE' | 'FOLLOWUP' | 'OUTCOME';
export type RequestStatus =
  | 'DANG_LL_CHUA_TL' | 'DANG_LL_DA_TL'
  | 'DA_BAO_GIA' | 'DANG_XAY_TOUR'
  | 'F1' | 'F2' | 'F3' | 'F4'
  | 'BOOKING' | 'KHACH_HOAN' | 'KHACH_SUY_NGHI' | 'KHONG_DU_TC' | 'DA_KET_THUC' | 'CANCEL';

// Update Request interface
export interface Request {
  id: string;
  rqid: string;
  code: string;
  stage: RequestStage;
  status: RequestStatus;
  bookingCode: string | null;
  customerName: string;
  contact: string;
  whatsapp: string | null;
  pax: number;
  country: string;
  source: string;
  tourDays: number | null;
  startDate: Date | null;
  endDate: Date | null;
  expectedDate: Date | null;
  expectedRevenue: number | null;
  expectedCost: number | null;
  receivedDate: Date;
  lastContactDate: Date | null;
  nextFollowUp: Date | null;
  notes: string | null;
  sellerId: string;
  seller?: User;
  createdAt: Date;
  updatedAt: Date;
}

// Config types
export interface ConfigFollowUp {
  id: string;
  stage: string;
  daysToWait: number;
  isActive: boolean;
}

export interface ConfigUser {
  id: string;
  userId: string;
  sellerCode: string;
  canViewAll: boolean;
}
```

---

## Implementation Steps

- [ ] 1.1 Update prisma/schema.prisma with Request fields
- [ ] 1.2 Add ConfigFollowUp model
- [ ] 1.3 Add ConfigUser model + User relation
- [ ] 1.4 Run `npx prisma db push`
- [ ] 1.5 Create src/config/request-config.ts
- [ ] 1.6 Create src/lib/request-utils.ts
- [ ] 1.7 Update src/types/index.ts
- [ ] 1.8 Run `npx prisma generate`
- [ ] 1.9 Seed ConfigFollowUp with default values (F1=2, F2=5, F3=7, F4=10 days)

---

## Success Criteria

- [ ] `npx prisma db push` succeeds
- [ ] `npm run build` passes
- [ ] Types exported correctly
- [ ] Config functions work in isolation

---

## Related Files

| File | Action |
|------|--------|
| prisma/schema.prisma | Modify |
| src/config/request-config.ts | Create |
| src/lib/request-utils.ts | Create |
| src/types/index.ts | Modify |
