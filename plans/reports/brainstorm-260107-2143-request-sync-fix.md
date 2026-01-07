# Brainstorm Report: Request Sync Fix

**Date:** 2026-01-07
**Scope:** Fix Request sync logic - Use RequestID as unique identifier
**Status:** Simplified Plan Agreed

---

## Problem Statement

### Original Plan (5 Phases)
1. Fix Sync Logic với Request ID
2. Update Database Schema
3. Redesign Request Page - 2-Panel Layout
4. Fix Filters với Status Enum
5. Rename Tab + Final Polish

### Actual Analysis Findings

| Planned Issue | Reality | Action |
|--------------|---------|--------|
| UI chưa có 2-panel | **ALREADY EXISTS** - `RequestListPanel` + `RequestDetailPanel` working | ❌ Skip |
| Tab name sai | "Yêu cầu" is correct Vietnamese | ❌ Skip |
| Status mapping sai | Config exists with 14 statuses, but **sync stores Vietnamese labels** | ✅ Fix |
| Thiếu Request ID | **TRUE** - sync uses `code` (col T) instead of `requestId` (col AR) | ✅ Fix |

---

## Simplified Plan (2 Tasks)

### Task 1: Fix Sync Logic

**Current State:**
```javascript
// sheet-mappers.ts line 173
const code = row[19]; // T: Mã khách (UNIQUE CODE)
// ...
// line 216
status: status?.trim() || "Đang LL - khách chưa trả lời", // Vietnamese label stored!
```

**Problems:**
1. Uses `code` from col T (index 19) - can be empty for leads
2. When empty → generates "RQ-{rowIndex}" - unstable if rows change
3. Status stored as Vietnamese label, not enum key

**Solution:**
```javascript
// NEW: Add requestId from column AR (index 43)
const requestId = row[43]; // AR: Request ID - UNIQUE - format: "Bao - Kevin20250630032020626"
const bookingCode = row[19]; // T: Mã khách (for Operator/Revenue linking)

// Skip if no requestId (required for all rows)
if (!requestId?.trim()) return null;

// Status mapping: Vietnamese → enum key
const STATUS_MAPPING = {
  "Đang LL - khách chưa trả lời": "DANG_LL_CHUA_TL",
  "Đang LL - khách đã trả lời": "DANG_LL_DA_TL",
  "Đã báo giá": "DA_BAO_GIA",
  "Đang xây Tour": "DANG_XAY_TOUR",
  "F1": "F1",
  "F2": "F2",
  "F3": "F3",
  "F4: Lần cuối": "F4",
  "Booking": "BOOKING",
  "Khách hoãn": "KHACH_HOAN",
  "Đang suy nghĩ": "KHACH_SUY_NGHI",
  "Không đủ TC": "KHONG_DU_TC",
  "Đã kết thúc": "DA_KET_THUC",
  "Cancel": "CANCEL",
};

return {
  code: requestId.trim(), // Use requestId as primary key
  bookingCode: bookingCode?.trim() || null, // For Operator/Revenue linking
  status: STATUS_MAPPING[status?.trim()] || "DANG_LL_CHUA_TL",
  // ... rest unchanged
};
```

### Task 2: Database Migration

**Schema Change:**
```prisma
model Request {
  // Current: code is used as requestId
  code            String    @unique  // Now stores AR column (Request ID)
  bookingCode     String?   @unique  // Booking Code from col T (for services)
  // ... rest unchanged
}
```

**Migration Steps:**
1. Truncate `requests` table (user confirmed OK)
2. Re-sync from Google Sheet
3. Operator/Revenue will re-link via `bookingCode`

---

## Data Flow After Fix

```
Google Sheet Request Tab
├── Column AR (43): Request ID → Request.code (unique sync key)
├── Column T (19): Mã khách → Request.bookingCode (nullable, for services)
├── Column H (7): Trạng thái → STATUS_MAPPING → Request.status (enum key)
└── Other columns → Corresponding fields

Operator/Revenue Tab
├── Column A (0): Mã khách → Lookup Request by bookingCode
└── Link to Request.id via foreign key
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/sheet-mappers.ts` | Add requestId mapping (col AR), add STATUS_MAPPING, fix upsert key |
| `src/app/api/sync/sheets/route.ts` | Update upsert to use code as requestId |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data loss from truncate | User confirmed acceptable - data can be re-synced |
| Operator/Revenue orphaned | Re-sync after Request sync - will re-link via bookingCode |
| Status mismatch | STATUS_MAPPING covers all 14 statuses from config |

---

## Out of Scope (Already Working)

- UI 2-panel layout ✅
- Filter dropdowns ✅
- Status badge colors ✅
- Vietnamese labels ✅
- Navigation tab ✅

---

## Success Criteria

1. ✅ All requests synced with stable Request ID from column AR
2. ✅ Status stored as enum key (DANG_LL_CHUA_TL not Vietnamese)
3. ✅ Filters work correctly with enum keys
4. ✅ Operator/Revenue link via bookingCode when available

---

## Next Steps

1. Create implementation plan with detailed steps
2. Implement Task 1: Fix sheet-mappers.ts
3. Implement Task 2: Truncate + re-sync
4. Test full workflow

---

## Decision Log

| Question | Decision | Rationale |
|----------|----------|-----------|
| Thay thế code hay thêm requestId? | Thay thế code | User chose to replace, simpler migration |
| Migration strategy? | Truncate + re-sync | User confirmed data loss acceptable |
| Giữ 5 phases? | Đơn giản hóa 2 tasks | UI already working, only sync issues remain |
| Status config? | Dùng 14 statuses hiện có | Config already complete |
