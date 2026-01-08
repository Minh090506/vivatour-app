# Phase 2b Revenue API Implementation Summary

## Overview
Phase 2b implements complete revenue management with 3-tier locking system, audit trail, and enhanced filtering. Revenue API expanded from 4 to 7 endpoints with full audit history tracking.

---

## New Endpoints (3)

### 1. POST /api/revenues/[id]/lock
**Purpose**: Apply 3-tier lock to revenue record
**Auth**: Authenticated user
**Permissions**: Role-based (ACCOUNTANT for KT, ADMIN for Admin/Final)

**Request Body**:
```json
{
  "tier": "KT" | "Admin" | "Final"
}
```

**Lock Tier Hierarchy**:
- **KT** (Khóa KT) - Accountant lock - ACCOUNTANT role
- **Admin** (Khóa Admin) - Admin lock - ADMIN role
- **Final** (Khóa Cuối) - Final lock - ADMIN role

**Sequence**: Must lock in order: KT → Admin → Final

**Response**:
```json
{
  "success": true,
  "tier": "KT",
  "data": { /* revenue object */ }
}
```

**Behavior**:
- Validates tier parameter
- Checks role permissions (canLock)
- Verifies sequential progression (canLockTier)
- Updates tier-specific lock fields (lockKT, lockAdmin, lockFinal)
- Creates history entry with action LOCK_KT|LOCK_ADMIN|LOCK_FINAL

---

### 2. POST /api/revenues/[id]/unlock
**Purpose**: Remove tier lock from revenue record
**Auth**: Authenticated user
**Permissions**: Role-based (ADMIN only for all tiers)

**Request Body**:
```json
{
  "tier": "KT" | "Admin" | "Final"
}
```

**Unlock Sequence**: Must unlock in reverse: Final → Admin → KT

**Response**:
```json
{
  "success": true,
  "tier": "Final",
  "data": { /* revenue object */ }
}
```

**Behavior**:
- Validates tier parameter
- Checks unlock permissions (canUnlock)
- Verifies reverse unlock order (canUnlockTier)
- Updates tier-specific lock fields to false
- Creates history entry with action UNLOCK_KT|UNLOCK_ADMIN|UNLOCK_FINAL

---

### 3. GET /api/revenues/[id]/history
**Purpose**: Retrieve complete audit trail for revenue record
**Auth**: Authenticated user
**Permissions**: revenue:view

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "history-id",
      "revenueId": "revenue-id",
      "action": "CREATE" | "UPDATE" | "DELETE" | "LOCK_KT" | "LOCK_ADMIN" | "LOCK_FINAL" | "UNLOCK_KT" | "UNLOCK_ADMIN" | "UNLOCK_FINAL",
      "changes": {
        "revenueId": { "after": "value" },
        "amountVND": { "after": 1000000 },
        "tier": { "before": false, "after": true }
      },
      "userId": "user-id",
      "userName": "John Doe",
      "createdAt": "2026-01-08T12:00:00Z"
    }
  ]
}
```

**Behavior**:
- Verifies revenue exists
- Fetches all history entries ordered DESC by createdAt
- Enriches with user names via Set-based deduplication
- Falls back to "Unknown" for deleted users

---

## Enhanced Endpoints (4)

### POST /api/revenues - Enhanced
**New Feature**: Auto-generates revenueId from bookingCode

```json
{
  "requestId": "request-id",
  "paymentDate": "2026-01-08",
  "paymentType": "INCOME",
  "paymentSource": "source",
  "currency": "VND",
  "amountVND": 1000000,
  "foreignAmount": 50,
  "exchangeRate": 20000,
  "notes": "notes"
}
```

**Changes**:
- revenueId generated via generateRevenueId(bookingCode)
- History entry created with CREATE action
- Includes initial revenueId, amountVND, paymentType, paymentSource

---

### GET /api/revenues - Enhanced Filtering
**Query Parameters**:
- `requestId` - Filter by request
- `paymentType` - Filter by payment type
- `paymentSource` - Filter by payment source
- `currency` - Filter by currency
- `fromDate` - Date range start
- `toDate` - Date range end
- `isLocked` - Filter by lock status (true/false)
- `limit` - Pagination limit (default 50)
- `offset` - Pagination offset (default 0)

**Response**:
```json
{
  "success": true,
  "data": [ /* revenue objects */ ],
  "total": 100,
  "hasMore": true
}
```

---

## Revenue History Utility

### File: src/lib/revenue-history.ts

#### Functions

**createRevenueHistory(input: RevenueHistoryInput)**
- Creates audit trail entry in RevenueHistory table
- Automatically timestamped
- Supports before/after change tracking
- No return of user name (raw entry)

**getRevenueHistory(revenueId: string)**
- Retrieves all history for revenue
- Enriches with user names
- Efficient: Single batch lookup via Set deduplication
- Returns array ordered by createdAt DESC
- Fallback: "Unknown" for missing users

#### History Actions (8 Total)

**CRUD**:
- CREATE - Initial revenue creation
- UPDATE - Revenue modification
- DELETE - Revenue deletion

**Locking**:
- LOCK_KT - KT tier locked
- LOCK_ADMIN - Admin tier locked
- LOCK_FINAL - Final tier locked

**Unlocking**:
- UNLOCK_KT - KT tier unlocked
- UNLOCK_ADMIN - Admin tier unlocked
- UNLOCK_FINAL - Final tier unlocked

#### Data Structure

```typescript
interface RevenueHistoryInput {
  revenueId: string;
  action: RevenueHistoryAction;
  changes: Record<string, { before?: unknown; after?: unknown }>;
  userId: string;
}

type RevenueHistoryAction =
  | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'LOCK_KT' | 'LOCK_ADMIN' | 'LOCK_FINAL'
  | 'UNLOCK_KT' | 'UNLOCK_ADMIN' | 'UNLOCK_FINAL';
```

---

## Lock System Integration

### Permission Model

**Lock Permissions**:
- KT tier: ACCOUNTANT, ADMIN
- Admin tier: ADMIN only
- Final tier: ADMIN only

**Unlock Permissions**:
- All tiers: ADMIN only

### Tier Progression Logic

**Canary Lock** (validated by canLockTier):
```
Current: lockKT=false, lockAdmin=false, lockFinal=false
✓ Can lock: KT (next available in sequence)
✗ Cannot lock: Admin or Final (must do KT first)

Current: lockKT=true, lockAdmin=false, lockFinal=false
✓ Can lock: Admin (next in sequence)
✗ Cannot lock: Final (must do Admin first)

Current: lockKT=true, lockAdmin=true, lockFinal=false
✓ Can lock: Final (completes sequence)

Current: lockKT=true, lockAdmin=true, lockFinal=true
✗ Cannot lock: Any (all locked)
```

**Unlock Progression** (validated by canUnlockTier):
```
Current: lockKT=true, lockAdmin=true, lockFinal=true
✓ Can unlock: Final (must undo from most restrictive)
✗ Cannot unlock: Admin or KT (Final still locked)

Current: lockKT=true, lockAdmin=true, lockFinal=false
✓ Can unlock: Admin (next in reverse)
✗ Cannot unlock: KT (Admin still locked)

Current: lockKT=true, lockAdmin=false, lockFinal=false
✓ Can unlock: KT (removes last lock)

Current: All false
✗ Cannot unlock: Any (nothing locked)
```

---

## Error Handling

### Common Errors

**400 Bad Request**:
- Invalid tier value
- Lock progression violated
- Revenue not found
- Invalid payment type/currency

**401 Unauthorized**:
- Missing authentication
- Invalid session

**403 Forbidden**:
- Insufficient permissions for tier
- Revenue:view permission denied

**404 Not Found**:
- Revenue ID doesn't exist
- Request ID doesn't exist

**500 Internal Server Error**:
- Database errors
- Unexpected exceptions

---

## API Count Update

**Before Phase 2b**: 33 endpoints
- Revenue: 4 endpoints (CRUD only)

**After Phase 2b**: 36 endpoints
- Revenue: 7 endpoints (CRUD + lock + unlock + history)

---

## Documentation Updates

### Updated Files
1. **docs/codebase-summary.md**
   - Added revenue-history.ts to library section
   - Updated Revenue Endpoints (4 → 7)
   - New "Phase 2b: Revenue History Utility" section
   - Updated Project Status table

2. **README.md**
   - Updated API Endpoints count (33 → 36)
   - Enhanced Revenue endpoint description

### New Documentation
- Phase 2b Revenue API Implementation Summary (this file)
- Comprehensive report: plans/reports/docs-manager-260108-1639-phase2b-revenue-api.md

---

## Usage Examples

### Lock a Revenue Record
```bash
curl -X POST http://localhost:3000/api/revenues/revenue-123/lock \
  -H "Content-Type: application/json" \
  -d '{"tier":"KT"}'

# Response: Success, revenue now locked by KT tier
# Then can lock Admin tier...

curl -X POST http://localhost:3000/api/revenues/revenue-123/lock \
  -H "Content-Type: application/json" \
  -d '{"tier":"Admin"}'

# Then Final tier...
curl -X POST http://localhost:3000/api/revenues/revenue-123/lock \
  -H "Content-Type: application/json" \
  -d '{"tier":"Final"}'
```

### Unlock in Reverse
```bash
# Must unlock from Final first
curl -X POST http://localhost:3000/api/revenues/revenue-123/unlock \
  -H "Content-Type: application/json" \
  -d '{"tier":"Final"}'

# Then Admin...
curl -X POST http://localhost:3000/api/revenues/revenue-123/unlock \
  -H "Content-Type: application/json" \
  -d '{"tier":"Admin"}'

# Then KT...
curl -X POST http://localhost:3000/api/revenues/revenue-123/unlock \
  -H "Content-Type: application/json" \
  -d '{"tier":"KT"}'
```

### Get Audit Trail
```bash
curl http://localhost:3000/api/revenues/revenue-123/history \
  -H "Authorization: Bearer token"

# Response: Complete history with userName for each entry
```

---

## Related Documentation

- **Phase 01 Foundation**: ID Generation, Lock System - docs/codebase-summary.md
- **Full API Reference**: docs/codebase-summary.md - API Endpoints Overview section
- **Code Standards**: docs/code-standards.md - Error handling patterns
- **System Architecture**: docs/system-architecture.md - Revenue module design
