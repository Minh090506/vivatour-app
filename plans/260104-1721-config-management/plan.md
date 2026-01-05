---
title: "Config Management Module"
description: "Implement Seller and Follow-up Status management with Settings page"
status: pending
priority: P1
effort: 6h
branch: master
tags: [config, seller, follow-up, settings, dnd-kit]
created: 2026-01-04
---

# Config Management Module - Implementation Plan

**Created:** 2026-01-04
**Session:** 260104-1721
**Status:** 🔲 PENDING

---

## Overview

Implement comprehensive Config Management with 2 parts:
1. **Seller Management** - Independent seller model (telegramId as primary identifier)
2. **Follow-up Status Management** - Status-based with aliases and drag-drop sortOrder

### User Decisions
| Aspect | Decision |
|--------|----------|
| Data model | Tách riêng bảng Seller độc lập (không cần User) |
| DnD Library | @dnd-kit |
| Seed strategy | Prisma seed script |

---

## Current State Analysis

### Existing Models (to be replaced)
- `ConfigUser` - Linked to User model, limited fields
- `ConfigFollowUp` - Stage-based (F1-F4 only), no aliases

### API Routes (to be rewritten)
- `/api/config/user` → `/api/config/sellers`
- `/api/config/follow-up` → `/api/config/follow-up-statuses`

---

## Architecture

### New File Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── page.tsx              # Tab-based Settings page
│   └── api/
│       └── config/
│           ├── sellers/
│           │   ├── route.ts          # GET (list), POST (create)
│           │   └── [id]/route.ts     # GET, PUT, DELETE
│           └── follow-up-statuses/
│               ├── route.ts          # GET (list), POST (create)
│               ├── [id]/route.ts     # GET, PUT, DELETE
│               └── reorder/route.ts  # PUT (batch sortOrder)
├── components/
│   └── settings/
│       ├── index.ts
│       ├── seller-table.tsx
│       ├── seller-form-modal.tsx
│       ├── followup-status-table.tsx
│       └── followup-status-form-modal.tsx
├── lib/
│   └── validations/
│       └── config-validation.ts      # Zod schemas
└── prisma/
    ├── schema.prisma                 # New models
    └── seed.ts                       # Seed 14 statuses
```

---

## Implementation Phases

| Phase | Focus | Effort | Status |
|-------|-------|--------|--------|
| [Phase 1](./phase-01-schema-models.md) | Prisma Schema & Models | 1h | 🔲 |
| [Phase 2](./phase-02-api-routes.md) | API Routes | 1.5h | 🔲 |
| [Phase 3](./phase-03-seller-ui.md) | Seller UI Components | 1.5h | 🔲 |
| [Phase 4](./phase-04-followup-ui.md) | Follow-up Status UI (DnD) | 1.5h | 🔲 |
| [Phase 5](./phase-05-settings-page.md) | Settings Page Integration | 0.5h | 🔲 |

---

## Dependencies

### NPM Packages to Install
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Existing Dependencies (already installed)
- react-hook-form + zod (forms/validation)
- shadcn/ui components (dialog, table, tabs, badge)
- Prisma 7 (ORM)

---

## Data Models

### Seller Model (New)
```prisma
model Seller {
  id          String   @id @default(cuid())
  telegramId  String   @unique
  sellerName  String   // "Ly - Jenny"
  sheetName   String   // Google Sheet name
  metaName    String?  // Meta/Facebook name
  email       String
  gender      Gender
  sellerCode  String   // "J", "T", "V"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("sellers")
}
```

### FollowUpStatus Model (New)
```prisma
model FollowUpStatus {
  id              String   @id @default(cuid())
  status          String   @unique
  aliases         String[]
  daysToFollowup  Int
  sortOrder       Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("followup_statuses")
}
```

---

## Success Criteria

- [ ] Seller CRUD works với telegramId unique validation
- [ ] Email format validation on Seller
- [ ] FollowUpStatus CRUD với 14 seeded statuses
- [ ] Drag & drop reorder works
- [ ] Days badge colors: 0=gray, 1-2=yellow, 3+=red
- [ ] Settings page với 2 tabs functional
- [ ] Build passes với no TypeScript errors

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Old ConfigUser still referenced | Medium | Keep old models, update references gradually |
| @dnd-kit conflicts | Low | Well-tested library, React 19 compatible |
| Seed script fails | Low | Idempotent upsert approach |
