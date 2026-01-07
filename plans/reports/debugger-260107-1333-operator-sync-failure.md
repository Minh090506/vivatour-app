# Operator Sync Failure Investigation

**Date**: 2026-01-07 13:33
**Status**: ROOT CAUSE IDENTIFIED
**Impact**: 2021 failed records, 0 synced

---

## Executive Summary

**Root Cause**: Request sheet column mapping mismatch
- Expected: Column A = Request Code (`20260427MAK`)
- Actual: Column A = Seller Name (`Bao - Kevin`, `Huyền - Hera`)
- **Request code is in Column T(19)**, not Column A(0)

**Impact**: All 2021 Operator sync attempts failed with "Request not found" errors because Operator mapper extracts `requestCode` from Column A, but Request mapper stores seller names as `code` field.

**Business Impact**: 100% failure rate, no operator data synced

---

## Error Patterns (Top 10)

| Count | Request Code | Sample Rows |
|-------|--------------|-------------|
| 16 | 20260427MAK | 3030, 3029, 3028, 3025, 3024 |
| 12 | 20260401JUK | 2986, 2985, 2984, 2983, 2982 |
| 7 | 20260304GUL | 2932, 2931, 2930, 2929, 2928 |
| 6 | 20260302KET | 2918, 2917, 2916, 2915, 2914 |
| 5 | 20260311JOH | 2960, 2959, 2958, 2957, 2956 |
| 5 | 20260307DAY | 2949, 2948, 2947, 2946, 2945 |
| 5 | 20260204PAH | 2877, 2876, 2875, 2874, 2873 |
| 4 | 20260418MSM | 2998, 2997, 2996, 2995 |
| 4 | 20260409RAY | 2991, 2990, 2989, 2988 |
| 4 | 20260323BER | 2965, 2964, 2963, 2962 |

**Pattern**: All errors = "Request not found: {code}"

---

## Database State Analysis

### Request Table
- Total records: 12
- Stored codes: `Saler`, `Huyền - Hera`, `Vy`, `Tu - Tony`, `Ngoc - Rachel`, etc.
- These are **seller names**, NOT request codes

### Sync Logs
- Request syncs: 4388 SUCCESS, 0 FAILED
- Operator syncs: 0 SUCCESS, 2021 FAILED
- Revenue syncs: Not checked

### Foreign Key Lookups
None of the failing request codes exist in database:
- `20260427MAK` → NOT FOUND
- `20260401JUK` → NOT FOUND
- `20260505LER` → NOT FOUND
- (All codes not found)

---

## Actual vs Expected Sheet Structure

### Request Sheet (Actual)
```
A(0):  Seller              ← WRONG: Mapped as "code"
B(1):  Name
C(2):  Contact
...
T(19): Mã khách           ← CORRECT: This is the request code!
```

### Request Mapper (Current - INCORRECT)
```typescript
// src/lib/sheet-mappers.ts lines 146-160
const [
  code,           // A(0) = Seller name (WRONG!)
  customerName,   // B(1) = Name
  contact,        // C(2) = Contact
  country,        // D(3) = What'sapp (WRONG!)
  source,         // E(4) = Pax (WRONG!)
  ...
] = row;
```

**All column positions are wrong!**

### Operator Mapper (Tries to find wrong codes)
```typescript
// src/lib/sheet-mappers.ts line 233
const requestCode = row[0]; // A: Mã khách

// Line 120-122 in route.ts
const request = await prisma.request.findUnique({
  where: { code: data.requestCode }, // Looking for "20260427MAK"
});
// ❌ Finds nothing because DB has "Saler", "Huyền - Hera", etc.
```

---

## Sample Failed Rows

**Row 2**: Request not found: `20251007ALK`
**Row 3**: Request not found: `20251007ALK`
**Row 4**: Request not found: `20251007ALK`
**Row 5**: Request not found: `20251007ALK`
**Row 6**: Request not found: `20251007ALK`

---

## Recommended Fix

### Immediate Actions

1. **Fix Request Mapper Column Indices** (`src/lib/sheet-mappers.ts`)
   ```typescript
   // Correct mapping based on actual sheet:
   const seller = row[0];         // A: Seller
   const customerName = row[1];   // B: Name
   const contact = row[2];        // C: Contact
   const whatsapp = row[3];       // D: What'sapp
   const pax = row[4];            // E: Pax
   const country = row[5];        // F: Quốc gia
   const source = row[6];         // G: Nguồn
   const status = row[7];         // H: Trạng thái
   const receivedDate = row[8];   // I: Ngày Tiếp nhận RQ
   const tourDays = row[9];       // J: Số ngày đi Tour
   const startDate = row[10];     // K: Ngày dự kiến đi
   const expectedRevenue = row[11]; // L: DT dự kiến
   const expectedCost = row[12];  // M: Chi phí dự kiến
   const notes = row[13];         // N: Ghi chú
   const code = row[19];          // T: Mã khách ← THE CORRECT CODE!
   ```

2. **Delete Incorrect Data**
   ```sql
   -- Clear bad request data
   DELETE FROM "Request" WHERE code IN ('Saler', 'Huyền - Hera', 'Vy', ...);

   -- Clear all sync logs to restart
   DELETE FROM "SyncLog" WHERE "sheetName" IN ('Request', 'Operator');
   ```

3. **Re-sync in Order**
   - Sync Request sheet first (with corrected mapper)
   - Verify request codes are correct format (`20260427MAK`)
   - Then sync Operator sheet

### Preventive Measures

1. **Add Header Validation**
   - Read header row before sync
   - Validate expected columns exist
   - Log warning if mismatch detected

2. **Add Sample Row Test**
   ```typescript
   // In sheet-mappers.ts
   export function validateRequestRow(row: string[]) {
     const code = row[19];
     // Check if code matches format YYYYMMDDXXX
     if (!/^\d{8}[A-Z]{3}$/.test(code)) {
       throw new Error(`Invalid code format at T(19): ${code}`);
     }
   }
   ```

3. **Add Integration Test**
   - Mock sheet data with known structure
   - Test mapper extracts correct values
   - Verify foreign key relationships work

---

## Unresolved Questions

1. Should we preserve the 12 incorrectly synced requests or delete?
2. Are Operator and Revenue sheet column mappings also wrong?
3. Should sync validate request codes exist before creating operators?
4. Need automated header validation before sync?
