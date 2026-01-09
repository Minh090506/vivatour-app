# Phase 07.1: Dashboard Report APIs

**Implemented**: 2026-01-09
**Version**: 1.0
**Status**: Production Ready

## Overview

Phase 07.1 implements four REST APIs for business analytics dashboards with comprehensive KPI tracking, trend analysis, cost breakdown, and sales funnel metrics. All endpoints support time-range filtering and require RBAC authorization.

---

## API Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/reports/dashboard` | GET | Main KPI summary + YoY comparison | revenue:view |
| `/api/reports/revenue-trend` | GET | Monthly revenue/cost/profit trends | revenue:view |
| `/api/reports/cost-breakdown` | GET | Cost analysis by service type + status | revenue:view |
| `/api/reports/funnel` | GET | Sales funnel stage distribution | revenue:view |

---

## Shared Features

### Date Range Support

All endpoints accept a `range` query parameter with fixed options:

```
?range=thisMonth        # Current month (default)
?range=lastMonth        # Previous month
?range=last3Months      # Last 3 months
?range=last6Months      # Last 6 months
?range=thisYear         # Current year
```

**Examples**:
```bash
curl "http://localhost:3000/api/reports/dashboard?range=thisMonth"
curl "http://localhost:3000/api/reports/revenue-trend?range=last3Months"
```

### Response Format

All successful responses follow this structure:

```typescript
{
  "success": true,
  "data": {
    // Endpoint-specific data
    "dateRange": {
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-01-31T23:59:59.000Z",
      "label": "Thang 1/2026"
    }
    // ... other fields
  }
}
```

### Error Response Format

```typescript
{
  "success": false,
  "error": "Vietnamese error message"
}
```

**Status Codes**:
- `401 Unauthorized`: Not logged in
- `403 Forbidden`: Missing `revenue:view` permission
- `400 Bad Request`: Invalid date range parameter
- `500 Internal Server Error`: Server error with message

### Authentication & Authorization

All endpoints require:
1. Valid session: `session?.user?.id` must exist
2. User role must have `revenue:view` permission

**Roles with access**:
- `ADMIN`
- `ACCOUNTANT`
- `SELLER` (if configured)

---

## 1. GET /api/reports/dashboard

### Purpose

Generates main KPI cards for dashboard home with current period metrics and comparison to previous period.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `thisMonth` | Date range option (see Shared Features) |

### Response Data

```typescript
{
  "success": true,
  "data": {
    "kpiCards": {
      "totalBookings": number,      // Requests with bookingCode in period
      "totalRevenue": number,       // VND sum from Revenue model
      "totalProfit": number,        // Revenue - Cost
      "activeRequests": number,     // Requests in LEAD or QUOTE stage
      "conversionRate": number      // (bookings / leads) * 100%
    },
    "comparison": {
      "bookings": {
        "current": number,          // Current period bookings
        "previous": number,         // Previous period bookings
        "changePercent": number      // % change (can be negative)
      },
      "revenue": {
        "current": number,          // Current period revenue
        "previous": number,         // Previous period revenue
        "changePercent": number      // % change (can be negative)
      }
    },
    "dateRange": {
      "startDate": Date,
      "endDate": Date,
      "label": string               // Vietnamese label
    }
  }
}
```

### Example Request

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/reports/dashboard?range=thisMonth"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "kpiCards": {
      "totalBookings": 24,
      "totalRevenue": 5000000,
      "totalProfit": 1200000,
      "activeRequests": 8,
      "conversionRate": 42.86
    },
    "comparison": {
      "bookings": {
        "current": 24,
        "previous": 18,
        "changePercent": 33.33
      },
      "revenue": {
        "current": 5000000,
        "previous": 4200000,
        "changePercent": 19.05
      }
    },
    "dateRange": {
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-01-31T23:59:59.000Z",
      "label": "Thang 1/2026"
    }
  }
}
```

### Data Sources

- **Bookings**: `Request` where `bookingCode IS NOT NULL`
- **Revenue**: `Revenue.amountVND` sum (converts Decimal → number)
- **Costs**: `Operator.totalCost` sum (excludes archived operators)
- **Active Requests**: `Request` where `stage IN ['LEAD', 'QUOTE']`
- **Leads**: Total `Request` count in period (for conversion rate calculation)

---

## 2. GET /api/reports/revenue-trend

### Purpose

Provides monthly breakdown of revenue, cost, and profit for trend visualization (line charts, area charts).

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `thisMonth` | Date range option (see Shared Features) |

### Response Data

```typescript
{
  "success": true,
  "data": {
    "data": [
      {
        "period": "2026-01",          // YYYY-MM format
        "revenue": number,            // Monthly sum
        "cost": number,               // Monthly sum
        "profit": number              // revenue - cost
      }
      // ... more months
    ],
    "summary": {
      "totalRevenue": number,
      "totalCost": number,
      "totalProfit": number,
      "avgMonthly": number            // totalRevenue / month count
    },
    "dateRange": {
      "startDate": Date,
      "endDate": Date,
      "label": string
    }
  }
}
```

### Example Request

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/reports/revenue-trend?range=last3Months"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "period": "2025-11",
        "revenue": 3500000,
        "cost": 2100000,
        "profit": 1400000
      },
      {
        "period": "2025-12",
        "revenue": 4200000,
        "cost": 2800000,
        "profit": 1400000
      },
      {
        "period": "2026-01",
        "revenue": 5000000,
        "cost": 3800000,
        "profit": 1200000
      }
    ],
    "summary": {
      "totalRevenue": 12700000,
      "totalCost": 8700000,
      "totalProfit": 4000000,
      "avgMonthly": 4233333
    },
    "dateRange": {
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2026-01-31T23:59:59.000Z",
      "label": "3 thang gan day"
    }
  }
}
```

### Data Processing

1. Fetch all `Revenue` records in date range → group by month (YYYY-MM)
2. Fetch all non-archived `Operator` records in date range → group by month
3. Merge periods (both revenue and cost) → calculate profit
4. Sort chronologically
5. Calculate summary statistics

### Use Cases

- Monthly trend visualization (Chart.js, Recharts)
- Revenue forecasting
- Seasonal pattern analysis
- YoY comparison foundation

---

## 3. GET /api/reports/cost-breakdown

### Purpose

Analyzes cost distribution by service type and payment status for cost management insights.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `thisMonth` | Date range option (see Shared Features) |

### Response Data

```typescript
{
  "success": true,
  "data": {
    "byServiceType": [
      {
        "type": string,               // Operator serviceType
        "amount": number,             // Total cost for type
        "percentage": number          // % of total cost
      }
      // ... sorted by amount DESC
    ],
    "paymentStatus": {
      "paid": number,                // Sum of PAID operators
      "partial": number,             // Sum of PARTIAL operators
      "unpaid": number               // Sum of UNPAID/PENDING operators
    },
    "dateRange": {
      "startDate": Date,
      "endDate": Date,
      "label": string
    }
  }
}
```

### Example Request

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/reports/cost-breakdown?range=thisMonth"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "byServiceType": [
      {
        "type": "Transportation",
        "amount": 2400000,
        "percentage": 63.16
      },
      {
        "type": "Accommodation",
        "amount": 1000000,
        "percentage": 26.32
      },
      {
        "type": "Catering",
        "amount": 400000,
        "percentage": 10.53
      }
    ],
    "paymentStatus": {
      "paid": 2500000,
      "partial": 800000,
      "unpaid": 500000
    },
    "dateRange": {
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-01-31T23:59:59.000Z",
      "label": "Thang 1/2026"
    }
  }
}
```

### Data Processing

1. Fetch all non-archived `Operator` records in date range
2. Group by `serviceType` → calculate total cost per type
3. Aggregate payment status (PAID, PARTIAL, UNPAID/PENDING)
4. Calculate percentage for each type
5. Sort by amount descending

### Use Cases

- Cost control and budget allocation
- Service profitability analysis
- Payment collection tracking
- Pie/donut chart visualization

---

## 4. GET /api/reports/funnel

### Purpose

Displays sales funnel stages with conversion metrics for pipeline visibility.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `thisMonth` | Date range option (see Shared Features) |

### Response Data

```typescript
{
  "success": true,
  "data": {
    "stages": [
      {
        "stage": string,              // LEAD | QUOTE | FOLLOWUP | OUTCOME
        "count": number,              // Total requests in stage
        "percentage": number          // % of total requests
      }
      // ... in order: LEAD, QUOTE, FOLLOWUP, OUTCOME
    ],
    "conversionRate": number,         // (bookings / total) * 100%
    "dateRange": {
      "startDate": Date,
      "endDate": Date,
      "label": string
    }
  }
}
```

### Example Request

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/reports/funnel?range=thisMonth"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "stage": "LEAD",
        "count": 56,
        "percentage": 100.0
      },
      {
        "stage": "QUOTE",
        "count": 32,
        "percentage": 57.14
      },
      {
        "stage": "FOLLOWUP",
        "count": 24,
        "percentage": 42.86
      },
      {
        "stage": "OUTCOME",
        "count": 24,
        "percentage": 42.86
      }
    ],
    "conversionRate": 42.86,
    "dateRange": {
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-01-31T23:59:59.000Z",
      "label": "Thang 1/2026"
    }
  }
}
```

### Data Processing

1. Fetch all `Request` records created in date range
2. Group by `stage` (LEAD, QUOTE, FOLLOWUP, OUTCOME)
3. Count requests with `bookingCode IS NOT NULL` for conversion metric
4. Calculate percentages (count / total * 100%)
5. Format in stage order (LEAD → QUOTE → FOLLOWUP → OUTCOME)

### Interpretation

- **Drop-off Analysis**: Compare stage percentages to identify bottlenecks
- **Conversion Rate**: Final conversion metric (bookings / leads)
- **Pipeline Health**: Monitor progression through stages

### Use Cases

- Sales funnel visualization (waterfall/funnel chart)
- Pipeline bottleneck identification
- Team performance metrics
- Process improvement tracking

---

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `src/lib/validations/report-validation.ts` | Zod schemas + date range validation |
| `src/lib/report-utils.ts` | Date range logic + response type definitions |
| `src/app/api/reports/dashboard/route.ts` | Dashboard KPI endpoint |
| `src/app/api/reports/revenue-trend/route.ts` | Revenue trend endpoint |
| `src/app/api/reports/cost-breakdown/route.ts` | Cost breakdown endpoint |
| `src/app/api/reports/funnel/route.ts` | Sales funnel endpoint |

### Key Functions

**report-validation.ts**:
```typescript
export const reportQuerySchema = z.object({
  range: z.enum([...]).default('thisMonth')
})
```

**report-utils.ts**:
```typescript
getDateRange(range): { startDate, endDate, label }
getComparisonRange(range): { startDate, endDate, label }
formatPeriodKey(date): string // "2026-01"
calcChangePercent(current, previous): number // -100 to +inf
```

### Performance Considerations

- **Parallel Queries**: Dashboard uses `Promise.all()` for concurrent queries
- **Database Indexes**: Recommended indexes on:
  - `Request.bookingCode`
  - `Request.stage`
  - `Request.createdAt`
  - `Revenue.paymentDate`
  - `Operator.serviceDate`
  - `Operator.paymentStatus`

### Testing

Test all endpoints with:
- Valid date ranges
- Invalid/missing range parameters
- Unauthorized access (no session)
- Forbidden access (no revenue:view permission)
- Edge cases (no data in range)

Example test:
```typescript
test('GET /api/reports/dashboard returns KPI cards', async () => {
  const res = await fetch(
    'http://localhost:3000/api/reports/dashboard?range=thisMonth',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  expect(data.success).toBe(true)
  expect(data.data.kpiCards).toBeDefined()
})
```

---

## Future Enhancements

- Custom date range support (startDate, endDate parameters)
- Comparison periods (year-over-year, month-over-month)
- Filtering by operator, seller, or request status
- Export to CSV/Excel
- Scheduled report generation
- Dashboard UI components

---

## Notes

- All monetary values in VND (Vietnamese Dong)
- Timestamps in ISO 8601 format (UTC)
- Vietnamese language for UI labels and error messages
- Percentage calculations rounded to 2 decimal places
- All endpoints use standard REST conventions
