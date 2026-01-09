# OPERATOR MODULE ANALYSIS REPORT

**Date:** 2026-01-09
**Type:** Architecture Analysis
**Author:** Senior Systems Architect (Claude)

---

## 1. ARCHITECTURE ANALYSIS

### 1.1 Component Inventory

#### Dashboard Pages (`src/app/(dashboard)/operators/`)

| File | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Main operator list với filters | ✅ Implemented |
| `create/page.tsx` | Create new operator form | ✅ Implemented |
| `[id]/page.tsx` | Operator detail view | ✅ Implemented |
| `reports/page.tsx` | Cost reports & analytics | ✅ Implemented |
| `approvals/page.tsx` | Payment approval queue | ✅ Implemented |

#### Components (`src/components/operators/`)

| Component | Function | Lines |
|-----------|----------|-------|
| `operator-form.tsx` | Create/Edit service form | ~460 |
| `operator-list-filters.tsx` | Filter controls for list | Medium |
| `operator-approval-table.tsx` | Batch approval table | ~177 |
| `approval-summary-cards.tsx` | Approval metrics cards | Small |
| `lock-indicator.tsx` | Simple lock badge (legacy) | ~38 |
| `operator-lock-tier-badge.tsx` | 3-tier lock badges | ~177 |
| `operator-lock-dialog.tsx` | Batch lock by month | ~284 |
| `operator-history-panel.tsx` | Audit trail panel | Medium |
| **Reports** | | |
| `reports/cost-by-service-chart.tsx` | Bar chart by service type | ~46 |
| `reports/monthly-trend.tsx` | Monthly cost trend | Medium |
| `reports/payment-status-cards.tsx` | Payment metrics cards | ~69 |
| `reports/cost-by-supplier-table.tsx` | Cost breakdown by NCC | Medium |

---

## 2. VALIDATION RULES ANALYSIS

### 2.1 Form Validation (operator-form.tsx)

**Client-Side Validation:**
```
Required Fields:
├── requestId     → "Vui lòng chọn Booking"
├── serviceType   → "Vui lòng chọn loại dịch vụ"
├── serviceName   → "Vui lòng nhập tên dịch vụ"
└── supplier      → "Vui lòng chọn NCC hoặc nhập tên NCC"
    (if no supplierId selected)
```

**Missing Validation (Gaps):**
| Field | Current | Should Have |
|-------|---------|-------------|
| `costBeforeTax` | `required` attribute only | min=0, number validation |
| `serviceDate` | HTML5 date | future date warning, range check |
| `paymentDeadline` | optional | should be >= serviceDate |
| `pax` | N/A (from request) | positive integer |

### 2.2 Server-Side Validation (API route.ts)

**POST /api/operators:**
```
1. Auth check           → 401 if no session
2. Required fields      → 400 if missing requestId/serviceDate/serviceType/serviceName
3. Service type valid   → 400 if not in SERVICE_TYPE_KEYS
4. Request exists       → 404 if not found
5. Request status = F5  → 400 if not F5
6. Supplier exists      → 404 if supplierId provided but not found
```

**Missing Server Validation:**
- No cost range validation (negative costs allowed)
- No duplicate service check (same booking + service type + date)
- No payment deadline vs service date validation

---

## 3. EDGE CASES NOT HANDLED

### 3.1 Critical Edge Cases

| # | Edge Case | Current Behavior | Risk |
|---|-----------|------------------|------|
| 1 | **Negative costs** | Accepted | Financial data corruption |
| 2 | **Payment > TotalCost** | Accepted | Overpayment undetected |
| 3 | **Service date in past** | Accepted | No warning for data entry error |
| 4 | **PaymentDeadline < ServiceDate** | Accepted | Illogical data |
| 5 | **Duplicate services** | Accepted | Potential duplicates undetected |
| 6 | **Request status change after operator created** | No cascade | Orphaned operators if request cancelled |
| 7 | **Supplier deleted with linked operators** | Prisma prevents | OK (foreign key) |

### 3.2 Lock System Edge Cases

| # | Edge Case | Current Behavior | Issue |
|---|-----------|------------------|-------|
| 1 | **Skip lock tier** (try to lock Admin before KT) | Rejected correctly ✅ | None |
| 2 | **Unlock wrong order** (try unlock KT before Admin) | Rejected correctly ✅ | None |
| 3 | **Bulk lock timeout** | No transaction timeout | Potential partial lock |
| 4 | **Concurrent lock/unlock** | No optimistic locking | Race condition possible |
| 5 | **Lock then edit attempt** | API should reject but UI allows form render | UX inconsistency |

### 3.3 Approval System Edge Cases

| # | Edge Case | Current Behavior | Issue |
|---|-----------|------------------|-------|
| 1 | **Approve locked operator** | Checkbox disabled ✅ | OK |
| 2 | **Batch approve with mixed states** | Processes all | May fail silently |
| 3 | **Payment date in future** | Accepted | Should warn |
| 4 | **Zero amount approval** | Accepted | Should validate |

---

## 4. 3-TIER LOCK SYSTEM IMPLEMENTATION

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     3-TIER LOCK SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TIER 1: Lock KT (Kế toán)                                  │
│  ├─ Who can lock: ACCOUNTANT, ADMIN                         │
│  ├─ Who can unlock: ACCOUNTANT, ADMIN                       │
│  ├─ Color: Amber (yellow-500)                               │
│  └─ DB fields: lockKT, lockKTAt, lockKTBy                   │
│                                                              │
│  TIER 2: Lock Admin                                          │
│  ├─ Who can lock: ADMIN only                                │
│  ├─ Who can unlock: ADMIN only                              │
│  ├─ Prerequisite: lockKT = true                             │
│  ├─ Color: Orange (orange-500)                              │
│  └─ DB fields: lockAdmin, lockAdminAt, lockAdminBy          │
│                                                              │
│  TIER 3: Lock Final                                          │
│  ├─ Who can lock: ADMIN only                                │
│  ├─ Who can unlock: ADMIN only                              │
│  ├─ Prerequisite: lockAdmin = true                          │
│  ├─ Color: Red (red-500)                                    │
│  └─ DB fields: lockFinal, lockFinalAt, lockFinalBy          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation Quality

| Component | File | Quality |
|-----------|------|---------|
| Lock Utils | `src/lib/lock-utils.ts` | ✅ Excellent - Well-structured |
| Lock Config | `src/config/lock-config.ts` | ✅ Complete |
| Lock API (single) | `src/app/api/operators/[id]/lock/route.ts` | ✅ Good |
| Unlock API | `src/app/api/operators/[id]/unlock/route.ts` | ✅ Good |
| Batch Lock API | `src/app/api/operators/lock-period/route.ts` | ✅ Exists |
| Lock Dialog UI | `operator-lock-dialog.tsx` | ✅ Good UX |
| Lock Badge UI | `operator-lock-tier-badge.tsx` | ✅ Good |

### 4.3 MVT Master Doc Compliance

**Spec (Section 5.4):**
```
TIER 1: LOCK KT - Column AB
  • Ai có thể khóa: Kế toán, Admin
  • Ai có thể mở: Kế toán, Admin

TIER 2: LOCK ADMIN - Column AC
  • Ai có thể khóa: Admin
  • Điều kiện: Phải có Lock KT trước

TIER 3: LOCK FINAL - Column AD
  • Ai có thể khóa: Admin
  • Điều kiện: Phải có Lock Admin trước
```

**Implementation vs Spec:**

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| KT lock by ACCOUNTANT/ADMIN | `LOCK_PERMISSIONS.KT.lock` | ✅ Match |
| KT unlock by ACCOUNTANT/ADMIN | `LOCK_PERMISSIONS.KT.unlock` | ✅ Match |
| Admin lock by ADMIN only | `LOCK_PERMISSIONS.Admin.lock` | ✅ Match |
| Admin requires KT first | `canLockTier()` checks | ✅ Match |
| Final requires Admin first | `canLockTier()` checks | ✅ Match |
| Unlock reverse order | `canUnlockTier()` checks | ✅ Match |
| Legacy `isLocked` sync | API syncs on lock/unlock | ✅ Match |

**Compliance Score: 100%**

---

## 5. REPORTS & CHARTS ANALYSIS

### 5.1 Current Reports

| Report | Location | Data Source | Charts |
|--------|----------|-------------|--------|
| **Cost by Service Type** | `/operators/reports` | `GET /api/reports/operator-costs` | Bar chart (CSS) |
| **Cost by Supplier** | `/operators/reports` | Same API | Table |
| **Monthly Trend** | `/operators/reports` | Same API | Line (CSS bars) |
| **Payment Status** | `/operators/reports` | `GET /api/reports/operator-payments` | Cards |

### 5.2 Payment Status Metrics

```
Current Implementation:
├── pending      → Chi chờ thanh toán
├── overdue      → Quá hạn (paymentDeadline < today)
├── dueThisWeek  → Đến hạn tuần này
└── paidThisMonth → Đã TT tháng này
```

### 5.3 MVT Master Doc Report Requirements (Section 5 & 11)

| Required Report | Implemented | Notes |
|-----------------|-------------|-------|
| Báo cáo thanh toán theo tháng | ✅ Yes | Monthly trend |
| Chi phí theo loại DV | ✅ Yes | Cost by service |
| Chi phí theo NCC | ✅ Yes | Cost by supplier |
| Debt tracking (W = Q - V) | ⚠️ Partial | `paymentStatus` but no debt column |
| Archive to Operator_Store | ❌ No | Not implemented |
| Due payments alert | ✅ Yes | Payment status cards |

### 5.4 Missing Reports vs Spec

| Missing | From Spec Section | Priority |
|---------|-------------------|----------|
| **Profit Report** (Revenue - Cost) | 6.4, 11.3 | High |
| **Show Report** (consolidated) | 2.1, 6.3 | Medium |
| **Archive status** | 5.5 | Medium |
| **Lock status summary** | 5.4 | Low |

---

## 6. COMPARISON WITH MVT_WORKFLOW_MASTER.md

### 6.1 Column Mapping Check

**MVT Spec (Section 5.1) vs Implementation:**

| Col | Spec Field | DB Field | Form Field | Match |
|-----|------------|----------|------------|-------|
| A | CODE (Mã Booking) | `requestId` (FK) | `requestId` | ✅ |
| B | NAME | from Request | auto-fill | ✅ |
| C-E | Contact, WhatsApp, PAX | from Request | auto-fill | ✅ |
| F-G | START/END_DATE | from Request | - | ✅ |
| J | SVC_DATE | `serviceDate` | `serviceDate` | ✅ |
| K | SVC_TYPE | `serviceType` | `serviceType` | ✅ |
| O | COST_BEFORE_TAX | `costBeforeTax` | `costBeforeTax` | ✅ |
| P | VAT | `vat` | `vat` | ✅ |
| Q | COST_PLAN | `totalCost` | `totalCost` | ✅ |
| R | PAY_DUE | `paymentDeadline` | `paymentDeadline` | ✅ |
| S | PAY_ACCOUNT | `bankAccount` | `bankAccount` | ✅ |
| T | NOTE | `notes` | `notes` | ✅ |
| U | PAY_DATE | `paymentDate` | - (approval flow) | ✅ |
| V | PAY_AMT | - | - | ❌ Missing |
| W | DEBT | - (calculated) | - | ⚠️ Not stored |
| AB | TICK_KT | `lockKT` | lock dialog | ✅ |
| AC | TICK_ADMIN | `lockAdmin` | lock dialog | ✅ |
| AD | TICK_FINAL | `lockFinal` | lock dialog | ✅ |
| AN | SERVICE_ID | `serviceId` | auto-generated | ✅ |

### 6.2 Critical Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| **V - PAY_AMT** | Separate payment amount field missing | Cannot track partial payments |
| **W - DEBT** | Debt calculation not stored | Need to calculate on-the-fly |
| **Archive logic** | No Operator_Store implementation | Completed services stay in main table |

---

## 7. DESIGN RECOMMENDATIONS

### 7.1 High Priority (Security/Data Integrity)

1. **Add cost validation**
   - Min cost = 0
   - Payment amount <= totalCost
   - PaymentDeadline >= ServiceDate

2. **Add optimistic locking for concurrent edits**
   - Use `updatedAt` version check

3. **Partial payment support**
   - Add `paidAmount` field
   - Calculate `debt = totalCost - paidAmount`

### 7.2 Medium Priority (Feature Parity)

1. **Archive system**
   - Add `isArchived` flag
   - Auto-archive when lockFinal + endDate passed + fully paid

2. **Profit reporting**
   - Cross-reference with Revenue module
   - Calculate Revenue - Operator costs per booking

### 7.3 Low Priority (UX Enhancement)

1. **Duplicate detection**
   - Warn on same booking + service type + date

2. **Form pre-population**
   - Default paymentDeadline = serviceDate + 30 days

---

## 8. NEXT ACTIONS

| # | Action | Type | Priority |
|---|--------|------|----------|
| 1 | Add `paidAmount` field to schema | Schema change | High |
| 2 | Add cost validation middleware | Backend | High |
| 3 | Implement debt calculation | Backend + Frontend | High |
| 4 | Add partial payment UI | Frontend | Medium |
| 5 | Implement archive logic | Backend | Medium |
| 6 | Add profit report | Full-stack | Medium |
| 7 | Add duplicate detection | Backend | Low |

---

## UNRESOLVED QUESTIONS

1. **Partial payments**: Should we support multiple payment records per operator, or just track cumulative `paidAmount`?

2. **Archive destination**: Should archived operators go to a separate table (`Operator_Store`) per MVT spec, or use a flag in the same table?

3. **Sync with Google Sheets**: Current implementation is PostgreSQL-only. Is bidirectional sync with Google Sheets still required?

4. **OPERATOR role**: The `Role` enum includes `OPERATOR` but permissions are only defined for `ACCOUNTANT` and `ADMIN`. Should operators have any lock permissions?
