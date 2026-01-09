# Revenue Module Analysis Report

> **Date:** 2026-01-09
> **Context:** Technical architecture analysis comparing current implementation vs MVT_WORKFLOW_MASTER.md Section 6

---

## 1. Architecture Analysis

### 1.1 Current Implementation Structure

```
src/
├── app/(dashboard)/revenues/
│   └── page.tsx                    # Main list page (355 lines)
├── app/api/revenues/
│   ├── route.ts                    # GET (list), POST (create) - 226 lines
│   └── [id]/
│       ├── route.ts                # GET, PUT, DELETE - 230 lines
│       ├── lock/route.ts           # 3-tier lock - 114 lines
│       ├── unlock/route.ts         # 3-tier unlock - 114 lines
│       └── history/route.ts        # Audit trail - 62 lines
├── components/revenues/
│   ├── revenue-form.tsx            # CRUD form - 343 lines
│   ├── revenue-table.tsx           # Data table - 379 lines
│   ├── revenue-summary-card.tsx    # Summary stats
│   ├── revenue-lock-dialog.tsx     # Lock UI
│   ├── revenue-history-panel.tsx   # History UI
│   └── index.ts                    # Barrel export
├── config/revenue-config.ts        # Constants - 53 lines
└── lib/
    └── revenue-history.ts          # Audit utility - 71 lines
```

### 1.2 API Endpoints Summary

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/revenues` | GET | ✅ | List with filters |
| `/api/revenues` | POST | ✅ | Create revenue |
| `/api/revenues/[id]` | GET | ✅ | Get single |
| `/api/revenues/[id]` | PUT | ✅ | Update |
| `/api/revenues/[id]` | DELETE | ✅ | Delete |
| `/api/revenues/[id]/lock` | POST | ✅ | 3-tier lock |
| `/api/revenues/[id]/unlock` | POST | ✅ | 3-tier unlock |
| `/api/revenues/[id]/history` | GET | ✅ | Audit trail |

**Total: 7 endpoints (per README: 7 claimed)**

---

## 2. Comparison: Implementation vs Workflow Document

### 2.1 ✅ Đã Implement

| Feature | Location | Notes |
|---------|----------|-------|
| Revenue CRUD | `/api/revenues/*` | Full REST API |
| Revenue ID Generation | `lib/id-utils.ts` | Format: `{BookingCode}-{timestamp}-{row}` |
| Multi-currency support | `revenue-config.ts` | VND, USD, EUR, GBP, AUD, JPY, SGD, THB |
| Exchange rate calculation | `route.ts:172` | `amountVND = foreignAmount * exchangeRate` |
| Payment types | Config | DEPOSIT, FULL_PAYMENT, PARTIAL, REFUND |
| Payment sources | Config | BANK_TRANSFER, CASH, CARD, PAYPAL, WISE, OTHER |
| 3-tier lock system | `/api/revenues/[id]/lock` | KT → Admin → Final |
| Audit trail (History) | `/api/revenues/[id]/history` | CREATE, UPDATE, LOCK_*, UNLOCK_* |
| Types definition | `types/index.ts:201-245` | Revenue, RevenueFormData |
| UI Components | `components/revenues/*` | Table, Form, Summary, Lock Dialog |
| Permission check | API routes | `revenue:view`, `revenue:manage` |
| Booking link | Form | Via `requestId` (relational) |

### 2.2 ❌ Còn Thiếu (So với Workflow Document)

| Feature | Workflow Section | Priority | Notes |
|---------|------------------|----------|-------|
| **Sale Sheet aggregation** | 6.2, 6.3 | HIGH | Workflow yêu cầu tổng hợp Revenue → Sale summary per booking |
| **Show Report** | 6.3 | HIGH | Báo cáo Profit = Total Revenue - Total Cost per booking |
| **BookingCalculate sync** | 6.3 | MEDIUM | Auto-calculate K(Sale) = SUM(K(Revenue)) by BookingCode |
| **BK_Request_code_Revenue lookup** | 6.3 | MEDIUM | Auto-fill customer info from master |
| **Auto customer info sync** | 6.4 | LOW | AutoSynCustomerInfo function |
| **Error Boundary** | Best practice | LOW | No ErrorBoundary in revenues page |
| **safeFetch usage** | Code standard | LOW | revenue-form.tsx uses raw fetch |
| **Zod validation (API)** | Best practice | MEDIUM | Manual validation, no Zod schema |

### 2.3 Partially Implemented

| Feature | Status | Gap |
|---------|--------|-----|
| Profit Report | `/api/reports/profit` exists | Revenue page không có link navigation |
| Lock validation | 3-tier implemented | PUT/DELETE check legacy `isLocked`, not 3-tier |

---

## 3. Technical Issues Identified

### 3.1 404 Error Analysis - **ROOT CAUSE FOUND**

**Issue:** Navigation link mismatch

```typescript
// Header.tsx line 25
{ name: 'Revenue', href: '/revenue' }    // ❌ WRONG - singular

// Actual route location
src/app/(dashboard)/revenues/page.tsx    // ✅ CORRECT - plural
```

**Fix Required:**
```typescript
// Header.tsx line 25 - change to:
{ name: 'Revenue', href: '/revenues' }   // ✅ Match route
```

**Impact:** Users clicking "Revenue" nav link get 404 because Next.js looks for `/revenue/page.tsx` but file is at `/revenues/page.tsx`

### 3.2 Code Quality Issues

| Issue | Location | Severity |
|-------|----------|----------|
| No Zod schema | `/api/revenues/route.ts` | MEDIUM |
| Raw fetch | `revenue-form.tsx:156` | LOW |
| No AbortController | `revenues/page.tsx:102` | LOW |
| Legacy `isLocked` check | `/api/revenues/[id]/route.ts:97` | MEDIUM |
| No Error Boundary | `revenues/page.tsx` | LOW |

### 3.3 3-Tier Lock Inconsistency

**PUT endpoint (line 97):**
```typescript
if (existing.isLocked) { // Uses legacy field
  return NextResponse.json({ error: 'Thu nhập đã khóa' });
}
```

**Should check:**
```typescript
if (existing.lockKT || existing.lockAdmin || existing.lockFinal) {
  // Block edit if any tier locked
}
```

---

## 4. Task List for Revenue Module Completion

### Priority 1: Critical (Workflow Compliance)

| # | Task | Est. Effort |
|---|------|-------------|
| 1 | Add Profit Report navigation from Revenue page | Small |
| 2 | Fix 3-tier lock check in PUT/DELETE endpoints | Small |
| 3 | Implement Sale summary aggregation API (`/api/sales`) | Medium |
| 4 | Add BookingCalculate endpoint for revenue aggregation | Medium |

### Priority 2: High (Code Quality)

| # | Task | Est. Effort |
|---|------|-------------|
| 5 | Add Zod validation schema for revenue API | Small |
| 6 | Replace raw fetch with safeFetch in revenue-form.tsx | Small |
| 7 | Add AbortController to fetchRevenues | Small |
| 8 | Verify navigation link in Header.tsx | Small |

### Priority 3: Medium (Enhancements)

| # | Task | Est. Effort |
|---|------|-------------|
| 9 | Add Error Boundary wrapper to revenues page | Small |
| 10 | Add auto-fill customer info from request | Medium |
| 11 | Implement Show report (Profit by booking) | Medium |

### Priority 4: Low (Nice-to-have)

| # | Task | Est. Effort |
|---|------|-------------|
| 12 | Add BK_Request_code_Revenue sync utility | Medium |
| 13 | Vietnamese accent fix in UI labels | Small |

---

## 5. Recommendations

### 5.1 Systems Designer

- **Current**: Revenue links to Request via `requestId`
- **Gap**: No direct Sale/Show aggregation tables in database
- **Action**: Consider adding `SaleSummary` model or computed view

### 5.2 Technology Strategist

- **Pattern**: API uses inline validation (not Zod)
- **Recommendation**: Add Zod schemas for type safety + error messages
- **Consistency**: Operators module uses similar pattern, align both

### 5.3 Scalability Consultant

- **Current**: Fetches up to 100 revenues per page
- **Fine for MVP**: Current scale is acceptable
- **Future**: Add pagination UI if >1000 records expected

### 5.4 Risk Analyst

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 404 error blocking users | HIGH | HIGH | Verify navigation/middleware |
| Data edit after partial lock | MEDIUM | HIGH | Fix 3-tier check in PUT |
| Inconsistent lock state | LOW | MEDIUM | Migrate `isLocked` → 3-tier |

---

## 6. Summary

**Completion Status: ~75%**

| Category | Implemented | Total | % |
|----------|-------------|-------|---|
| API Endpoints | 7 | 7 | 100% |
| UI Components | 6 | 6 | 100% |
| Workflow Features | 8 | 12 | 67% |
| Code Standards | 4 | 8 | 50% |

**Critical Next Steps:**
1. Debug 404 error (verify navigation link)
2. Fix 3-tier lock check in PUT/DELETE
3. Add Profit Report link
4. Implement Sale aggregation (per workflow)

---

## Unresolved Questions

1. Is `SaleSummary` intended as a DB model or computed on-the-fly?
2. Should `isLocked` legacy field be migrated/removed?
3. Is Google Sheets sync required for Revenue (like Operator)?
