# Prisma Schema & Database Patterns Research
**Report Date:** 2026-01-04
**Module:** Request Module Implementation
**Status:** Complete

---

## Current Request Model Structure

### Schema Overview
```
Request {
  id              String @id @default(cuid())
  code            String @unique

  // Customer Info
  customerName    String
  contact         String
  whatsapp        String?
  pax             Int @default(1)
  country         String

  // Source & Status
  source          String
  status          String @default("F2")

  // Tour Info
  tourDays        Int?
  expectedDate    DateTime?
  expectedRevenue Decimal @db.Decimal(15, 0)
  expectedCost    Decimal @db.Decimal(15, 0)

  // Dates & Metadata
  requestDate     DateTime @default(now())
  nextFollowUp    DateTime?
  notes           String? @db.Text
  sellerId        String (FK → User)
  sheetRowIndex   Int?

  // System
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Relations
- **User (seller)**: One-to-Many - Each request linked to seller
- **Operator[]**: One-to-Many - Multiple services per request
- **Revenue[]**: One-to-Many - Multiple payments per request
- **Email[]**: One-to-Many - Communication history

### Index Strategy
```
@@index([status])          // F1-F5 filtering
@@index([sellerId])        // Seller dashboard
@@index([nextFollowUp])    // Follow-up scheduling
```

---

## User Model Relation Patterns

User acts as a **hub** linking three main modules:
- **requests**: Seller ownership
- **operators**: User who created/manages service
- **revenues**: User who recorded payment

**Key:** No direct index on User→Request in User model; indexed FROM Request side.

---

## Index Conventions (PostgreSQL)

### Applied Pattern
1. **Foreign Keys** (sellerId, userId) - Always indexed for JOINs
2. **Filter Fields** (status, paymentStatus) - High cardinality queries
3. **Date Fields** (nextFollowUp, paymentDate) - Range queries
4. **Type Fields** (serviceType) - Classification filters

### Missing but Recommended
- Compound index: `[requestId, status]` on Operator (cost filtering)
- Partial index on Request: `WHERE status != 'F5'` (active requests)

---

## Enum Types in Schema

### Role (User)
```
enum Role { ADMIN, SELLER, ACCOUNTANT }
```

### PaymentModel (Supplier)
```
enum PaymentModel { PREPAID, PAY_PER_USE, CREDIT }
```

### TransactionType (SupplierTransaction)
```
enum TransactionType { DEPOSIT, REFUND, ADJUSTMENT, FEE }
```

**Observation:** Request.status uses String, not enum (allows flexible F1-F5 values).

---

## Decimal Field Standards

All monetary values use `@db.Decimal(15, 0)` or `@db.Decimal(15, 2)`:
- `(15, 0)` - VND (no decimals): expectedRevenue, expectedCost, totalCost
- `(15, 2)` - Currency: foreignAmount, exchangeRate
- **Pattern:** Use (15, 0) for VND amounts

---

## Relation Pattern: Cascading Deletes

Revenue & Operator both use: `@relation(onDelete: Cascade)`
- Deleting Request → Deletes all Operators & Revenues
- Maintains referential integrity
- Useful for soft-delete alternatives

---

## Recommendations for Request Module Implementation

### New Fields to Consider
1. **assignedTo** (String, FK → User) - Team member ownership
2. **priority** (String or enum) - HIGH/MEDIUM/LOW
3. **tags** (String[]) - KISS principle: array of string tags
4. **source** - Standardize as enum: EMAIL, TRIPADVISOR, ZALO, AGENT, PHONE

### Additional Indexes
```prisma
@@index([source])              // Filter by channel
@@index([expectedDate])        // Tour date range queries
@@compound([sellerId, status]) // Seller + status dashboard
```

### Schema Evolution Strategy
- Keep extensions backward compatible
- Use nullable fields for optional additions
- Document enum values in comments
- Maintain single decimal precision per currency type

---

## File References
- Schema location: `prisma/schema.prisma` (lines 44-89)
- User model: `prisma/schema.prisma` (lines 17-32)
- Operator model: `prisma/schema.prisma` (lines 95-147)
- Supplier enums: `prisma/schema.prisma` (lines 299-310)

---

## Unresolved Questions
1. Should Request.status migrate from String to enum for strict validation?
2. Do follow-ups require separate tracking model (FollowUp entity)?
3. Need confirmation on expectedRevenue/expectedCost - immutable or editable post-creation?
