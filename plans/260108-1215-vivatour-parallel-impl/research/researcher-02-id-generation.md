# VivaTour ID Generation & Schema Migration Research

**Date:** 2026-01-08 | **Research ID:** researcher-02-id-generation
**Focus:** Current ID patterns, RequestID/BookingCode/ServiceID/RevenueID implementation requirements

---

## Executive Summary

VivaTour currently uses **cuid()** for all IDs and **manual booking code generation** with legacy RQID support. New implementation requires custom ID formats for Request, Booking, Service, and Revenue tracking. Diacritics removal utility exists in supplier code. No migration history found—schema uses db push pattern. Unique constraints already in place on Request.code.

**Key Finding:** Implementation requires new fields + indices on Request/Operator/Revenue models.

---

## 1. Current ID Patterns

### 1.1 Primary ID Generation

| Entity | Current Pattern | Location | Notes |
|--------|-----------------|----------|-------|
| User | `cuid()` | schema.prisma:18 | @id @default(cuid()) |
| Request | `cuid()` | schema.prisma:54 | @id @default(cuid()) |
| Operator | `cuid()` | schema.prisma:120 | @id @default(cuid()) |
| Revenue | `cuid()` | schema.prisma:196 | @id @default(cuid()) |
| Supplier | `cuid()` | schema.prisma:337 | @id @default(cuid()) |
| OperatorHistory | `cuid()` | schema.prisma:178 | @id @default(cuid()) |

**Pattern:** Crypto-secure, 24-char unique identifiers. Works well for distributed systems.

### 1.2 Request Code Field

```typescript
// File: src/lib/sheet-mappers.ts:252-253
code: requestId.trim(),  // Use Request ID as unique sync key
bookingCode: bookingCode?.trim() || null,  // For Operator/Revenue linking
```

**Current State:**
- `Request.code` is **unique** sync key from Google Sheets column AR
- **Unique constraint** exists: `@unique` (schema.prisma:55)
- Used for **Google Sheets sync** and request lookup
- Non-nullable in database but nullable on reads (`String?`)

**File References:**
- Schema definition: `prisma/schema.prisma:53-113`
- Mapper function: `src/lib/sheet-mappers.ts:191-271`
- API route: `src/app/api/requests/route.ts:6-92`

---

## 2. Booking Code Implementation

### 2.1 Current Generation Function

**File:** `src/lib/request-utils.ts:40-84`

```typescript
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
    code = config.sellerCode;  // From ConfigUser.sellerCode
  } else if (config?.user?.name) {
    code = config.user.name.charAt(0).toUpperCase();  // Name initial fallback
  } else {
    code = 'X';  // Ultimate fallback
  }

  // Format: YYYYMMDD + SellerCode + Sequence (4 digits)
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
  if (existing.length > 0) {
    const lastSeq = parseInt(existing[0].bookingCode.slice(-4), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}
```

**Current Format:** `YYYYMMDDS####` (12 chars)
- YYYY: Full year
- MM: Month (01-12)
- DD: Day (01-31)
- S: Seller code (1-2 chars, fallback to first letter of name)
- ####: Sequential counter (0001-9999)

**Usage:**
- Created but **NOT automatically assigned** in request creation
- Manually assigned in operator/revenue linking via `bookingCode` field
- Can be **null** (schema:57 allows `String?`)

### 2.2 ConfigUser Seller Code

**File:** `prisma/schema.prisma:413-424`

```prisma
model ConfigUser {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  sellerCode  String?  // L, N, T (single char for booking code) - optional
  sellerName  String?  // Display name
  canViewAll  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("config_user")
}
```

**Current:** 1-2 character codes stored in ConfigUser table. Optional field.

---

## 3. Vietnamese Diacritics Removal

### 3.1 Existing Implementation

**File:** `src/config/supplier-config.ts:100-121`

```typescript
function removeDiacritics(str: string): string {
  const diacriticsMap: Record<string, string> = {
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    'Đ': 'D',
  };
  return str.split('').map(char => diacriticsMap[char] || char).join('');
}
```

**Coverage:** Uppercase Vietnamese characters only (A, Ă, Â, D, E, Ê, I, O, Ô, Ơ, U, Ư, Y)

**Exported For:**
- Supplier code generation (HOT-DN-ANK-0001 name prefix)
- Could be reused for RequestID generation

**Issue:** Lowercase diacritics not mapped. For RequestID generation, **need lowercase support** (user names likely mixed case).

### 3.2 Recommended Approach

**Option 1: Extend existing function** (preferred—consistency)
- Add lowercase diacritic mappings
- Export to `src/lib/id-utils.ts`
- Reuse in RequestID generation

**Option 2: Use native String.normalize()**
- JavaScript native: `str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`
- Simpler, standard approach
- Already used in some frameworks

**Recommendation:** Extend existing approach for consistency with supplier code pattern.

---

## 4. New ID Fields Requirements

### 4.1 Proposed Schema Changes

**Request Model** (new/modified fields):

```prisma
model Request {
  // ... existing fields ...
  code            String    @id @default(cuid())  // ← CHANGE: current usage
  requestId       String    @unique              // ← NEW: {SalerName}{yyyyMMddHHmmssSSS}
  bookingCode     String?   @unique              // ← MODIFY: Add unique constraint

  @@index([requestId])
  @@index([bookingCode])
  // ... rest ...
}
```

**Operator Model** (new fields):

```prisma
model Operator {
  // ... existing fields ...
  serviceId       String    @unique              // ← NEW: {BookingCode}-{yyyyMMddHHmmssSSS}

  @@index([serviceId])
  // ... rest ...
}
```

**Revenue Model** (new fields):

```prisma
model Revenue {
  // ... existing fields ...
  revenueId       String    @unique              // ← NEW: {BookingCode}-{yyyyMMddHHmmss}-{rowNum}

  @@index([revenueId])
  // ... rest ...
}
```

**Issue:** Current `Request.code` is unique for sync. Proposed `requestId` creates **duplicate unique constraint**. Need clarification:
- Keep `code` for sync, add `requestId` as business ID?
- Or replace `code` with new `requestId` pattern?

---

## 5. Unique Constraints & Index Strategy

### 5.1 Current Indices

**Request:**
```prisma
@@index([status])
@@index([stage])
@@index([sellerId])
@@index([sellerId, stage])
@@index([bookingCode])
@@index([nextFollowUp])
```

**Operator:**
```prisma
@@index([requestId])
@@index([serviceDate])
@@index([paymentStatus])
@@index([supplierId])
```

**Revenue:**
```prisma
@@index([requestId])
@@index([paymentDate])
```

### 5.2 New Index Requirements

For new IDs, recommend:

| Field | Entity | Type | Reason |
|-------|--------|------|--------|
| requestId | Request | @unique | Business key, search |
| bookingCode | Request | @unique | Link Operator/Revenue, reporting |
| serviceId | Operator | @unique | Audit trail, reporting |
| revenueId | Revenue | @unique | Financial tracking, reporting |

**Index additions:**
- `Request`: `@@index([requestId])` - Already proposed as @unique
- `Operator`: `@@index([serviceId])` - Already proposed as @unique
- `Revenue`: `@@index([revenueId])` - Already proposed as @unique

**Constraint handling:**
- Unique fields auto-indexed by PostgreSQL
- Composite keys (ServiceID = BookingCode + timestamp) prevent duplicates naturally
- No race condition risk with timestamp precision (milliseconds)

---

## 6. Schema Migration Strategy

### 6.1 Current Migration Pattern

**Used:** Prisma `db push` (not migrations folder)
- No migration history tracked
- Direct schema → database synchronization
- Good for MVP, problematic for data transformation

**Files:**
- Schema: `prisma/schema.prisma`
- No migration files found
- Supabase manages some schema logic

### 6.2 Recommended Migration Path

**Phase 1: Add New Fields (Backward compatible)**
```prisma
// 1. Add requestId, bookingCode @unique, serviceId, revenueId
// 2. All nullable initially
// 3. Populate via script/migration
```

**Phase 2: Migration Script**
```typescript
// populateNewIds.ts
// For each Request: generate requestId = {sellerName}{yyyyMMddHHmmssSSS}
// For each Operator: generate serviceId = {bookingCode}-{yyyyMMddHHmmssSSS}
// For each Revenue: generate revenueId = {bookingCode}-{yyyyMMddHHmmss}-{rowNum}
```

**Phase 3: Make Fields Non-Nullable**
```prisma
// Once all records populated, add @default or require
// Deploy with backfill complete
```

### 6.3 Data Integrity Considerations

**Race Conditions:**
- Timestamp-based IDs (milliseconds) sufficient for single-server
- For distributed sync: add sequence counter (like current booking code)
- Millisecond precision = 1000 IDs per second max

**Backward Compatibility:**
- Keep `Request.code` for Google Sheets sync
- Add `requestId` as business-facing ID
- Both unique, no conflict

**Rollback Strategy:**
- New fields nullable → can revert without data loss
- Keep generation logic separate from core
- Test with shadow traffic first

---

## 7. Timestamp Precision Analysis

### 7.1 Format Requirements

**RequestID:** `{SalerName}{yyyyMMddHHmmssSSS}`
- Example: `LY20260108123045123` (19 chars max with name)
- Precision: **milliseconds** (SSS = 000-999)
- Max IDs/second: 1,000

**ServiceID:** `{BookingCode}-{yyyyMMddHHmmssSSS}`
- Example: `20260108L0001-20260108123045123` (31 chars)
- Precision: **milliseconds**
- Max IDs/second: 1,000 per booking

**RevenueID:** `{BookingCode}-{yyyyMMddHHmmss}-{rowNum}`
- Example: `20260108L0001-20260108123045-1` (30 chars)
- Precision: **seconds** (no milliseconds)
- Max IDs/second: 1 per booking per second

### 7.2 Concurrency Risk

**Scenario:** Multiple revenues same booking, same second
- Format allows: `-{rowNum}` suffix (1, 2, 3...)
- Need sequence counter per booking per second
- Database-level uniqueness constraint handles this

**Implementation:**
```typescript
// For RevenueID generation:
const timestamp = format(now, 'yyyyMMddHHmmss');
const bookingPrefix = `${bookingCode}-${timestamp}`;

// Get max rowNum for this prefix today
const existing = await prisma.revenue.findMany({
  where: { revenueId: { startsWith: bookingPrefix } },
  select: { revenueId: true },
});

const rowNum = existing.length + 1;
const revenueId = `${bookingPrefix}-${rowNum}`;
```

---

## 8. Database Sequences vs Application Logic

### 8.1 Current Approach (VivaTour)

**Application-level sequences** in `generateBookingCode()`:
```typescript
const existing = await prisma.request.findMany({
  where: { bookingCode: { startsWith: prefix } },
  orderBy: { bookingCode: 'desc' },
  take: 1,
});

let seq = 1;
if (existing.length > 0) {
  const lastSeq = parseInt(existing[0].bookingCode.slice(-4), 10);
  seq = lastSeq + 1;
}
```

**Pros:** Simple, works for single-server, no DB overhead
**Cons:** Race condition if concurrent requests, not atomic

### 8.2 Recommended for New IDs

**Keep application logic but add safeguards:**

```typescript
async function generateRequestId(
  sellerName: string,
  timestamp: string  // yyyyMMddHHmmssSSS
): Promise<string> {
  // Remove diacritics from seller name
  const cleanName = removeDiacritics(sellerName)
    .toUpperCase()
    .replace(/\s+/g, '');

  const requestId = `${cleanName}${timestamp}`;

  // Verify uniqueness (catch duplicates)
  const existing = await prisma.request.findUnique({
    where: { requestId },
  });

  if (existing) {
    throw new Error(`RequestID collision: ${requestId}`);
  }

  return requestId;
}
```

**Why:** Millisecond precision + collision detection sufficient for typical load.

---

## 9. API Route Changes Required

### 9.1 Request Creation (`src/app/api/requests/route.ts`)

**Current:**
```typescript
// Line 107-113: Legacy code generation
const code = `${dateStr}-${namePart}-${countryPart}-${randomSuffix}`;
const rqid = await generateRQID();
```

**Needed Changes:**
1. Auto-generate `requestId` on create
2. Auto-generate `bookingCode` on create (or on first operator?)
3. Update response to include new IDs
4. Pass `requestId` to operator/revenue for linking

### 9.2 Operator Creation (`src/app/api/operators/route.ts`)

**Current:** No booking code handling
**Needed:**
1. Accept `bookingCode` from request
2. Generate `serviceId` on create
3. Store `serviceId` for reporting

### 9.3 Revenue Creation (`src/app/api/revenues/route.ts`)

**Current:** Has `revenueId` field but not populated (schema:197)
**Needed:**
1. Generate `revenueId` on create
2. Handle same-second collisions (rowNum suffix)
3. Store for financial audits

---

## 10. File Structure for ID Generation

### 10.1 Current Structure

```
src/lib/
├── db.ts                    # Prisma singleton
├── request-utils.ts         # generateRQID(), generateBookingCode()
├── operator-history.ts      # Audit trail
├── sheet-mappers.ts         # Google Sheets sync
└── auth-utils.ts            # Authentication
```

### 10.2 Proposed Addition

```
src/lib/
├── id-utils.ts             # ← NEW: All ID generation functions
│   ├── generateRequestId()
│   ├── generateServiceId()
│   ├── generateRevenueId()
│   ├── removeDiacritics()   # ← MOVE from supplier-config
│   └── utils (timestamp, formatting)
└── request-utils.ts        # Keep, refactor to use id-utils
```

**Reasoning:**
- Centralize ID logic
- Remove diacritic function from config
- Single source of truth for formats
- Easy to test and audit

---

## 11. Performance Implications

### 11.1 Query Impact

**Current booking code generation:**
```typescript
await prisma.request.findMany({
  where: { bookingCode: { startsWith: prefix } },  // Index scan
  orderBy: { bookingCode: 'desc' },                 // Requires index
  take: 1,
});
```

**Cost:** O(log n) with index, reasonable for daily prefixes (max ~100K codes/day)

**New RequestID lookup:**
```typescript
await prisma.request.findUnique({
  where: { requestId },  // Unique constraint = index
});
```

**Cost:** O(1), direct lookup, negligible

### 11.2 Index Strategy

**Existing indices:**
- `Request.bookingCode` already indexed (schema:110)
- Good for filtering by booking

**New indices needed:**
- `Request.requestId` - Unique constraint creates index automatically
- `Operator.serviceId` - Unique constraint creates index
- `Revenue.revenueId` - Unique constraint creates index

**No new composite indices needed** - individual lookups sufficient.

---

## 12. Integration Points

### 12.1 Google Sheets Sync

**Current:**
- `Request.code` = Column AR (Request ID)
- Used as **unique sync key** (mapRequestRow line 253)

**Impact on New RequestID:**
- New `requestId` is **generated in-app**, not from sheets
- `code` (sync key) separate from business `requestId`
- No conflict, both unique

**Migration:**
- Sheets already provides `code` (column AR)
- No change to sync logic needed

### 12.2 Sheet Mappers

**File:** `src/lib/sheet-mappers.ts:252-254`
```typescript
return {
  code: requestId.trim(),       // Keep as sync key
  bookingCode: bookingCode?.trim() || null,  // Already mapped
  // ... rest
};
```

**Change needed:**
- Add population logic for new `requestId` field
- OR auto-generate on create if not provided

### 12.3 Operator/Revenue Linking

**Current:** Via `bookingCode` field

**Required:**
- Ensure `bookingCode` populated before creating operators
- Propagate to operators/revenues for ID generation
- API contract must pass `bookingCode` to dependent resources

---

## 13. Unique Constraint Conflicts

### 13.1 Current Issues

**Request.code** currently @unique but also used for nullable bookingCode:
```prisma
model Request {
  code            String    @unique      // Unique sync key
  bookingCode     String?                // NOT unique (schema:57)
  rqid            String?    @unique     // Legacy
}
```

**Problem if we add @unique to bookingCode:**
- Multiple requests can share booking (e.g., same group)
- Unique constraint would break this

**Solution:** Verify requirement—is bookingCode 1:1 or 1:many per request?

### 13.2 Proposed Constraint Matrix

| Field | Type | Constraint | Reason |
|-------|------|-----------|--------|
| Request.code | String | @unique | Google Sheets sync key |
| Request.requestId | String | @unique | Business ID |
| Request.bookingCode | String? | NO unique | Multiple requests share bookings |
| Operator.serviceId | String | @unique | Per-service audit |
| Revenue.revenueId | String | @unique | Per-transaction audit |

**Key:** BookingCode is **linking field**, not unique per request.

---

## 14. Test Plan Considerations

### 14.1 Unit Tests Needed

1. **Vietnamese diacritics removal**
   - Test uppercase + lowercase
   - Test with seller names (LY, NÊN, TRÍ)

2. **RequestID generation**
   - Collision detection
   - Timestamp formatting
   - Seller name normalization

3. **BookingCode generation** (existing)
   - Verify index works with new constraints
   - Sequence reset daily

4. **ServiceID/RevenueID generation**
   - Same-second collisions (rowNum)
   - Format validation

### 14.2 Integration Tests Needed

1. **Request → Operator → Revenue linking**
   - Verify bookingCode propagated
   - Verify IDs populated correctly

2. **Concurrent creates**
   - Timing edge cases
   - Race condition verification

3. **Google Sheets sync**
   - Ensure `code` still works as sync key
   - New IDs populated on import

---

## 15. Unresolved Questions

1. **BookingCode Requirement:** Is `bookingCode` meant to be 1:1 per request or 1:many (shared across multiple requests)? Current schema allows null and doesn't enforce unique.

2. **Request ID Replacement:** Should new `requestId` **replace** the current `code` for business operations, or **coexist** with it? Sync uses `code`, but business logic should prefer `requestId`.

3. **Timestamp Precision:** RevenueID uses seconds not milliseconds—is this intentional? Limits to 1 revenue per booking per second.

4. **Migration Timing:** When should new ID fields become non-nullable? Needs backfill script + deployment coordination.

5. **Seller Name Length:** RequestID format `{SalerName}{yyyyMMddHHmmssSSS}` has no length limit. Should constrain? Max Vietnamese name ≈ 50 chars → 70 char ID possible.

6. **Sequence Handling:** For RevenueID rowNum, should sequence reset daily/monthly, or increment indefinitely per booking?

---

## Key Recommendations

1. **Extract diacritics function** → `src/lib/id-utils.ts` with lowercase support
2. **Create id-utils module** with all ID generators, centralized
3. **Keep `Request.code` unique** for Sheets sync, add `requestId` as business key
4. **Don't make `bookingCode` unique** unless requirement confirms 1:1 mapping
5. **Use application-level sequences** with collision detection, no DB sequences needed
6. **Add indices automatically** via @unique constraints (PostgreSQL default)
7. **Plan phased migration:** Add fields nullable → populate → make non-nullable
8. **Update API routes** to auto-populate new IDs on create
9. **Verify Google Sheets sync** not affected by new ID fields

---

**Generated:** 2026-01-08 12:18 UTC
**Codebase:** VivaTour v0.6.x | Next.js 16 + Prisma 7 + PostgreSQL
**Status:** Ready for implementation planning
