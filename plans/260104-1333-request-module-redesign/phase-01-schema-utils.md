# Phase 1: Schema & Utils Update

**Status:** ✅ DONE (2026-01-04)
**Estimated Effort:** Small
**Completed:** 2026-01-04
**Review Report:** `plans/reports/code-reviewer-260104-1404-phase1-schema-utils.md`

---

## Objectives

1. Add `sellerName` field to ConfigUser
2. Update booking code generation with fallback logic
3. Run migration

---

## Tasks

### Task 1.1: Update Prisma Schema

**File:** `prisma/schema.prisma`

**Change:**
```prisma
model ConfigUser {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  sellerCode  String?  // Make optional, fallback to name initial
  sellerName  String?  // Display name for reports/UI
  canViewAll  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("config_user")
}
```

**Notes:**
- Change `sellerCode String` to `sellerCode String?` (make optional)
- Add `sellerName String?` field

---

### Task 1.2: Generate Migration

**Command:**
```bash
npx prisma migrate dev --name add-seller-name-to-config-user
```

---

### Task 1.3: Update Booking Code Generation

**File:** `src/lib/request-utils.ts`

**Current Function:**
```typescript
export async function generateBookingCode(
  startDate: Date,
  sellerCode: string
): Promise<string> {
  // ...
}
```

**Updated Function:**
```typescript
/**
 * Generate Booking Code: YYYYMMDD + SellerCode + Seq
 * Example: 20260201L0005
 *
 * Fallback: If no sellerCode, use first letter of seller name
 */
export async function generateBookingCode(
  startDate: Date,
  sellerId: string
): Promise<string> {
  // Get seller code or fallback to name initial
  const config = await prisma.configUser.findUnique({
    where: { userId: sellerId },
    include: { user: { select: { name: true } } },
  });

  let code: string;

  if (config?.sellerCode) {
    code = config.sellerCode;
  } else if (config?.user?.name) {
    // Fallback: first letter of name, uppercase
    code = config.user.name.charAt(0).toUpperCase();
  } else {
    // Ultimate fallback
    code = 'X';
  }

  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const day = String(startDate.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `${dateStr}${code}`;

  // Get max sequence for this prefix
  const existing = await prisma.request.findMany({
    where: { bookingCode: { startsWith: prefix } },
    orderBy: { bookingCode: 'desc' },
    take: 1,
    select: { bookingCode: true },
  });

  let seq = 1;
  if (existing.length > 0 && existing[0].bookingCode) {
    const lastSeq = parseInt(existing[0].bookingCode.slice(-4), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}
```

---

### Task 1.4: Update API Call Sites

**File:** `src/app/api/requests/[id]/route.ts`

When transitioning to BOOKING status, update the call:
```typescript
// Before
const bookingCode = await generateBookingCode(startDate, sellerCode);

// After
const bookingCode = await generateBookingCode(startDate, request.sellerId);
```

---

## Acceptance Criteria

- [x] `sellerCode` is optional in ConfigUser ✅
- [x] `sellerName` field exists in ConfigUser ✅
- [x] Migration runs successfully ✅
- [x] Booking code generation works with: ✅
  - [x] Explicit sellerCode → uses that ✅
  - [x] No sellerCode but has name → uses first letter ✅
  - [x] No sellerCode, no name → uses 'X' ✅
- [x] Existing booking codes remain unchanged ✅

**Test Results:** 228/228 tests passing (all critical issues resolved)
**Build Status:** ✅ Success (0 critical issues)

---

## Code Review Summary

**Critical Issues:** 0 ✅
**High Priority:** 0 ✅
**Medium Priority:** 3 ⚠️
1. Migration not committed to repo
2. Removed ConfigUser validation (acceptable trade-off)
3. Missing database transaction (race condition risk)

**Recommendation:** ✅ Approve for Phase 2 after migration committed

See detailed review: `plans/reports/code-reviewer-260104-1404-phase1-schema-utils.md`
