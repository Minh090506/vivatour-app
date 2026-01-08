# Research Report: Multi-Tier Lock Patterns for Financial Accounting

**Date**: 2026-01-08 | **Status**: Complete | **Scope**: Lock hierarchy, database schema, Prisma implementation

---

## Executive Summary

Multi-tier lock patterns enable hierarchical financial controls through sequential approval gates. For MyVivaTour, optimal pattern: **3-tier (DRAFT → ACCOUNTANT_LOCKED → ADMIN_FINAL)**. Database schema requires: lock level enums, lock timestamps, lock reasons, and immutable audit trails. Prisma implementation uses composite lock fields + trigger-based audit, avoiding transaction deadlocks via ordered lock acquisition. Regulatory compliance (audit trail immutability) demands database-level constraints.

---

## Key Findings

### 1. Multi-Tier Lock Architecture

**Three-Tier Pattern (Recommended)**:
- **Tier 1 (DRAFT)**: Default state, full editing
- **Tier 2 (ACCOUNTANT_LOCKED)**: Accountant seals record, prevents seller edits
- **Tier 3 (ADMIN_FINAL)**: Admin locks for period closure, read-only permanently

**Lock Ordering**: Top-down acquisition (DRAFT → ACCOUNTANT → ADMIN prevents deadlock)

**Hierarchy Principle**: Higher tier locks supersede lower tiers (ADMIN_FINAL overrides ACCOUNTANT_LOCKED)

### 2. Database Schema Pattern

**Composite Lock Fields** (per financial record):

```typescript
// Required for Operator/Revenue
lockLevel      LockLevel      @default(DRAFT)      // DRAFT, ACCOUNTANT_LOCKED, ADMIN_FINAL
lockedAt       DateTime?                           // Timestamp when locked
lockedBy       String?        @db.VarChar(36)     // User ID who locked
lockReason     String?        @db.Text            // Justification (audit)

// Immutable history
lockHistory    LockHistory[]  @relation("RecordLocks")
```

**Lock History Model** (append-only audit):
```typescript
model LockHistory {
  id          String   @id @default(cuid())
  recordId    String   // Foreign key (polymorphic via type field)
  recordType  String   // "Operator" or "Revenue"
  action      String   // LOCK, UNLOCK, ESCALATE
  fromLevel   String   // Previous level
  toLevel     String   // New level
  reason      String   @db.Text
  userId      String
  createdAt   DateTime @default(now())

  @@index([recordId, recordType])
  @@index([createdAt])
}
```

### 3. Permission Hierarchy

**Role-Based Lock Authority**:
- **SELLER**: Can edit DRAFT records only
- **ACCOUNTANT**: Can lock/unlock within ACCOUNTANT_LOCKED tier
- **ADMIN**: Can lock/unlock any tier, force escalate

**Lock State Transitions**:
```
DRAFT → [ACCOUNTANT locks] → ACCOUNTANT_LOCKED → [ADMIN escalates] → ADMIN_FINAL → [Read-only]
  ↓                              ↓
[SELLER edits]            [ACCOUNTANT unlocks] → DRAFT
```

### 4. Deadlock Prevention

**Ordered Lock Acquisition Protocol**:
1. Acquire locks hierarchically (parent first, child second)
2. Release bottom-up (child first, parent last)
3. Example: Request → Operator → Revenue (never reverse)

**Implementation**: Use database transactions with `SERIALIZABLE` isolation level for multi-record locks

### 5. Audit Trail Immutability (Regulatory)

**Requirements** (SOX, India Companies Amendment Rules 2021):
- Audit logs cannot be disabled or deleted
- Lock changes must create permanent records
- User attribution mandatory (who locked, when, why)

**Schema Protection**:
```sql
-- PostgreSQL trigger prevents deletion
CREATE TRIGGER lock_history_protect BEFORE DELETE ON lock_history
  FOR EACH ROW RAISE EXCEPTION 'Lock history is immutable';

-- Add row-level security for read-only enforcement
ALTER TABLE lock_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lock_history_immutable ON lock_history
  AS RESTRICTIVE FOR DELETE USING (FALSE);
```

### 6. Prisma Schema Best Practices

**Enum for Lock Levels**:
```typescript
enum LockLevel {
  DRAFT              // Fully editable
  ACCOUNTANT_LOCKED  // Accountant approval stage
  ADMIN_FINAL        // Permanent lock (period closure)
}
```

**Indexed Fields for Performance**:
```typescript
@@index([lockLevel])
@@index([lockedAt, lockLevel])  // For reports: "locked in period X"
@@index([lockedBy])             // For audit: "who locked records"
```

**Relation Pattern**:
```typescript
// In Operator/Revenue models
locks          LockHistory[] @relation("RecordLocks")
```

---

## Current State vs. Gap Analysis

**Current Implementation** (MyVivaTour):
- ✅ Simple `isLocked` Boolean on Operator/Revenue
- ✅ `lockedAt` DateTime tracking
- ✅ `lockedBy` User ID tracking
- ❌ No lock level hierarchy
- ❌ No audit trail of lock changes
- ❌ No permission-based escalation rules

**Required Additions**:
1. `lockLevel` enum (DRAFT, ACCOUNTANT_LOCKED, ADMIN_FINAL)
2. `LockHistory` model for immutable audit trail
3. Lock escalation middleware enforcing role hierarchy
4. Database constraints preventing history deletion

---

## Implementation Roadmap

**Phase 1**: Add `lockLevel` enum + LockHistory model to Prisma schema
**Phase 2**: Create lock middleware (permission checks, state transitions)
**Phase 3**: Update Operator/Revenue detail pages with lock controls
**Phase 4**: Build audit dashboard (lock history reports)
**Phase 5**: Add database constraints + row-level security

---

## Common Pitfalls

1. **Bi-directional Locks**: Don't allow simultaneous locks on parent+child—use ordered acquisition
2. **Missing Reasons**: Lock without reason creates compliance gaps; always capture `lockReason`
3. **Soft Deletes on Audit**: Never soft-delete lock history; append-only only
4. **Permission Bypass**: Check lock level in API layer AND database (defense in depth)
5. **No Audit Timestamps**: Lock times ≠ audit times; capture both separately

---

## Resources

- [Multiple Granularity Locking in DBMS](https://www.geeksforgeeks.org/dbms/multiple-granularity-locking-in-dbms/)
- [Database for Financial Accounting - CodeProject](https://www.codeproject.com/Articles/5163401/Database-for-Financial-Accounting-Application-II)
- [Wikipedia: Multiple Granularity Locking](https://en.wikipedia.org/wiki/Multiple_granularity_locking)
- [Patterns for Accounting - Martin Fowler](https://martinfowler.com/eaaDev/AccountingNarrative.html)
- [Audit Trail in DBMS - TutorialsPoint](https://www.tutorialspoint.com/audit-trail-in-dbms)
- [ZenStack: Authorization in Prisma](https://zenstack.dev/blog/model-authz)
- [Prisma + Permit.io Access Control](https://www.prisma.io/docs/guides/permit-io-access-control)

---

## Unresolved Questions

1. Should unlock functionality exist or is escalation one-way only?
2. Does period closure require bulk ADMIN_FINAL locks or per-record?
3. Should lock reasons be free-text or predefined categories?
4. Need performance benchmarks for 100K+ records with lock history queries?
