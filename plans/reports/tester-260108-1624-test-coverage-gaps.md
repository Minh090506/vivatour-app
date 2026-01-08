# Test Coverage Gaps - Phase 2b Revenue API
**Date**: 2026-01-08 | **Report ID**: tester-260108-1624-test-coverage-gaps

---

## Critical Test Coverage Gaps

### 1. Revenue Endpoints (0% Coverage - CRITICAL)

#### POST /api/revenues (Create Revenue)
**File**: `src/app/api/revenues/route.ts`

Test cases needed (15+ tests):
- [ ] Happy path: Create revenue with VND amount
- [ ] Create revenue with foreign currency (USD, EUR, GBP, JPY)
- [ ] RevenueId generation from bookingCode
- [ ] RevenueId generation from requestId (bookingCode fallback)
- [ ] Currency conversion calculation (foreignAmount * exchangeRate = amountVND)
- [ ] History entry created with CREATE action
- [ ] History tracks: revenueId, amountVND, paymentType, paymentSource
- [ ] Permission check: revenue:manage required
- [ ] Missing requestId returns 400
- [ ] Missing paymentDate returns 400
- [ ] Missing paymentType returns 400
- [ ] Invalid paymentType returns 400
- [ ] Invalid currency returns 400
- [ ] ForeignAmount <= 0 returns 400
- [ ] ExchangeRate <= 0 returns 400
- [ ] AmountVND <= 0 returns 400
- [ ] Request not found returns 404
- [ ] Unauthenticated returns 401
- [ ] No permission returns 403
- [ ] Database error handling

#### GET /api/revenues (List Revenues)
**File**: `src/app/api/revenues/route.ts`

Test cases needed (20+ tests):
- [ ] List all revenues with pagination
- [ ] Filter by requestId
- [ ] Filter by paymentType
- [ ] Filter by paymentSource
- [ ] Filter by currency
- [ ] Filter by date range (fromDate/toDate)
- [ ] Filter by isLocked status
- [ ] Combine multiple filters
- [ ] Pagination: limit parameter
- [ ] Pagination: offset parameter
- [ ] hasMore flag when more results exist
- [ ] hasMore false when no more results
- [ ] Total count matches query
- [ ] Results include request details (code, customerName, bookingCode)
- [ ] Results include user details (id, name)
- [ ] Order by paymentDate descending
- [ ] Permission check: revenue:view required
- [ ] Unauthenticated returns 401
- [ ] No permission returns 403
- [ ] Database error handling

#### POST /api/revenues/[id]/lock (Lock Revenue - 3-Tier)
**File**: `src/app/api/revenues/[id]/lock/route.ts`

Test cases needed (25+ tests):
- [ ] Lock KT tier successfully
- [ ] Lock Admin tier successfully
- [ ] Lock Final tier successfully
- [ ] Lock tier progression: KT → Admin → Final
- [ ] Cannot lock Admin without KT locked first
- [ ] Cannot lock Final without Admin locked first
- [ ] Cannot lock KT twice
- [ ] Cannot lock Admin twice
- [ ] Cannot lock Final twice
- [ ] Lock updates correct DB fields:
  - [ ] lockKT & lockKTAt & lockKTBy (KT tier)
  - [ ] lockAdmin & lockAdminAt & lockAdminBy (Admin tier)
  - [ ] lockFinal & lockFinalAt & lockFinalBy (Final tier)
- [ ] History entry created: LOCK_KT action
- [ ] History entry created: LOCK_ADMIN action
- [ ] History entry created: LOCK_FINAL action
- [ ] History tracks: tier, before: false, after: true
- [ ] Invalid tier returns 400
- [ ] Missing tier returns 400
- [ ] Revenue not found returns 404
- [ ] Permission denied for SELLER returns 403
- [ ] Permission denied for OPERATOR returns 403
- [ ] ACCOUNTANT can lock KT tier
- [ ] ADMIN can lock all tiers
- [ ] Database error handling
- [ ] Concurrent lock attempts handled

#### POST /api/revenues/[id]/unlock (Unlock Revenue - 3-Tier)
**File**: `src/app/api/revenues/[id]/unlock/route.ts`

Test cases needed (25+ tests):
- [ ] Unlock Final tier successfully
- [ ] Unlock Admin tier successfully
- [ ] Unlock KT tier successfully
- [ ] Reverse unlock progression: Final → Admin → KT
- [ ] Cannot unlock Admin while Final is locked
- [ ] Cannot unlock KT while Admin is locked
- [ ] Cannot unlock tier that isn't locked
- [ ] Unlock clears correct DB fields:
  - [ ] lockKT = false, lockKTAt = null, lockKTBy = null
  - [ ] lockAdmin = false, lockAdminAt = null, lockAdminBy = null
  - [ ] lockFinal = false, lockFinalAt = null, lockFinalBy = null
- [ ] History entry created: UNLOCK_KT action
- [ ] History entry created: UNLOCK_ADMIN action
- [ ] History entry created: UNLOCK_FINAL action
- [ ] History tracks: tier, before: true, after: false
- [ ] Invalid tier returns 400
- [ ] Missing tier returns 400
- [ ] Revenue not found returns 404
- [ ] Permission denied for SELLER returns 403
- [ ] Permission denied for OPERATOR returns 403
- [ ] ACCOUNTANT can unlock KT tier
- [ ] ADMIN can unlock all tiers
- [ ] Database error handling
- [ ] Concurrent unlock attempts handled

#### GET /api/revenues/[id]/history (Revenue History)
**File**: `src/app/api/revenues/[id]/history/route.ts`

Test cases needed (15+ tests):
- [ ] Get history for revenue with no changes
- [ ] Get history with multiple entries
- [ ] History sorted by createdAt descending
- [ ] History includes: revenueId, action, changes, userId, userName, createdAt
- [ ] UserName resolved from userId
- [ ] Unknown userId shows "Unknown"
- [ ] History includes CREATE action
- [ ] History includes LOCK_KT action
- [ ] History includes UNLOCK_KT action
- [ ] History includes LOCK_ADMIN action
- [ ] History includes UNLOCK_ADMIN action
- [ ] History includes LOCK_FINAL action
- [ ] History includes UNLOCK_FINAL action
- [ ] Revenue not found returns 404
- [ ] Permission check: revenue:view required
- [ ] Unauthenticated returns 401
- [ ] No permission returns 403
- [ ] Database error handling

---

### 2. Revenue Utilities (0% Coverage - HIGH)

#### revenue-history.ts
**File**: `src/lib/revenue-history.ts`

Test cases needed (20+ tests):

**createRevenueHistory()**
- [ ] Creates entry with CREATE action
- [ ] Creates entry with UPDATE action
- [ ] Creates entry with DELETE action
- [ ] Creates entry with LOCK_KT action
- [ ] Creates entry with LOCK_ADMIN action
- [ ] Creates entry with LOCK_FINAL action
- [ ] Creates entry with UNLOCK_KT action
- [ ] Creates entry with UNLOCK_ADMIN action
- [ ] Creates entry with UNLOCK_FINAL action
- [ ] Changes object properly stored (before/after values)
- [ ] UserId recorded
- [ ] Timestamp recorded
- [ ] Database error handling

**getRevenueHistory()**
- [ ] Returns empty array when no history
- [ ] Returns all history entries for revenue
- [ ] Sorted by createdAt descending
- [ ] Includes user names (joined from user table)
- [ ] Multiple users with same ID deduplicated
- [ ] Unknown user ID defaults to "Unknown"
- [ ] Database error handling
- [ ] Performance: doesn't N+1 query users

---

### 3. ID Utilities - generateRevenueId (0% Coverage - HIGH)

**File**: `src/lib/id-utils.ts`

Test cases needed (15+ tests):
- [ ] Generates revenueId from bookingCode
- [ ] Generates revenueId from requestId (bookingCode fallback)
- [ ] RevenueId format includes timestamp component
- [ ] RevenueId format includes random component
- [ ] RevenueId is URL-safe
- [ ] RevenueId length reasonable (< 50 chars)
- [ ] Multiple calls generate different IDs (uniqueness)
- [ ] Handles empty bookingCode
- [ ] Handles null bookingCode
- [ ] Handles special characters in bookingCode
- [ ] Database uniqueness check (if enforced)
- [ ] Performance: generation is fast (< 10ms)

---

### 4. Integration Tests (0% Coverage - HIGH)

Test complete lock progression:
- [ ] Create revenue → Lock KT → Lock Admin → Lock Final
- [ ] Create revenue → Lock KT → Unlock KT
- [ ] Lock KT → Unlock KT → Lock KT (re-lock)
- [ ] Create → Lock KT → Lock Admin → Unlock Admin → Unlock KT
- [ ] Revenue list shows correct lock status
- [ ] History chain shows all operations
- [ ] Permissions enforced across all operations

---

## Mock Setup Required

### Database Mock Setup Issues

#### Current Problem
```
TypeError: tx.operatorHistory.createMany is not a function
```

#### Required Fixes
1. **Transaction mock needs createMany support**
   ```javascript
   tx.operatorHistory.createMany = jest.fn().mockResolvedValue({})
   tx.revenueHistory.createMany = jest.fn().mockResolvedValue({})
   ```

2. **Count mock needs chaining support**
   ```javascript
   // Current: doesn't work with chained calls
   // Needed: mock.mockResolvedValueOnce(10).mockResolvedValueOnce(7)...
   ```

3. **Create/update mock needs transaction support**
   ```javascript
   prisma.$transaction.mockResolvedValue([/* results */])
   ```

---

## Test Priority Matrix

| Component | Tests Needed | Priority | Est. Time | Blocker |
|-----------|--------------|----------|-----------|---------|
| Revenue lock/unlock | 50 | CRITICAL | 8 hrs | YES |
| Revenue create/list | 35 | CRITICAL | 6 hrs | YES |
| Revenue history | 15 | CRITICAL | 3 hrs | YES |
| Revenue utilities | 20 | HIGH | 4 hrs | NO |
| Integration tests | 10 | HIGH | 3 hrs | NO |
| **TOTAL** | **130** | - | **24 hrs** | - |

---

## Estimated Timeline

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 1. Fix Mocks | Update operator-lock test mocks | 2-3 hrs |
| 2. Verify Existing | Confirm all existing tests pass | 1 hr |
| 3. Write Revenue Tests | All 50+ revenue endpoint tests | 8 hrs |
| 4. Write Utility Tests | All 20+ utility tests | 4 hrs |
| 5. Integration | Complete integration test suite | 3 hrs |
| 6. Review & Refine | Code review, refactor, optimize | 2 hrs |
| **TOTAL** | | **20-21 hrs** |

---

## Test File Structure

### Proposed new test files

```
src/__tests__/
├── api/
│   ├── revenues.test.ts (70+ tests for endpoints)
│   └── (existing files)
└── lib/
    ├── revenue-history.test.ts (20+ tests)
    ├── id-utils.test.ts (revenue generation section)
    └── (existing files)
```

### File sizes estimated
- `revenues.test.ts`: ~600 lines (with mocks)
- `revenue-history.test.ts`: ~300 lines
- Updates to existing test files: ~100 lines

---

## Success Criteria

All test coverage gaps resolved when:
- [ ] POST /api/revenues: 15+ tests, all passing
- [ ] GET /api/revenues: 20+ tests, all passing
- [ ] POST /api/revenues/[id]/lock: 25+ tests, all passing
- [ ] POST /api/revenues/[id]/unlock: 25+ tests, all passing
- [ ] GET /api/revenues/[id]/history: 15+ tests, all passing
- [ ] revenue-history.ts: 20+ tests, all passing
- [ ] generateRevenueId: 15+ tests, all passing
- [ ] Integration tests: 10+ tests, all passing
- [ ] Overall test coverage: > 80%
- [ ] Lock tier progression tested end-to-end
- [ ] All 9 operator lock failures resolved
- [ ] Production deployment approved

