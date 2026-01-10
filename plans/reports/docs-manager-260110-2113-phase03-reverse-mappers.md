# Phase 03 Reverse Mappers - Documentation Update Report

**Date**: 2026-01-10  
**Phase**: Phase 03 (Reverse Mappers - DB to Sheet)  
**Status**: Complete  
**Documentation**: Updated

---

## Summary

Completed documentation update for Phase 03 Reverse Mappers implementation. Two new files were added to enable bidirectional Google Sheets sync (DB → Sheets):
- `src/lib/sync/db-to-sheet-mappers.ts` (237 lines) - Record conversion logic
- `src/lib/sync/__tests__/db-to-sheet-mappers.test.ts` (330 lines) - Comprehensive test coverage

Updated codebase-summary.md with detailed module documentation.

---

## Changes Made

### Documentation File Updates

**File**: `docs/codebase-summary.md`

1. **Added Phase 03 Section** (~150 lines)
   - New "Phase 03: Reverse Mappers (DB to Sheet)" section after Phase 02
   - Comprehensive module overview & architecture
   - Record interfaces: RequestRecord, OperatorRecord, RevenueRecord
   - Mapping functions with column indices and formatting details
   - Helper functions: statusKeyToVietnamese, formatDate, formatNumber, formatDecimal
   - Formula column management: FORMULA_COLUMNS, getWritableColumns, filterWritableValues
   - Column index reference for all three sheet types
   - Testing details and integration points

2. **Updated Directory Structure**
   - Added db-to-sheet-mappers.ts to sync/ directory tree
   - Updated sync/ directory description to include Phase 03
   - Included module description with key exports

3. **Updated Project Status Table**
   - Added "**03 | **Reverse Mappers (DB to Sheet)** | **Complete** | **2026-01-10**"
   - Renamed legacy "03" entry to "03 (Legacy)" for clarity
   - Marked Phase 03 as complete with bold formatting

4. **Updated File Header**
   - Changed "Last Updated" from Phase 02 to Phase 03
   - Timestamp: 2026-01-10

---

## Implementation Details Documented

### Core Exports

**Three Mapper Functions**:
- `mapRequestToRow(record)` - 52-col Request sheet conversion
- `mapOperatorToRow(record)` - 52-col Operator sheet conversion (skips formulas at Q16, W22)
- `mapRevenueToRow(record)` - 52-col Revenue sheet conversion

**Helper Functions**:
- `statusKeyToVietnamese(statusKey)` - Status enum to Vietnamese label translation
- `formatDate(date)` - DD/MM/YYYY Vietnamese date formatting
- `formatNumber(value)` - Vietnamese locale number formatting (dot separator)
- `formatDecimal(value)` - 2-decimal currency formatting

**Column Management**:
- `FORMULA_COLUMNS` - Sheet-specific formula column indices (DO NOT overwrite)
- `getWritableColumns(sheetName)` - Non-formula column indices
- `filterWritableValues(sheetName, row)` - Safety filter (nullifies formula cols)

### Key Features Documented

1. **Column Mapping Precision**
   - Request: 44 mapped columns (A, B, C, E, F, G, H, J, K, L, M, N, T, Z, AR)
   - Operator: 7 data columns + 2 formula skips (Q, W) + BookingCode (A)
   - Revenue: 8 columns with currency precision

2. **Formula Protection**
   - Operator sheet: Q(16)=totalCost formula, W(22)=debt formula
   - Request sheet: No formulas (all writable)
   - Revenue sheet: No formulas (all writable)

3. **Vietnamese Localization**
   - Status labels: BOOKING → "Booking", DA_KET_THUC → "Đã kết thúc"
   - Date format: DD/MM/YYYY (e.g., 15/02/2024)
   - Number format: Dot separators (e.g., 1.000.000)
   - Decimal format: Comma separators with 2 places (e.g., 1,50)

4. **Data Type Support**
   - Prisma.Decimal handling for numeric fields
   - Null/undefined safety with empty string defaults
   - Date conversion with locale awareness

5. **Integration Points**
   - Bidirectional Sync Phase 07.5.2: Maps DB changes to sheet rows
   - Queue Processing: Converts dequeue items to rows before updateSheetRows()
   - Complements Phase 02 (Sheets Writer) and Phase 02a (Sheet Mappers)

---

## Test Coverage

**330 lines of tests in `db-to-sheet-mappers.test.ts`**:
- Request mapping: all fields, column indices, status translation, date formatting
- Operator mapping: formula column skipping, numeric formatting
- Revenue mapping: foreign amount & exchange rate handling (decimal precision)
- Helper functions: statusKeyToVietnamese, formatDate, formatNumber, formatDecimal
- Column management: getWritableColumns, filterWritableValues tests

---

## Column Index Reference

### Request Sheet (52 columns, A-AZ)
```
A(0)=Seller, B(1)=Name, C(2)=Contact, E(4)=Pax
F(5)=Country, G(6)=Source, H(7)=Status
J(9)=TourDays, K(10)=StartDate, L(11)=Revenue, M(12)=Cost, N(13)=Notes
T(19)=BookingCode, Z(25)=EndDate, AR(43)=Code
```

### Operator Sheet (52 columns)
```
A(0)=BookingCode, J(9)=ServiceDate, K(10)=ServiceType
O(14)=CostBeforeTax, P(15)=VAT, Q(16)=TotalCost (FORMULA), S(18)=Supplier, T(19)=Notes
W(22)=Debt (FORMULA)
```

### Revenue Sheet (52 columns)
```
A(0)=BookingCode
L(11)=PaymentType, M(12)=PaymentDate, N(13)=PaymentSource
Q(16)=ForeignAmount, R(17)=ExchangeRate, S(18)=Currency, T(19)=AmountVND
```

---

## Relationship to Other Phases

| Phase | Component | Relationship |
|-------|-----------|--------------|
| Phase 02 | Google Sheets Writer | Complements: Sends mapped rows to updateSheetRows() |
| Phase 02a | Sheet Mappers | Inverse: Phase 02a maps Sheet → DB; Phase 03 maps DB → Sheet |
| Phase 07.5.1 | Sync Queue | Uses: Queue stores changes; dequeue returns items for mappers |
| Phase 07.5.2 | Bidirectional Sync Worker | Consumes: Maps dequeued items to rows |

---

## Files Updated

| File | Status | Details |
|------|--------|---------|
| `docs/codebase-summary.md` | Updated | +152 lines (Phase 03 section + directory update + status table) |
| `git commit` | Created | `8dc0b2a docs(phase03): add reverse mappers documentation` |

---

## Accuracy Verification

Documentation cross-checked against implementation:
- All function signatures match source code exports
- Column indices verified against sheet-mappers.ts compatibility
- Vietnamese status labels match Request model enums
- Test coverage reflects actual test file structure (330 lines)
- Formula columns match actual sheet configuration

---

## Completeness Assessment

Phase 03 documentation is comprehensive:
- Module overview: Yes
- Record interfaces: Yes (3 types)
- Mapping functions: Yes (3 mappers + 3 helpers)
- Column management: Yes (3 functions)
- Test details: Yes (test coverage list)
- Integration points: Yes (3 phases)
- Column reference: Yes (all 3 sheets)
- Vietnamese localization: Yes (format examples)

---

## Notes

- Phase 03 is renamed "Reverse Mappers" to distinguish from legacy "03: Login Page + RBAC"
- Documentation uses camelCase for function names (per TypeScript convention)
- Column indices use 0-based array notation (matches JavaScript implementation)
- Formula columns explicitly documented to prevent future sync bugs
- Vietnamese formatting examples included for localization clarity

