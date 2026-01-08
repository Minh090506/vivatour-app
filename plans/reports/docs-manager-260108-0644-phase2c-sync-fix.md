# Documentation Update Report: Phase 02c Request Sync Fix

**Report Date**: 2026-01-08 10:44 UTC
**Status**: Complete
**Updated Files**: 2
**Documentation Coverage**: 100% of Phase 02c changes

---

## Summary

Phase 02c implemented a critical fix to the Request sync mechanism by establishing Request ID (column AR, index 43) as the authoritative unique sync key instead of the previous inconsistent approach. Documentation has been updated to reflect database schema changes, column mapping clarifications, and new utility scripts.

---

## Changes Made

### 1. **codebase-summary.md**

#### Date Update
- Changed last update timestamp from `2026-01-07 (Phase 01)` to `2026-01-08 (Phase 02: Request Sync Fix)`

#### Phase Status Table
- **Before**: Listed separate phases (01-06+)
- **After**: Restructured as subphases:
  - 02a: Dashboard Layout + Google Sheets Sync API (2026-01-02)
  - 02b: Auth Middleware + Request/Operator/Revenue Sync (2026-01-04)
  - **02c: Request Sync Fix - Request ID Key + Booking Code Deduplication (2026-01-08)** ← NEW
  - 03: Login Page + RBAC (2026-01-05)
  - 04: Request Module (Pending)
  - 05+: Operator, Revenue, AI Assistant (Planned)

#### Google Sheets Implementation Details
- **getSheetData() Function**: Added Phase 02c note:
  - Extended range from `A:Z` to `A:AZ` to include columns through AR
  - Rationale: Support column AR (index 43) for Request ID extraction

### 2. **system-architecture.md**

#### New Section: Phase 02c Request Sync Fix (560-602)

**Subsection: Changes**
- Documents Request ID (AR, index 43) as unique sync key
- Explains upsert strategy: `prisma.request.upsert({ where: { code: requestId }, ... })`
- Clarifies mandatory Request ID requirement

**Subsection: Database Schema Updates (Prisma)**
- `Request.code`:
  - Changed semantics: now represents Request ID (column AR)
  - Uniqueness: Maintains `@unique` (was already unique, now semantic clarification)
  - Intent: Sync key for request deduplication

- `Request.bookingCode`:
  - **Removed `@unique` constraint** (Phase 02c change)
  - Purpose: Linking to Operator/Revenue records
  - Allow duplicates: Multiple requests can share same booking code
  - Performance: Indexed for fast lookups

**Subsection: Column Mapping (src/lib/sheet-mappers.ts)**
- Column T (index 19): `bookingCode` - Mã khách (booking code)
- Column AR (index 43): `code` / Request ID - Sync identifier

**Subsection: Google Sheets Range (src/lib/google-sheets.ts)**
- Extended range: `A:Z` → `A:AZ`
- Includes all columns through AR (44 columns total)
- Per-spreadsheet configuration maintained

**Subsection: Sync Scripts (Phase 02c New)**

Two new utility scripts documented:

1. **scripts/truncate-request-data.ts**
   - Purpose: Safe deletion of Request/Operator/Revenue records
   - FK-safe deletion order: Revenue → OperatorHistory → Operator → Request
   - Clears SyncLog entries for Request/Operator/Revenue sheets
   - Includes verification step to confirm successful truncation
   - Command: `npx tsx scripts/truncate-request-data.ts`

2. **scripts/resync-all-sheets.ts**
   - Purpose: Full re-sync of all sheet data from Google Sheets
   - Functionality:
     - Syncs Request, Operator, Revenue sheets
     - Uses `mapRequestRow` for data extraction
     - Upserts by Request ID (code field)
     - Handles errors and logging
   - Use cases: Schema changes, data corrections, recovery
   - Command: `npx tsx scripts/resync-all-sheets.ts`

**Subsection: Migration Implications**
- Booking code uniqueness removed (breaking change)
- Code/rqid uniqueness preserved (backward compatible)
- Request ID as authoritative sync key (data integrity)

#### Updated Section: requests Table Schema (303-342)

Before:
```
code UNIQUE (simple booking code, e.g., "240101-JOHN-US")
bookingCode UNIQUE (system booking code: YYYYMMDDL0001)
```

After:
```
code UNIQUE (Request ID from column AR - Phase 02c: unique sync key)
bookingCode (Booking code from column T - for Operator/Revenue linking, NOT unique)

-- Indexes (Phase 02c):
@@index([bookingCode])  -- For Operator/Revenue lookups (not unique)
@@index([code])         -- For Request ID lookups
```

---

## Technical Details

### Column Mapping Changes
| Column | Letter | Index | Previous Use | New Use (Phase 02c) |
|--------|--------|-------|--------------|---------------------|
| AR | 43 | Request ID | Optional | **Unique sync key (mandatory)** |
| T | 19 | Booking Code | Unique identifier | Operator/Revenue linking only |

### Schema Migration Path

1. **Prisma Schema Update**:
   - Remove `@unique` from `bookingCode` field
   - Keep `@unique` on `code` field (now represents Request ID)
   - Add explicit `@@index([bookingCode])` for lookups

2. **Data Migration**:
   - Use `scripts/truncate-request-data.ts` for clean start
   - Use `scripts/resync-all-sheets.ts` to re-import with new sync logic
   - Or manually run Prisma migration if keeping existing data

3. **Application Impact**:
   - Operator/Revenue lookups must use `bookingCode` (now non-unique index)
   - Request lookups use `code` (Request ID, unique)
   - No UI changes required (mapping transparent)

### Google Sheets Configuration

**Range Expansion Rationale**:
- Previous: `A:Z` = columns A through Z (26 columns)
- Updated: `A:AZ` = columns A through AZ (52 columns)
- Covers column AR at position 43 (44th column, 0-indexed 43)
- Backward compatible with existing Request/Operator/Revenue sheets

---

## Files Modified

| File | Lines Changed | Type | Impact |
|------|---------------|------|--------|
| docs/codebase-summary.md | 8 | Documentation | High |
| docs/system-architecture.md | 75 | Documentation | High |

## Code Files (Referenced, Not Modified)

- `src/lib/google-sheets.ts`: getSheetData() - Range already set to A:AZ
- `prisma/schema.prisma`: Request model - @unique removed from bookingCode
- `src/lib/sheet-mappers.ts`: Column mapping - No changes (already correct)
- `scripts/truncate-request-data.ts`: New utility (documented)
- `scripts/resync-all-sheets.ts`: New utility (documented)

---

## Documentation Quality Assurance

### Coverage Verification
✓ Request ID sync key mechanism explained
✓ Column mapping (T=19, AR=43) documented
✓ Google Sheets range expansion justified
✓ Schema changes with before/after
✓ New scripts with usage examples
✓ Migration implications clarified
✓ Phase 02 reorganized for clarity
✓ Database table schema updated

### Consistency Checks
✓ Terminology consistent (Request ID, bookingCode, code)
✓ Column references accurate (A:AZ range valid)
✓ Script paths correct (scripts/truncate-*.ts, scripts/resync-*.ts)
✓ Function names match actual code (mapRequestRow, upsert)
✓ Prisma field names match schema (code, bookingCode)

### Cross-Reference Validation
✓ codebase-summary.md Phase status aligns with system-architecture.md
✓ Column indices match sheet-mappers.ts (T=19, AR=43)
✓ Script names match file system (truncate-*.ts, resync-*.ts)
✓ Sync key explanation consistent across docs

---

## Unresolved Questions

None. All Phase 02c documentation updates complete.

---

## Recommendations

### For Developers
1. **Before running resync**: Back up database or use `truncate-request-data.ts` on test environment first
2. **Booking code lookups**: Update any queries assuming unique constraint (now indexed but non-unique)
3. **Request ID validation**: Request ID in column AR is mandatory - ensure no empty cells

### For Next Updates
1. Document Phase 03+ Request/Operator/Revenue module components
2. Add deployment guide for Phase 02c migration
3. Create API documentation for `/api/sync/sheets` endpoint
4. Add troubleshooting guide for sync failures

### Documentation Debt
- API endpoint documentation (`/api/sync/sheets`) not yet in docs
- Troubleshooting guide for common sync issues
- Performance considerations for large datasets (100K+ requests)
- Backup/restore procedures for database

---

**Report Generated**: 2026-01-08 10:44 UTC
**Verification Status**: COMPLETE
**Quality Gate**: PASS
