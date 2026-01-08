# VivaTour Codebase Research: 3-Tier Lock System & ID Generation
**Date:** 2026-01-08 | **Status:** COMPLETE

---

## EXECUTIVE SUMMARY

**Baseline:** Single-tier lock system (Operator & Revenue) is **PARTIALLY IMPLEMENTED**. ID generation exists for Requests but **MISSING** for Operators, Revenue, and critical system IDs.

**Key Finding:** No 3-tier lock architecture exists. Current implementation is flat with basic isLocked flags.

---

## SCHEMA ANALYSIS (Prisma)

### OPERATOR MODEL - CURRENT STATE
```
✅ EXISTS:
  - isLocked (Boolean, default=false)
  - lockedAt (DateTime?)
  - lockedBy (String?)

❌ MISSING 3-TIER FIELDS:
  - lockKT (Boolean) - KT tier lock
  - lockAdmin (Boolean) - Admin approval lock
  - lockFinal (Boolean) - Final accounting lock
  - serviceId (String) - Unique identifier per operator

⚠️ CONFLICT:
  - Single boolean flag conflicts with 3-tier design
  - No audit trail for lock state transitions
```

### REVENUE MODEL - CURRENT STATE
```
✅ EXISTS:
  - isLocked (Boolean, default=false)
  - lockedAt (DateTime?)
  - lockedBy (String?)
  - revenueId (String?, @unique) - "Original ID from Sheet"

❌ MISSING:
  - No lockKT, lockAdmin, lockFinal fields
  - RevenueHistory model (NO audit trail)

⚠️ OBSERVATION:
  - revenueId field exists but not used in lock logic
  - No history tracking like OperatorHistory
```

### REQUEST MODEL - CURRENT STATE
```
✅ EXISTS:
  - requestId via `code` field (String, @unique)
  - rqid (String?, @unique) - Legacy "RQ-YYMMDD-0001"
  - bookingCode (String?) - Non-unique linking key

❌ MISSING:
  - No systematic ID generation in schema (done in utilities)
```

### MISSING MODELS
```
❌ RevenueHistory - No audit trail for revenue lock events
```

---

## ID GENERATION - UTILITIES ANALYSIS

### ✅ REQUEST ID GENERATION (`src/lib/request-utils.ts`)
```typescript
// RQID: RQ-YYMMDD-0001 (sequential, daily reset)
generateRQID()

// Booking Code: YYYYMMDD + SellerCode + Seq
// Example: 20260201L0005
generateBookingCode(startDate, sellerId)
```

### ❌ OPERATOR ID GENERATION - MISSING
No `serviceId` generation function exists. Current schema has no serviceId field.

### ❌ REVENUE ID GENERATION - MISSING
- revenueId field exists but not used
- No ID generation utility
- Not referenced in lock routes

### FINDING:
ID generation **only exists for Request module**. Operator and Revenue lack unique, trackable IDs.

---

## API ROUTES ANALYSIS

### OPERATOR LOCK ROUTES - EXIST
```
✅ POST /api/operators/[id]/lock
   - Single isLocked boolean
   - No tier validation
   - Creates OperatorHistory audit

✅ POST /api/operators/[id]/unlock
   - Paired unlock route (standard practice)

✅ GET/POST /api/operators/lock-period
   - Bulk lock by month (month-level granularity)
   - No tier awareness
```

### REVENUE LOCK ROUTES - EXIST
```
✅ POST /api/revenues/[id]/lock
   - Single isLocked boolean
   - Requires ACCOUNTANT role
   - NO audit history creation
   - NO permission validation reusability

✅ POST /api/revenues/[id]/unlock
   - Paired unlock route
```

### ❌ MISSING ROUTES
```
- No tier-specific lock endpoints (e.g., /api/operators/[id]/lock/kt)
- No lock-period GET for revenue
- No bulk unlock operations
- No lock state query endpoint
```

---

## AUDIT TRAIL - CURRENT STATE

### ✅ OperatorHistory EXISTS
- Tracks LOCK, UNLOCK, APPROVE, CREATE, UPDATE, DELETE
- Linked to Operator via operatorId
- Captures changes as JSON

### ❌ RevenueHistory MISSING
- Revenue lock/unlock events have no audit trail
- Cannot track who locked/unlocked or when
- Violates accounting compliance requirements

---

## CONFLICTS WITH PLAN

| Item | Plan Requires | Current State | Conflict |
|------|---------------|---------------|----------|
| Tier Fields | 3 boolean fields (lockKT, lockAdmin, lockFinal) | 1 boolean (isLocked) | **HIGH** - Schema redesign needed |
| Operator ID | serviceId unique, persistent | No serviceId field | **HIGH** - Must add to schema |
| Revenue ID | revenueId for tracking | Field exists but unused | **MEDIUM** - Need ID gen + usage |
| Audit Trail | RevenueHistory model | Missing entirely | **HIGH** - Must create model |
| API Routes | /lock/kt, /lock/admin, /lock/final | Only /lock exists | **HIGH** - Need 3 new routes |
| Permissions | Role-based tier access | Operator routes lack checks | **MEDIUM** - Add permission validation |

---

## IMPLEMENTATION READINESS

### Can Proceed As-Is?
**NO.** Current schema incompatible with 3-tier design.

### Schema Change Impact
- Backward compatibility: Requires data migration
- Existing lock endpoints: Will need refactoring (single-tier → 3-tier logic)
- OperatorHistory: Must extend to track 3 tiers
- RevenueHistory: Must create new model

---

## UNRESOLVED QUESTIONS

1. **Lock Tier Cascade:** Does lockFinal implicitly require lockAdmin + lockKT to be true?
2. **Migration Path:** How to migrate existing isLocked records to 3-tier state?
3. **Unlock Permissions:** Can admin unlock KT tier? Or only ACCOUNTANT?
4. **Tier State Consistency:** What happens if user sets lockAdmin=true but lockKT=false?

---

## FILES TO MODIFY (IMPLEMENTATION PHASE)

1. `prisma/schema.prisma` - Add lock tier fields + RevenueHistory
2. `src/lib/operator-history.ts` - Extend history tracking
3. `src/lib/revenue-history.ts` - CREATE (new file)
4. `src/config/lock-config.ts` - CREATE (new file for tier definitions)
5. `src/lib/lock-utils.ts` - CREATE (tier validation, state machines)
6. `src/app/api/operators/[id]/lock-kt/route.ts` - CREATE
7. `src/app/api/operators/[id]/lock-admin/route.ts` - CREATE
8. `src/app/api/operators/[id]/lock-final/route.ts` - CREATE
9. `src/app/api/revenues/[id]/lock-*/route.ts` - CREATE (3 files)
10. `src/app/api/revenues/lock-period/route.ts` - CREATE

---

## NEXT STEPS

1. Update Prisma schema with tier fields + RevenueHistory
2. Create migration for existing data
3. Implement lock-utils.ts with tier logic
4. Create tier-specific API routes
5. Add permission checks to routes
6. Update operator/revenue forms to handle tiers UI
