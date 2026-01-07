# Phase 02: Truncate + Re-sync

## Context

- **Parent Plan**: [plan.md](./plan.md)
- **Depends On**: [phase-01-fix-sheet-mappers.md](./phase-01-fix-sheet-mappers.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-01-07 |
| Priority | P1 |
| Implementation Status | Pending |
| Review Status | N/A |

## Key Insights

1. User confirmed truncate + re-sync acceptable (data loss OK)
2. Must truncate in correct order: Revenue → Operator → Request (FK constraints)
3. Re-sync order: Request → Operator → Revenue

## Requirements

1. Delete all Revenue records
2. Delete all Operator records
3. Delete all Request records
4. Clear SyncLog for fresh start
5. Re-sync Request sheet (all rows)
6. Re-sync Operator sheet
7. Re-sync Revenue sheet
8. Verify data integrity

## Implementation Steps

### Step 1: Truncate Database (via Prisma)

Create script or run in prisma studio / database client:

```sql
-- Must delete in order due to foreign key constraints
DELETE FROM revenues;
DELETE FROM operators;
DELETE FROM requests;
DELETE FROM sync_logs WHERE "sheetName" IN ('Request', 'Operator', 'Revenue');
```

Or via Prisma script:

```typescript
// scripts/truncate-request-data.ts
import { prisma } from "@/lib/db";

async function truncate() {
  console.log("Truncating Revenue...");
  await prisma.revenue.deleteMany({});

  console.log("Truncating Operator...");
  await prisma.operator.deleteMany({});

  console.log("Truncating Request...");
  await prisma.request.deleteMany({});

  console.log("Clearing SyncLog...");
  await prisma.syncLog.deleteMany({
    where: { sheetName: { in: ["Request", "Operator", "Revenue"] } }
  });

  console.log("Done!");
}

truncate().catch(console.error).finally(() => prisma.$disconnect());
```

Run: `npx tsx scripts/truncate-request-data.ts`

### Step 2: Re-sync Request Sheet

Via API call (as ADMIN):

```bash
curl -X POST http://localhost:3000/api/sync/sheets \
  -H "Content-Type: application/json" \
  -d '{"sheetName": "Request"}'
```

Or via UI if sync button exists.

### Step 3: Re-sync Operator Sheet

```bash
curl -X POST http://localhost:3000/api/sync/sheets \
  -H "Content-Type: application/json" \
  -d '{"sheetName": "Operator"}'
```

### Step 4: Re-sync Revenue Sheet

```bash
curl -X POST http://localhost:3000/api/sync/sheets \
  -H "Content-Type: application/json" \
  -d '{"sheetName": "Revenue"}'
```

### Step 5: Verify Data

```sql
-- Check Request status values (should be enum keys)
SELECT DISTINCT status FROM requests;

-- Check Operator/Revenue linked correctly
SELECT COUNT(*) FROM operators WHERE "requestId" IS NOT NULL;
SELECT COUNT(*) FROM revenues WHERE "requestId" IS NOT NULL;
```

## Todo List

- [ ] Create truncate script
- [ ] Run truncate script
- [ ] Re-sync Request sheet
- [ ] Verify Request status values are enum keys
- [ ] Re-sync Operator sheet
- [ ] Re-sync Revenue sheet
- [ ] Verify Operator/Revenue linked to Requests

## Success Criteria

- [ ] All Request.status values are enum keys (not Vietnamese)
- [ ] Request.code contains Request ID from column AR
- [ ] Request.bookingCode contains booking code from column T
- [ ] Operators linked to Requests via bookingCode lookup
- [ ] Revenues linked to Requests via bookingCode lookup
- [ ] Filters work in UI

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Lost manual edits | Accepted | User confirmed |
| Orphaned Operator/Revenue | Low | Re-sync after Request |

## Security Considerations

- Only ADMIN can trigger sync
- Truncate script should be run manually, not exposed via API

## Next Steps

After this phase: Test full workflow in UI
- View requests list
- Filter by status (enum keys)
- View request detail
- Verify Operator/Revenue display for bookings
