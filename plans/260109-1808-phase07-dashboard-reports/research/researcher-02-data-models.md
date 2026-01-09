# Data Models Research - Dashboard Reports
**Date:** 2026-01-09 | **Phase:** Phase 07 | **Focus:** Prisma Schema & Aggregation Patterns

---

## Request Model (Sales Funnel)

### Key Fields for Dashboard
| Field | Type | Purpose | Index |
|-------|------|---------|-------|
| `id` | CUID | Primary key | Primary |
| `code` | String | Unique request ID (sync key) | Unique |
| `status` | String | Current status (14 values: DANG_LL_CHUA_TL, etc.) | Yes |
| `stage` | String | LEAD, QUOTE, FOLLOWUP, OUTCOME | Yes |
| `customerName` | String | Customer identifier | No |
| `startDate` | DateTime | Tour start date | Composite index |
| `bookingCode` | String | Links to Operator/Revenue (non-unique) | Yes |
| `expectedRevenue` | Decimal(15,0) | Projected amount | No |
| `expectedCost` | Decimal(15,0) | Projected cost | No |
| `sellerId` | String | FK to User | Yes |
| `requestDate` | DateTime | Creation date | No |

### Dashboard Use Cases
- **Funnel Analysis:** Count by stage/status
- **Time Series:** Requests created per week/month
- **Seller Performance:** Group by sellerId → count/expectedRevenue

### Existing Patterns
Status/stage indexed for efficient filtering. No native aggregation in schema - queries done in-app.

---

## Operator Model (Cost Breakdown)

### Key Fields for Dashboard
| Field | Type | Purpose | Index |
|-------|------|---------|-------|
| `id` | CUID | Primary key | Primary |
| `requestId` | String | FK to Request | Yes |
| `serviceDate` | DateTime | When service occurs | Yes |
| `serviceType` | String | Hotel, Transport, Tour, Guide, etc. | No |
| `costBeforeTax` | Decimal(15,0) | Pre-tax amount | No |
| `vat` | Decimal(15,0) | Tax amount | No |
| `totalCost` | Decimal(15,0) | Final cost (costBeforeTax + vat) | No |
| `paymentStatus` | String | PENDING, PAID, PARTIAL | Yes |
| `paymentDate` | DateTime | When paid | No |
| `paymentDeadline` | DateTime | Due date | No |
| `paidAmount` | Decimal(15,0) | Actual amount paid | No |
| `supplierId` | String | FK to Supplier | Yes |
| `isArchived` | Boolean | Soft-delete flag | Yes |

### Dashboard Metrics
- **Cost Breakdown:** Group by serviceType → sum(totalCost)
- **Payment Status:** Count by paymentStatus (PENDING, PAID, PARTIAL)
- **Overdue Analysis:** Count where paymentDeadline < today AND paymentStatus != PAID
- **Monthly Trends:** Group by month(serviceDate) → sum(totalCost)
- **Debt Calculation:** sum(totalCost) - sum(paidAmount) per operator

### Existing Aggregation Patterns
```typescript
// From operator-payments route:
prisma.operator.aggregate({
  where: { paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
  _count: { id: true },
  _sum: { totalCost: true }
})
```
Uses `.aggregate()` for count + sum operations. Date filters applied in WHERE clause.

---

## Revenue Model (Income Tracking)

### Key Fields for Dashboard
| Field | Type | Purpose | Index |
|-------|------|---------|-------|
| `id` | CUID | Primary key | Primary |
| `revenueId` | String | Original Sheet ID | Unique |
| `requestId` | String | FK to Request | Yes |
| `paymentDate` | DateTime | When payment received | Yes |
| `paymentType` | String | Deposit, Full Payment, etc. | No |
| `foreignAmount` | Decimal(15,2) | Original currency amount | No |
| `currency` | String | Currency code (default VND) | No |
| `exchangeRate` | Decimal(15,2) | FX conversion rate | No |
| `amountVND` | Decimal(15,0) | Standardized VND amount | No |
| `paymentSource` | String | Bank transfer, Cash, etc. | No |
| `lockKT` / `lockAdmin` / `lockFinal` | Boolean | 3-tier accounting locks | No |

### Dashboard Metrics
- **Revenue Trends:** Group by month(paymentDate) → sum(amountVND)
- **Payment Type Distribution:** Group by paymentType → count, sum
- **Currency Breakdown:** Group by currency → sum(amountVND)
- **Daily/Weekly Revenue:** Group by date_trunc → sum(amountVND)

### Existing Aggregation Patterns
```typescript
// From sales route:
prisma.request.findMany({
  where: { bookingCode: { not: null } },
  select: { bookingCode, revenues: { select: { amountVND } } }
})
// Aggregation done in-app using .reduce()
```
Fetches relations, calculates in JavaScript. No native groupBy used.

---

## Existing Aggregation Patterns Summary

### Pattern 1: In-App Aggregation (sales route)
- Fetch full relation sets
- Use `.reduce()` to sum in JavaScript
- Apply sorting/filtering post-fetch
- **Pro:** Flexible, easy to customize
- **Con:** High memory for large datasets

### Pattern 2: Native Prisma Aggregate (operator-payments route)
- Use `.aggregate()` with WHERE filters
- Returns _count, _sum only
- Efficient for simple metrics
- **Pro:** Lightweight, fast
- **Con:** Limited to basic operations

### Pattern 3: GroupBy + Relation Loop (supplier-balance)
- `groupBy()` by type
- Loop through results, calculate per item
- Use `.aggregate()` for linked costs
- **Pro:** Handles complex calculations
- **Con:** Multiple DB calls

---

## Indexes & Query Optimization

### Well-Indexed Fields
- Request: `status`, `stage`, `sellerId`, `bookingCode`, `nextFollowUp`
- Operator: `serviceDate`, `paymentStatus`, `supplierId`, `isArchived`
- Revenue: `paymentDate`

### Recommended for Dashboard Queries
```
Request:
  - @@index([stage, createdAt]) - funnel over time
  - @@index([sellerId, stage, createdAt]) - seller-specific funnel

Operator:
  - @@index([paymentStatus, serviceDate]) - payment analysis
  - @@index([serviceDate, paymentStatus]) - monthly cost breakdown

Revenue:
  - @@index([paymentDate, amountVND]) - trend analysis
```

---

## Data Volume Considerations

- **Request Max Fetch:** 500 bookings (hardcoded in sales route)
- **Aggregation Strategy:** For >10K records, use native Prisma `.aggregate()` or `.groupBy()`
- **Lock Fields:** 3-tier system (lockKT, lockAdmin, lockFinal) — exclude from aggregations unless specifically analyzing lock status

---

## Key Dependencies for Dashboard

1. **Request → Operator:** 1-to-many (cost breakdown per booking)
2. **Request → Revenue:** 1-to-many (payment tracking per booking)
3. **Operator → Supplier:** many-to-1 (cost breakdown by vendor)
4. **Revenue → PaymentDate:** Enables time-series analysis
5. **Operator → PaymentStatus/Deadline:** Enables debt/overdue analysis

---

## Unresolved Questions

- Should dashboard cache aggregated data (materialized view) or compute real-time?
- What date range is typical for dashboard views (30 days, YTD, custom)?
- Are there role-based restrictions for viewing cost/revenue data?
