# Phase 2: API Routes

**Parent Plan:** [plan.md](./plan.md)
**Dependencies:** [Phase 1](./phase-01-schema-models.md)
**Status:** 🔲 PENDING
**Effort:** 1.5h
**Priority:** P0

---

## Overview

Create REST API endpoints for Seller and FollowUpStatus CRUD operations.

---

## Requirements

1. Seller API: GET list, POST create, PUT update, DELETE
2. FollowUpStatus API: GET list, POST create, PUT update, DELETE
3. Reorder API: PUT batch update sortOrder
4. Validation with Zod schemas
5. Vietnamese error messages

---

## Architecture

### API Route Structure
```
src/app/api/config/
├── sellers/
│   ├── route.ts              # GET (list with pagination), POST (create)
│   └── [id]/route.ts         # GET, PUT, DELETE
└── follow-up-statuses/
    ├── route.ts              # GET (list by sortOrder), POST (create)
    ├── [id]/route.ts         # GET, PUT, DELETE
    └── reorder/route.ts      # PUT (batch sortOrder update)
```

---

## Related Files

| File | Action |
|------|--------|
| `src/lib/validations/config-validation.ts` | CREATE |
| `src/app/api/config/sellers/route.ts` | CREATE |
| `src/app/api/config/sellers/[id]/route.ts` | CREATE |
| `src/app/api/config/follow-up-statuses/route.ts` | CREATE |
| `src/app/api/config/follow-up-statuses/[id]/route.ts` | CREATE |
| `src/app/api/config/follow-up-statuses/reorder/route.ts` | CREATE |
| `src/types/index.ts` | UPDATE (add types) |

---

## Implementation Steps

### Step 1: Create Validation Schemas

`src/lib/validations/config-validation.ts`:
```typescript
import { z } from 'zod';

export const sellerSchema = z.object({
  telegramId: z.string().min(1, 'Telegram ID không được trống'),
  sellerName: z.string().min(1, 'Tên seller không được trống'),
  sheetName: z.string().min(1, 'Tên sheet không được trống'),
  metaName: z.string().optional(),
  email: z.string().email('Email không hợp lệ'),
  gender: z.enum(['MALE', 'FEMALE'], { message: 'Giới tính không hợp lệ' }),
  sellerCode: z.string().min(1).max(2, 'Mã seller tối đa 2 ký tự'),
  isActive: z.boolean().optional().default(true),
});

export const followUpStatusSchema = z.object({
  status: z.string().min(1, 'Tên trạng thái không được trống'),
  aliases: z.array(z.string()).default([]),
  daysToFollowup: z.number().int().min(0, 'Số ngày phải >= 0'),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true),
});

export const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int().min(0),
  })).min(1, 'Cần ít nhất 1 item'),
});

export type SellerFormData = z.infer<typeof sellerSchema>;
export type FollowUpStatusFormData = z.infer<typeof followUpStatusSchema>;
export type ReorderData = z.infer<typeof reorderSchema>;
```

### Step 2: Seller API Routes

**GET /api/config/sellers** - List with pagination
```typescript
// Query params: page, limit, search, isActive
// Response: { success, data: Seller[], total, hasMore }
```

**POST /api/config/sellers** - Create
```typescript
// Body: SellerFormData
// Validate telegramId unique
// Response: { success, data: Seller }
```

**GET /api/config/sellers/[id]** - Get single
**PUT /api/config/sellers/[id]** - Update
**DELETE /api/config/sellers/[id]** - Delete

### Step 3: FollowUpStatus API Routes

**GET /api/config/follow-up-statuses** - List by sortOrder
```typescript
// Query params: isActive
// Response: { success, data: FollowUpStatus[] }
```

**POST /api/config/follow-up-statuses** - Create
```typescript
// Body: FollowUpStatusFormData
// Auto-assign sortOrder = max + 1
// Response: { success, data: FollowUpStatus }
```

**PUT /api/config/follow-up-statuses/reorder** - Batch update
```typescript
// Body: { items: [{ id, sortOrder }] }
// Transaction update all sortOrders
// Response: { success, data: FollowUpStatus[] }
```

### Step 4: Add Types

Add to `src/types/index.ts`:
```typescript
export interface Seller {
  id: string;
  telegramId: string;
  sellerName: string;
  sheetName: string;
  metaName: string | null;
  email: string;
  gender: 'MALE' | 'FEMALE';
  sellerCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpStatus {
  id: string;
  status: string;
  aliases: string[];
  daysToFollowup: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Response Patterns

Follow existing codebase patterns:

```typescript
// Success
{ success: true, data: T }

// Success with pagination
{ success: true, data: T[], total: number, hasMore: boolean }

// Error
{ success: false, error: string }
```

---

## Todo List

- [ ] Create config-validation.ts with Zod schemas
- [ ] Create /api/config/sellers/route.ts (GET, POST)
- [ ] Create /api/config/sellers/[id]/route.ts (GET, PUT, DELETE)
- [ ] Create /api/config/follow-up-statuses/route.ts (GET, POST)
- [ ] Create /api/config/follow-up-statuses/[id]/route.ts (GET, PUT, DELETE)
- [ ] Create /api/config/follow-up-statuses/reorder/route.ts (PUT)
- [ ] Update src/types/index.ts with new types
- [ ] Test all endpoints với Postman/curl

---

## Success Criteria

- [ ] All CRUD operations work correctly
- [ ] telegramId unique constraint enforced
- [ ] Email validation works
- [ ] Reorder updates all sortOrders atomically
- [ ] Vietnamese error messages display

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Race condition on reorder | Use Prisma transaction |
| telegramId collision | Validate before create/update |

---

## Next Steps

After completion, proceed to [Phase 3: Seller UI](./phase-03-seller-ui.md)
