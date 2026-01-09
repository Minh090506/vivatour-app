# Scout Report: Profit Report Feature Files
**Date:** 2026-01-09 | **Timestamp:** 14:02 | **Task:** Locate profit report implementation files

---

## Summary

Located 16 core files across 5 categories needed for profit report feature implementation. Includes existing report infrastructure, API patterns, data models, and chart components.

---

## 1. API Endpoints (Reports)

### Existing Report Endpoints
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\reports\operator-costs\route.ts**
  - GET endpoint returning cost by service type, supplier, and monthly breakdown
  - Implements date range filtering, validation regex
  - Returns OperatorCostReport with summary stats
  
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\reports\operator-payments\route.ts**
  - GET endpoint for payment status breakdown (pending, overdue, paid)
  - Month-based filtering with YYYY-MM validation
  - Returns PaymentStatusReport with count/total by status

- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\reports\supplier-balance\route.ts**
  - GET endpoint for supplier balance summary
  - Uses getSupplierBalanceSummary utility function
  - Type filtering optional, returns detailed supplier balances

---

## 2. Pages & Routes

### Operators Reports Page
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\(dashboard)\operators\reports\page.tsx**
  - Main reports page with tabs (service, supplier, month)
  - Date range filters with clear button
  - Uses safeFetch for error handling
  - Displays PaymentStatusCards + tab-based report views
  - No Recharts used currently (using custom progress bars/tables)

- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\(dashboard)\operators\reports\error.tsx**
  - Error boundary component for reports page

---

## 3. Report Components (in src/components/operators/reports/)

### Chart & Display Components
- **cost-by-service-chart.tsx**
  - Custom horizontal bar chart using CSS (not Recharts)
  - Shows service type cost breakdown with percentages
  - Accepts CostByServiceType[] data

- **monthly-trend.tsx**
  - Table-based monthly cost trend display
  - Formatted as YYYY-MM to "Tháng {M}/{YYYY}"
  - Includes total row with percentage calculations
  - Uses standard Table component from UI lib

- **cost-by-supplier-table.tsx**
  - Table showing costs by supplier with avg per service
  - Displays supplier name, quantity, total, and average

- **payment-status-cards.tsx**
  - 4-column card layout showing payment status
  - Icons: Clock (pending), AlertTriangle (overdue), CalendarCheck (due this week), CheckCircle (paid)
  - Displays count and formatted currency amount

---

## 4. Data Models & Types

### Prisma Schema
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\prisma\schema.prisma**
  
  **Operator Model** (lines 121-190):
  - costBeforeTax: Decimal
  - vat: Decimal (optional)
  - totalCost: Decimal
  - paymentStatus: PENDING | PARTIAL | PAID
  - paidAmount: Decimal (default 0)
  - Computed debt = totalCost - paidAmount
  - serviceDate, serviceType, supplierId indexed for filtering

  **Revenue Model** (lines 214-268):
  - paymentDate: DateTime
  - paymentType: String
  - amountVND: Decimal
  - foreignAmount, exchangeRate for conversion
  - currency: String (default "VND")
  
  **Operator & Revenue Both Have**:
  - 3-tier lock system (lockKT, lockAdmin, lockFinal)
  - History relations (OperatorHistory, RevenueHistory) for audit trails

### Type Definitions
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\types\index.ts** (lines 535-582)
  
  **Report Types**:
  - CostByServiceType: { type, label, total, count }
  - CostBySupplier: { supplierId, supplierName, total, count }
  - CostByMonth: { month, total, count }
  - CostReportSummary: { totalCost, totalCount, avgCost }
  - OperatorCostReport: combines all above
  - PaymentStatusReport: { pending, dueThisWeek, overdue, paidThisMonth }

---

## 5. Configuration & Utilities

### Operator Configuration
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\config\operator-config.ts**
  - SERVICE_TYPES: 9 types (HOTEL, RESTAURANT, TRANSPORT, GUIDE, VISA, VMB, CRUISE, ACTIVITY, OTHER)
  - PAYMENT_STATUSES: PENDING, PARTIAL, PAID with colors
  - HISTORY_ACTIONS: CREATE, UPDATE, DELETE, LOCK actions (legacy + 3-tier)
  - DEFAULT_VAT_RATE: 10%

### Supplier Balance Utility
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\lib\supplier-balance.ts**
  - calculateSupplierBalance(): aggregates deposits, refunds, adjustments, fees, costs
  - getSupplierBalanceSummary(): batch calculation for all suppliers with totals
  - Formula: balance = deposits + refunds + adjustments - fees - costs

### Formatting Utilities
- **C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\lib\utils.ts**
  - formatCurrency(value: number): Vietnamese locale formatting
  - formatDate(date): Vietnamese locale date formatting
  - cn(): Tailwind class merge utility

---

## 6. Package.json Dependencies

**Relevant Packages**:
- No Recharts currently installed (uses custom/table components)
- react: 19.2.3 | react-dom: 19.2.3
- @prisma/client: 7.2.0
- @radix-ui/react-tabs: 1.1.13 (for tab switching)
- tailwindcss: 4 (CSS-based charts)
- zod: 4.3.4 (validation)
- date-fns: 4.1.0 (date operations)

---

## Key Insights for Profit Report

1. **Architecture Pattern**: All reports use similar structure
   - Page fetches from /api/reports/* endpoints
   - Data typed with interfaces from types/index.ts
   - Components display via tabs or cards
   - No Recharts used (implement custom or add library)

2. **Data Available for Profit Calc**:
   - Revenue.amountVND (income)
   - Operator.totalCost (supplier costs)
   - Profit = Total Revenue - Total Costs (by period/service)

3. **Existing Filters**:
   - Date range (fromDate, toDate in YYYY-MM-DD format)
   - Service type
   - Supplier ID
   - Month-based grouping

4. **Profit Report Should Include**:
   - Total revenue vs total costs with profit/margin
   - Profit trend by month
   - Profit margin by service type
   - Profit by supplier relationship
   - Payment status impact on profit (unpaid invoices)

5. **Lock System**: Both Operator and Revenue have audit trails via history tables
   - Important for financial reporting compliance
   - 3-tier locks: KT (accounting), Admin, Final

---

## Unresolved Questions

1. Should Recharts be added for better visualizations (charts vs tables)?
2. Should profit report join Operator + Revenue by request or by booking code?
3. How to handle multi-currency conversions in profit margin calculations?
4. What's the minimum locked status required for report inclusion (financial compliance)?
