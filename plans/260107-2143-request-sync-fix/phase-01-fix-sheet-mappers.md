# Phase 01: Fix Sheet Mappers

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Brainstorm**: `plans/reports/brainstorm-260107-2143-request-sync-fix.md`

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-07 |
| Priority | P1 |
| Implementation Status | Pending |
| Review Status | N/A |

## Key Insights

1. Current sync uses `row[19]` (col T - Mã khách) as unique key
2. When col T empty → generates `RQ-{rowIndex}` - unstable if rows shift
3. Status stored as Vietnamese label, not enum key
4. Column AR (index 43) contains stable Request ID for all rows

## Requirements

1. Add `VIETNAMESE_TO_STATUS_KEY` mapping constant
2. Read Request ID from `row[43]` (column AR)
3. Keep booking code from `row[19]` for Operator/Revenue linking
4. Map status Vietnamese → enum key
5. Update `RequestRowData` interface to include `bookingCode`

## Related Code Files

| File | Purpose |
|------|---------|
| `src/lib/sheet-mappers.ts` | Main mapper - mapRequestRow function |
| `src/config/request-config.ts` | Status enum definitions (reference only) |

## Implementation Steps

### Step 1: Add Status Mapping Constant

Add after line 14 (after Decimal import):

```typescript
/**
 * Map Vietnamese status labels to enum keys
 * Must match REQUEST_STATUSES in src/config/request-config.ts
 */
const VIETNAMESE_TO_STATUS_KEY: Record<string, string> = {
  "Đang LL - khách chưa trả lời": "DANG_LL_CHUA_TL",
  "Đang LL - chưa trả lời": "DANG_LL_CHUA_TL",
  "Đang LL - khách đã trả lời": "DANG_LL_DA_TL",
  "Đang LL - đã trả lời": "DANG_LL_DA_TL",
  "Đã báo giá": "DA_BAO_GIA",
  "Đang xây Tour": "DANG_XAY_TOUR",
  "F1": "F1",
  "F2": "F2",
  "F3": "F3",
  "F4": "F4",
  "F4: Lần cuối": "F4",
  "Lần cuối": "F4",
  "Booking": "BOOKING",
  "Khách hoãn": "KHACH_HOAN",
  "Đang suy nghĩ": "KHACH_SUY_NGHI",
  "Không đủ TC": "KHONG_DU_TC",
  "Đã kết thúc": "DA_KET_THUC",
  "Cancel": "CANCEL",
};

/**
 * Convert Vietnamese status label to enum key
 */
function mapVietnameseToStatusKey(vietnameseLabel: string | undefined): string {
  if (!vietnameseLabel?.trim()) return "DANG_LL_CHUA_TL";
  return VIETNAMESE_TO_STATUS_KEY[vietnameseLabel.trim()] || "DANG_LL_CHUA_TL";
}
```

### Step 2: Update RequestRowData Interface

Add `bookingCode` field:

```typescript
export interface RequestRowData {
  code: string;          // Now: Request ID from column AR
  bookingCode: string | null;  // NEW: Booking code from column T (for Operator/Revenue)
  customerName: string;
  // ... rest unchanged
}
```

### Step 3: Update mapRequestRow Function

Update column extraction (around line 161-174):

```typescript
// Extract by actual column indices
const sellerName = row[0];     // A: Seller
const customerName = row[1];   // B: Name
const contact = row[2];        // C: Contact
const pax = row[4];            // E: Pax
const country = row[5];        // F: Quốc gia
const source = row[6];         // G: Nguồn
const status = row[7];         // H: Trạng thái
const tourDays = row[9];       // J: Số ngày đi Tour
const startDate = row[10];     // K: Ngày dự kiến đi
const expectedRevenue = row[11]; // L: DT dự kiến
const expectedCost = row[12];  // M: Chi phí dự kiến
const notes = row[13];         // N: Ghi chú
const bookingCode = row[19];   // T: Mã khách (for Operator/Revenue linking)
const endDate = row[25];       // Z: Ngày dự kiến kết thúc
const requestId = row[43];     // AR: Request ID - UNIQUE SYNC KEY
```

Update skip conditions:

```typescript
// Skip if no Request ID (required for all rows)
if (!requestId?.trim()) {
  return null;
}

// Skip header rows
if (requestId === "Request ID" || sellerName === "Seller") {
  return null;
}

// Skip if no seller (required)
if (!sellerName?.trim()) {
  return null;
}

// Skip if no customer name (required)
if (!customerName?.trim() || customerName === "Name") {
  return null;
}
```

Remove old code generation logic and update return:

```typescript
return {
  code: requestId.trim(),  // Use Request ID as unique sync key
  bookingCode: bookingCode?.trim() || null,  // For Operator/Revenue linking
  customerName: customerName.trim(),
  contact: contact?.trim() || "",
  country: country?.trim() || "Unknown",
  source: source?.trim() || "Other",
  status: mapVietnameseToStatusKey(status),  // Map to enum key
  stage: mapStatusToStage(status),
  pax: parseInt(pax) || 1,
  // ... rest unchanged
};
```

### Step 4: Update Sync Route for Operator/Revenue

File: `src/app/api/sync/sheets/route.ts`

Update Operator sync (line 120-122):

```typescript
// Find the request by bookingCode (not code which is now requestId)
const request = await prisma.request.findFirst({
  where: { bookingCode: data.requestCode },
});
```

Update Revenue sync (line 189-191):

```typescript
// Find the request by bookingCode
const request = await prisma.request.findFirst({
  where: { bookingCode: data.requestCode },
});
```

## Todo List

- [ ] Add VIETNAMESE_TO_STATUS_KEY constant
- [ ] Add mapVietnameseToStatusKey helper function
- [ ] Update RequestRowData interface (add bookingCode)
- [ ] Update mapRequestRow column extraction
- [ ] Update mapRequestRow skip conditions
- [ ] Update mapRequestRow return object
- [ ] Update syncOperatorSheet to lookup by bookingCode
- [ ] Update syncRevenueSheet to lookup by bookingCode

## Success Criteria

- [ ] mapRequestRow uses row[43] as code (unique key)
- [ ] mapRequestRow outputs bookingCode from row[19]
- [ ] Status output is enum key (not Vietnamese label)
- [ ] TypeScript compiles without errors

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Missing status in mapping | Low | Fallback to DANG_LL_CHUA_TL |
| Operator/Revenue link broken | Medium | Use bookingCode for lookup |

## Security Considerations

None - internal sync logic only.

## Next Steps

After this phase: Execute Phase 2 (Truncate + Re-sync)
