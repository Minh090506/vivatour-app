# VivaTour Existing Operator & Revenue Modules Research Report

**Date**: 2026-01-08
**Focus**: Parallel implementation readiness for 3-tier lock system (lockKT, lockAdmin, lockFinal)

---

## 1. EXISTING API ROUTES

### 1.1 Operator API Endpoints

**Base Path**: `/api/operators`

| Endpoint | Method | Purpose | Auth | Line References |
|----------|--------|---------|------|-----------------|
| `/operators` | GET | List operators with filters (search, date, payment status, lock status) | Any | `src/app/api/operators/route.ts:7-79` |
| `/operators` | POST | Create operator for F5 request | Session required | `src/app/api/operators/route.ts:82-190` |
| `/operators/[id]` | GET | Get operator detail | Session | - |
| `/operators/[id]` | PUT | Update operator | Session | - |
| `/operators/[id]` | DELETE | Delete operator | Session | - |
| `/operators/[id]/approve` | POST | Mark single operator as PAID (approve payment) | No explicit permission check | `src/app/api/operators/[id]/approve/route.ts:1-67` |
| `/operators/[id]/lock` | POST | Lock individual operator (for accounting) | No explicit permission check | `src/app/api/operators/[id]/lock/route.ts:1-62` |
| `/operators/[id]/unlock` | POST | Unlock operator (ADMIN ONLY) | requireAdmin() | `src/app/api/operators/[id]/unlock/route.ts:1-63` |
| `/operators/approve` | POST | Batch approve operators (multiple records) | requirePermission('operator:approve') | `src/app/api/operators/approve/route.ts:1-101` |
| `/operators/lock-period` | GET | Check lock status for month range | Session | `src/app/api/operators/lock-period/route.ts:102-156` |
| `/operators/lock-period` | POST | Lock all operators in a month (batch lock period) | Session | `src/app/api/operators/lock-period/route.ts:1-99` |
| `/operators/pending-payments` | GET | List operators awaiting payment | - | - |

### 1.2 Revenue API Endpoints

**Base Path**: `/api/revenues`

| Endpoint | Method | Purpose | Auth | Line References |
|----------|--------|---------|------|-----------------|
| `/revenues` | GET | List revenues with filters (payment type, source, currency, lock status) | hasPermission('revenue:view') | `src/app/api/revenues/route.ts:7-86` |
| `/revenues` | POST | Create revenue record (multi-currency support) | hasPermission('revenue:manage') | `src/app/api/revenues/route.ts:88-205` |
| `/revenues/[id]` | GET | Get revenue detail | Session | - |
| `/revenues/[id]` | PUT | Update revenue | Session | - |
| `/revenues/[id]` | DELETE | Delete revenue | Session | - |
| `/revenues/[id]/lock` | POST | Lock revenue (ACCOUNTANT can lock) | hasPermission('revenue:manage') | `src/app/api/revenues/[id]/lock/route.ts:1-72` |
| `/revenues/[id]/unlock` | POST | Unlock revenue (ADMIN ONLY) | role === 'ADMIN' | `src/app/api/revenues/[id]/unlock/route.ts:1-67` |

---

## 2. EXISTING LOCK/UNLOCK IMPLEMENTATION (2-Tier)

### 2.1 Current Lock Model

**Database Schema** (`prisma/schema.prisma:119-171`):

```prisma
model Operator {
  isLocked        Boolean   @default(false)
  lockedAt        DateTime?
  lockedBy        String?   // User ID who locked
  history         OperatorHistory[]  // Audit trail
}

model Revenue {
  isLocked        Boolean   @default(false)
  lockedAt        DateTime?
  lockedBy        String?   // User ID who locked
}
```

**Current Status**: Simple boolean lock only (2 states: locked/unlocked)

### 2.2 Operator Lock Implementation

**Single Lock** (`src/app/api/operators/[id]/lock/route.ts`):
- Line 31-39: Sets `isLocked=true`, `lockedAt=now()`, `lockedBy=userId`
- Line 42-51: Creates history entry with LOCK action
- No permission check (anyone can lock)
- No state validation before lock

**Single Unlock** (`src/app/api/operators/[id]/unlock/route.ts`):
- Line 13-14: `requireAdmin()` - ADMIN ONLY
- Line 34-40: Clears all lock fields (isLocked=false, lockedAt=null, lockedBy=null)
- Line 43-52: Creates history entry with UNLOCK action

**Batch Lock Period** (`src/app/api/operators/lock-period/route.ts`):
- Line 30-39: Finds unlocked operators in month range
- Line 53-62: Updates all with `isLocked=true`, `lockedAt`, `lockedBy` in transaction
- Line 64-80: Creates history entries for all in batch
- No permission check required

**Approval Lock**: Payment approval does NOT lock:
- `src/app/api/operators/[id]/approve/route.ts:40-46` - Sets `paymentStatus='PAID'`, `paymentDate` only
- `src/app/api/operators/approve/route.ts:54-77` - Batch approval also sets paymentStatus only

### 2.3 Revenue Lock Implementation

**Lock** (`src/app/api/revenues/[id]/lock/route.ts`):
- Line 23: `hasPermission(role, 'revenue:manage')` - ACCOUNTANT or ADMIN
- Line 51-57: Sets `isLocked=true`, `lockedAt=now()`, `lockedBy=userId`
- No prior state validation

**Unlock** (`src/app/api/revenues/[id]/unlock/route.ts`):
- Line 21-26: `role === 'ADMIN'` - ADMIN ONLY (stricter than operator)
- Line 46-52: Clears all lock fields
- No history tracking for revenue

### 2.4 Audit Trail

**Operator History**:
- Table: `operator_history` (Line 177-189 schema)
- Tracks: `action` (CREATE, UPDATE, LOCK, UNLOCK, APPROVE), `changes` (JSON), `userId`, `createdAt`
- Used by: Operator lock/unlock, approval
- Component: `OperatorHistoryPanel` (`src/components/operators/operator-history-panel.tsx`)

**Revenue History**:
- NO audit table for revenues
- Gap: Can't track who locked/when for revenue

---

## 3. CURRENT PAGE COMPONENTS

### 3.1 Operator Pages

**List Page** (`src/app/(dashboard)/operators/page.tsx`):
- Filters: search, request, supplier, service type, payment status, locked status, date range
- Uses: OperatorListFilters, operator-table
- Displays: serviceName, request, supplier, cost, paymentStatus, locked badge
- Actions: create, view detail, batch approve

**Detail Page** (`src/app/(dashboard)/operators/[id]/page.tsx:1-243`):
- Shows: serviceName, requestCode, supplier, costs, paymentStatus, locked indicator
- Line 238-242: LockIndicator component displays lock metadata
- Line 124-145: handleUnlock() - unlocks and refreshes
- Edit mode allows updating costs when unlocked (no edit if locked enforced by UI)
- Buttons: Edit, Delete, Unlock (if locked & admin), History panel

**Approval Page** (`src/app/(dashboard)/operators/approvals/page.tsx`):
- Batch approval workflow for operators needing payment
- Uses: OperatorApprovalTable
- Filters by: paymentStatus=PENDING/PARTIAL
- Checkbox selection + batch approve with payment date picker

**Create Page** (`src/app/(dashboard)/operators/create/page.tsx`):
- Form to add operator to F5 request
- Links supplier, calculates costs
- No lock shown (new records start unlocked)

**Reports Page** (`src/app/(dashboard)/operators/reports/page.tsx`):
- Operator costs by period/supplier
- Revenue analysis
- Lock status summary

### 3.2 Revenue Pages

**List Page** (`src/app/(dashboard)/revenues/page.tsx`):
- Filters: payment type, source, currency, date, locked status
- Displays: paymentDate, type, source, amountVND, lockedStatus
- Actions: create, edit (if unlocked), delete (if unlocked), lock/unlock
- No batch operations

**Create/Edit Dialog**:
- RevenueForm - inline form
- Multi-currency support with exchange rate
- Only editable if not locked

---

## 4. COMPONENT STRUCTURE & STATE MANAGEMENT

### 4.1 Operator Components

**OperatorForm** (`src/components/operators/operator-form.tsx`):
- React Hook Form + Zod validation
- Fields: serviceDate, serviceType, serviceName, supplier, costs, paymentDeadline, notes
- Disables submission if operator.isLocked
- Line: supplier link with auto-fill

**OperatorLockDialog** (`src/components/operators/operator-lock-dialog.tsx`):
- Month input for batch lock-period
- Line 40: Preview API call to GET `/api/operators/lock-period?month=YYYY-MM`
- Line 55-61: POST to lock-period
- Shows count of records to be locked
- Used in approvals page

**OperatorHistoryPanel** (`src/components/operators/operator-history-panel.tsx`):
- Shows audit trail from `operator_history` table
- Displays: action, changes (JSON), user, timestamp
- Colors: LOCK=amber, UNLOCK=purple, APPROVE=emerald

**LockIndicator** (mentioned in code):
- Shows: "Locked since [date] by [user]"
- Badge styling: amber/locked state

**OperatorApprovalTable** (`src/components/operators/operator-approval-table.tsx`):
- Checkbox selection for batch approval
- Prevents approval of locked operators (line in /approve route)
- Payment date picker for all selected

### 4.2 Revenue Components

**RevenueTable** (`src/components/revenues/revenue-table.tsx`):
- Shows: paymentDate, type, source, amount (multi-currency display), locked status
- Actions per row: edit (if unlocked), delete (if unlocked), lock/unlock
- Line 107-128: handleLock/handleUnlock API calls
- Line 202-211: Locked badge (amber Lock icon)
- Line 228-248: Lock/unlock buttons (unlock only if canUnlock=ADMIN)

**RevenueForm** (`src/components/revenues/revenue-form.tsx`):
- Input: paymentDate, paymentType, paymentSource
- Multi-currency: foreignAmount + exchangeRate or amountVND direct
- Calculates amountVND = foreignAmount * exchangeRate
- Disables if locked

**RevenueSummaryCard** (`src/components/revenues/revenue-summary-card.tsx`):
- Shows totals: count, sum by type, sum by currency
- Filter toggles

---

## 5. DATA FLOW PATTERNS

### 5.1 Operator Workflow

```
Create Operator
  ↓
Add to Request (F5 only)
  ↓
View in List/Detail
  ↓
Approve Payment (marks PAID)
  ↓
Lock Period (batch monthly)
  ↓
[LOCKED - no edits allowed]
  ↓
Unlock (admin only) → Edit → Lock again
```

**Key Validation Points**:
- Line 120-125 in route.ts: Request must be F5
- Line 23-28 in [id]/approve: Can't approve if locked
- Line 45-50 in approve batch: Rejects if any locked

### 5.2 Revenue Workflow

```
Create Revenue
  ↓
View in List
  ↓
Lock (accountant, for finalization)
  ↓
[LOCKED - no edits allowed]
  ↓
Unlock (admin only) → Edit → Lock again
```

**Key Validation Points**:
- Line 42-47 in lock route: Can't lock if already locked
- Line 217 in table: Edit button hidden if locked
- Line 228-238 in table: Unlock only visible to ADMIN

---

## 6. PERMISSIONS & AUTH

### 6.1 Current Permission System

**File**: `src/lib/permissions.ts`

**Roles**: ADMIN, SELLER, OPERATOR, ACCOUNTANT

**Operator Permissions**:
- `operator:view` - View operators (SELLER, OPERATOR, ACCOUNTANT, ADMIN)
- `operator:create` - Create operators (ADMIN only currently)
- `operator:approve` - Approve payments (ACCOUNTANT, ADMIN)
- `operator:edit_claimed` - Edit claimed operators (OPERATOR)
- `operator:claim` - Claim operator (OPERATOR)

**Revenue Permissions**:
- `revenue:view` - View revenues (ACCOUNTANT, ADMIN)
- `revenue:manage` - Create/edit/lock revenues (ACCOUNTANT, ADMIN)

**Lock/Unlock Checks**:
- Lock operator: No check (anyone)
- Unlock operator: requireAdmin() (ADMIN only)
- Lock revenue: hasPermission('revenue:manage') (ACCOUNTANT/ADMIN)
- Unlock revenue: role === 'ADMIN' (ADMIN only)

**Gap**: Lock operations don't have granular permission control

---

## 7. GAPS IN CURRENT IMPLEMENTATION

### 7.1 Compared to 3-Tier Lock System (lockKT, lockAdmin, lockFinal)

**Current State**: Single boolean lock with optional metadata

| Feature | Current | 3-Tier System Need |
|---------|---------|-------------------|
| Lock types | 1 (isLocked) | 3+ (KT, Admin, Final) |
| Permission levels | 2 (anyone lock, admin unlock) | 3+ (different roles per tier) |
| State transitions | locked ↔ unlocked | locked₁ → locked₂ → locked₃ |
| Unlock requirements | Admin role | Each tier requires different auth |
| Audit tracking | Operator only | Both modules + full chain |
| UI state display | "Locked since X by Y" | Show all lock tiers with timestamps |
| Rollback capability | Manual unlock only | Structured unlock cascade |
| Approval blocking | After payment | Can happen at lock level 1 |

### 7.2 Missing Components

1. **Revenue History Table**
   - No `revenue_history` model
   - Can't audit revenue lock chain
   - No change tracking for edits

2. **Lock Hierarchy Model**
   - No `lockLevel` or `lockStage` field
   - No `lockChain` tracking
   - No ordered lock progression

3. **Permission Granularity**
   - No `lock:operator:kt` type permissions
   - No `lock:operator:admin` type permissions
   - Generic `revenue:manage` covers both lock and edit

4. **Lock Validation**
   - No check for lock tier before locking next level
   - No validation of unlock order
   - No cascade unlock logic

5. **Approval Integration**
   - Approval marks PAID without enforcing lock
   - Lock period doesn't align with approval period
   - No link between approval and accounting lock

---

## 8. COMPONENT REUSABILITY POTENTIAL

### 8.1 Can Be Reused/Extended

✅ **Lock UI Components**:
- OperatorLockDialog pattern → can extend for multi-tier
- LockIndicator → can show multiple lock badges
- Badge styling for lock states

✅ **History System**:
- OperatorHistory table/model → duplicate for Revenue
- createOperatorHistory utility → pattern for createRevenueHistory
- History action types can extend with LOCK_KT, LOCK_ADMIN, etc.

✅ **Batch Operations**:
- lock-period endpoint pattern good for all modules
- Transaction wrapping with history in approve batch route
- Checkbox selection in approval table

✅ **Permission Checks**:
- requirePermission() utility pattern
- hasPermission() function easily extended
- Session auth via auth() middleware

### 8.2 Requires Changes

❌ **Lock Logic**:
- Current isLocked boolean → needs multi-field structure
- Unlock → needs conditional cascading based on tier
- Lock validation → needs progression rules

❌ **Database**:
- New `revenue_history` model needed
- Fields in Revenue/Operator for each lock tier
- Indexes for lock-related queries

---

## 9. CRITICAL CODE REFERENCES

### 9.1 Lock Route Files

```
src/app/api/operators/[id]/lock/route.ts         [Lines 1-62]      - Single lock
src/app/api/operators/[id]/unlock/route.ts       [Lines 1-63]      - Admin unlock
src/app/api/operators/lock-period/route.ts       [Lines 1-156]     - Batch lock/period check
src/app/api/revenues/[id]/lock/route.ts          [Lines 1-72]      - Revenue lock
src/app/api/revenues/[id]/unlock/route.ts        [Lines 1-67]      - Revenue unlock
```

### 9.2 Page Files

```
src/app/(dashboard)/operators/page.tsx           - Operator list with lock filter
src/app/(dashboard)/operators/[id]/page.tsx      - Detail + unlock button
src/app/(dashboard)/operators/approvals/page.tsx - Batch approval workflow
src/app/(dashboard)/revenues/page.tsx            - Revenue list with lock UI
```

### 9.3 Component Files

```
src/components/operators/operator-lock-dialog.tsx     - Month picker + preview
src/components/operators/operator-history-panel.tsx   - Audit trail display
src/components/revenues/revenue-table.tsx             - Lock/unlock buttons
```

### 9.4 Config Files

```
src/config/operator-config.ts                    - HISTORY_ACTIONS enum
src/config/revenue-config.ts                     - Payment types (no lock config)
```

---

## 10. UNRESOLVED QUESTIONS

1. **3-Tier Lock Definition**: What are exact names & order? (KT → Admin → Final, or different?)
2. **Lock State Persistence**: Should unlocking tier-2 auto-unlock tier-1, or independent?
3. **Approval & Lock Timing**: Should approval auto-lock tier-1 (KT), or manual?
4. **Batch Lock Rules**: Can batch-lock if some already in tier-1? What's precedence?
5. **Role Mapping**: Which roles lock which tiers? (KT=Accountant? Admin=Admin? Final=?)
6. **Edit After Lock**: Can edit tier-1 locked records? Tier-2? Tier-3?
7. **Unlock Cascade**: If unlock tier-2, do we require unlock tier-1 first?
8. **Approval Enforcement**: Can approve (mark PAID) if any tier locked? Current: no
9. **UI Display**: Show all 3 lock badges simultaneously, or just highest tier?
10. **History Granularity**: Track each lock operation separately, or chain as one entry?

---

## SUMMARY

**Current Implementation**: Simple 2-state lock system (locked/unlocked) with basic audit for operators only. Sufficient for single-stage approval but lacks hierarchy for multi-tier finalization workflow.

**Readiness for 3-Tier**: Database schema needs expansion, permission system needs refinement, and lock logic requires state management changes. Components can be extended. Revenue module needs history table first.

**Parallel Development**: Can implement both modules simultaneously using same pattern if lock tier structure is defined first. Recommend establishing that before splitting tasks.

