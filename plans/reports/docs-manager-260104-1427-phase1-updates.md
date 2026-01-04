# Documentation Update Report: Phase 1 Schema & Utils

**Date**: 2026-01-04
**Updated By**: docs-manager
**Status**: Complete

---

## Summary

Updated documentation for Phase 1: Schema & Utils Update of the Request Module Redesign, reflecting three significant code changes:

1. **ConfigUser Model Enhancement** - `sellerCode` made optional, `sellerName` field added
2. **Booking Code Generation** - New utility function with intelligent fallback logic
3. **BOOKING Status Transition** - Automatic booking code generation when status changes

---

## Files Updated

### 1. `docs/codebase-summary.md`

**Changes Made**:

#### Added Core Library Documentation
- Added `src/lib/request-utils.ts` (152 lines) to Core Libraries table
- Documents: ID generation, booking code generation, follow-up calculations

#### Updated Database Schema Table
- Updated Request model description: "Customer tour requests with booking codes"
- Added ConfigUser model entry: "User configuration (optional seller code, fallback name)"

#### New Section: Request Codes
Added subsection under "Data Models Overview":
```
- **code**: Simple booking code (e.g., "240101-JOHN-US")
- **bookingCode**: YYYYMMDD+SellerCode+Seq (e.g., "20260201L0005")
- **rqid**: Request ID: RQ-YYMMDD-0001
```

#### New Section: Request Utility Functions
Documented 7 utility functions from `src/lib/request-utils.ts`:
- `generateRQID()` - Sequential counter (daily reset)
- `generateBookingCode(startDate, sellerId)` - With fallback logic
- `calculateEndDate(startDate, tourDays)` - Inclusive calculation
- `calculateNextFollowUp(stage, lastContactDate)` - Stage-based scheduling
- `getSellerCode(userId)` - ConfigUser lookup
- `canUserViewAll(userId)` - Permission check
- `getFollowUpDateBoundaries()` - Date filtering helper

#### Updated Response Format
- Added optional `warning?: string` field to success response schema
- Reflects non-fatal warnings (e.g., "Đã chuyển khỏi Booking...")

---

### 2. `docs/system-architecture.md`

**Changes Made**:

#### Enhanced Request Table Schema
Expanded `requests` table documentation with new/updated fields:
- Added: `rqid`, `bookingCode` (with generation details)
- Added: `stage`, `startDate`, `endDate`, `lastContactDate`
- Added: `statusChangedAt`, `statusChangedBy` (FK to users)
- Updated descriptions with field purposes

#### New ConfigUser Table
Added complete `config_user` table schema documentation:
```sql
sellerCode (Optional: single char L, N, T, etc.)
sellerName (Optional: display name for reports/UI)
canViewAll (default: false)
```

#### Enhanced Indexing Strategy
Expanded indexing documentation:
- Added `bookingCode` index (lookup optimization)
- Added composite index `[sellerId, stage]` (common filters)
- Added `nextFollowUp` index (follow-up scheduling)
- Added `stage` index (LEAD, QUOTE, FOLLOWUP, OUTCOME)
- Added explanatory comments for each index

#### New Section: Request Processing Workflow
Added comprehensive "Booking Code Generation" subsection:
- **Trigger**: Status changes to BOOKING
- **Process**: 8-step workflow with fallback logic
  1. Client sends PUT with status=BOOKING, startDate
  2. API validates startDate (required)
  3. Calls generateBookingCode(startDate, sellerId)
  4. Lookup ConfigUser for sellerCode
  5. Fallback chain: sellerCode → name initial → 'X'
  6. Query existing codes for sequence
  7. Generate format: YYYYMMDD+code+seq
  8. Update bookingCode field

- **Example Flow**: Complete trace with SQL queries
- **Response**: Sample JSON showing bookingCode in response

---

## API Changes Documented

### PUT `/api/requests/[id]` - Status Change to BOOKING

**Validation Added**:
- Requires `startDate` field (error: "Cần nhập ngày bắt đầu tour trước khi chuyển Booking")
- Only triggers booking code generation on BOOKING status transition

**Automatic Actions**:
- Generates booking code using seller's config or fallback
- Updates `bookingCode` field atomically
- Tracks status change with `statusChangedAt` timestamp

**Warning Response**:
- When reverting from BOOKING status: returns warning about operators being preserved
- Response includes `warning` field alongside `data`

---

## ConfigUser Model Changes

### Database Schema Changes
- `sellerCode`: Changed from `String` to `String?` (optional)
  - Rationale: Allow fallback to name initial if not configured
- `sellerName`: Added new field `String?` (optional)
  - Purpose: Display name for reports and UI
  - Use case: Different from user.name for business/alias names

### Fallback Logic (Encoded in generateBookingCode)
1. If ConfigUser.sellerCode exists → use it
2. Else if ConfigUser.user.name exists → use first letter uppercase
3. Else → fallback to 'X'

---

## Technical Details

### Booking Code Format
- **Format**: `YYYYMMDD` + `sellerCode` + `sequence`
- **Example**: `20260201L0005` (2026-02-01, seller "L", sequence 0005)
- **Uniqueness**: Indexed and enforced at database level
- **Generation**: On-demand when status → BOOKING

### Sequence Generation
- Queries existing bookingCode with same date+seller prefix
- Extracts last 4 digits as sequence
- Increments for next request
- Pads with zeros: `padStart(4, '0')`

### Error Handling
- Missing startDate → 400 Bad Request
- Fallback to 'X' if no sellerCode and no user name
- All errors logged to console in API route

---

## Documentation Standards Applied

✓ **Case Sensitivity**: Correctly documented camelCase (sellerCode, sellerName, bookingCode)
✓ **Code Examples**: All TypeScript signatures match actual function definitions
✓ **API Responses**: Documented with JSON examples and field explanations
✓ **Database Schema**: Listed with SQL column names and types
✓ **Indexing**: Added composite indexes with explanatory comments
✓ **Workflow Clarity**: Step-by-step process with example flow

---

## Cross-Reference Verification

✓ **Prisma Schema** (`prisma/schema.prisma`):
- ConfigUser fields match documentation
- Indexes properly documented
- Request model fields complete

✓ **Request Utils** (`src/lib/request-utils.ts`):
- All 7 functions documented with correct signatures
- Fallback logic clearly explained
- Sequence calculation documented

✓ **API Route** (`src/app/api/requests/[id]/route.ts`):
- BOOKING status transition logic documented
- generateBookingCode() call documented
- Error handling and warnings documented

---

## Gaps Identified

None. All relevant documentation for Phase 1 has been updated.

---

## Next Steps for Phase 2+

When implementing subsequent phases:
- Add request creation/listing API docs
- Document operator module CRUD operations
- Add revenue tracking documentation
- Expand AI assistant integration details
- Document Google Sheets sync for requests

