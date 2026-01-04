# Request Module Design - Brainstorm Report

**Date:** 2026-01-04
**Status:** Approved for implementation

---

## Problem Statement

Request module needs full implementation with:
- Complex status workflow (14 statuses in 4 stages)
- Auto-generated IDs (RQID + Booking CODE)
- Follow-up reminder system
- Auto-generation of Operator when Booking
- Multi-seller permissions
- Config-driven behavior

---

## Agreed Design

### 1. Status Workflow (Grouped into Stages)

```
STAGE 1: LEAD
├── DANG_LL_CHUA_TL     (Đang LL - chưa trả lời)
├── DANG_LL_DA_TL       (Đang LL - đã trả lời)

STAGE 2: QUOTE
├── DA_BAO_GIA          (Đã báo giá)
├── DANG_XAY_TOUR       (Đang xây Tour)

STAGE 3: FOLLOWUP
├── F1                  (Follow-up 1)
├── F2                  (Follow-up 2)
├── F3                  (Follow-up 3)
├── F4                  (Lần cuối)

STAGE 4: OUTCOME
├── BOOKING             ✓ (Confirmed - generates code + operators)
├── KHACH_HOAN          (Khách hoãn)
├── KHACH_SUY_NGHI      (Đang suy nghĩ)
├── KHONG_DU_TC         (Không đủ tiêu chuẩn)
├── DA_KET_THUC         (Đã kết thúc)
└── CANCEL              (Cancel)
```

### 2. ID Generation

| ID Type | Format | Example |
|---------|--------|---------|
| RQID | `RQ-{YYMMDD}-{4seq}` | RQ-260104-0001 |
| Booking CODE | `{YYYYMMDD}{SellerCode}{4seq}` | 20260201L0005 |

### 3. Auto-Fill Logic

| Trigger | Auto-Fill |
|---------|-----------|
| Create request | `receivedDate = today` |
| Set startDate + tourDays | `endDate = startDate + tourDays` |
| Status → BOOKING | Generate bookingCode, create Operator |

### 4. New Config Tables

```prisma
model ConfigFollowUp {
  id          String   @id @default(cuid())
  stage       String   @unique // F1, F2, F3, F4
  daysToWait  Int      // 2, 5, 7, 10
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("config_follow_up")
}

model ConfigUser {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  sellerCode  String   // Single char: L, N, T
  canViewAll  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("config_user")
}
```

### 5. Request Schema Updates

```prisma
model Request {
  // Existing fields...

  // New fields
  rqid          String    @unique  // RQ-YYMMDD-0001
  stage         String    @default("LEAD")  // LEAD, QUOTE, FOLLOWUP, OUTCOME
  status        String    @default("DANG_LL_CHUA_TL")
  bookingCode   String?   @unique  // Generated when status=BOOKING
  startDate     DateTime?
  endDate       DateTime?  // Auto-calculated: startDate + tourDays
  receivedDate  DateTime  @default(now())
  lastContactDate DateTime?
  nextFollowUp  DateTime?  // Calculated from ConfigFollowUp

  @@index([stage])
  @@index([bookingCode])
}
```

### 6. Follow-Up Reminder System

**Calculation:**
```
nextFollowUp = lastContactDate + ConfigFollowUp.daysToWait[currentStage]
```

**Dashboard Widget:**
- 🔴 Overdue (past nextFollowUp)
- 🟡 Today
- 🟢 Upcoming (next 3 days)

No automation - manual control with visual indicators only.

### 7. Booking → Operator Generation

When `status = BOOKING`:
1. Generate `bookingCode` using seller's code from ConfigUser
2. Create initial Operator entry with request data
3. Lock request from further status changes (optional)

### 8. Multi-Seller Permissions

| Role | View | Edit |
|------|------|------|
| Seller | Own only | Own only |
| Manager | All | All |
| Admin | All | All + Config |

Default filter: `sellerId = currentUser.id` unless `canViewAll = true`

### 9. Validation Warnings

Non-blocking warnings for:
- Missing customerName
- Missing pax
- Missing source
- Missing status selection

### 10. AI Input (Deferred to Phase 2)

Skip for MVP. Future: Parse natural language to auto-fill form fields.

---

## Implementation Phases

| Phase | Scope | Est. Effort |
|-------|-------|-------------|
| 1 | Schema updates (Prisma) | 0.5 day |
| 2 | Config tables + seed data | 0.5 day |
| 3 | API routes update | 1 day |
| 4 | UI pages (list, create, detail) | 2 days |
| 5 | Auto-fill logic | 0.5 day |
| 6 | Booking → Operator generation | 0.5 day |
| 7 | Follow-up dashboard widget | 0.5 day |
| 8 | Multi-seller permissions | 0.5 day |

**Total:** ~6 days

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex status transitions | Medium | Validate transitions in API |
| Booking code collision | Low | Use DB sequence + unique constraint |
| Permission leaks | High | Test thoroughly, default to restrictive |

---

## Success Metrics

- [ ] All 14 statuses accessible in UI
- [ ] Booking code generates correctly
- [ ] Operator auto-created on Booking
- [ ] Follow-up widget shows overdue items
- [ ] Sellers see only own requests

---

## Next Steps

1. Create detailed implementation plan
2. Update Prisma schema
3. Migrate database
4. Build UI components
5. Test end-to-end workflow
