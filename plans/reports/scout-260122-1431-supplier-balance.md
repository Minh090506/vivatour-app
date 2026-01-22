# Scout Report: Supplier Balance Tracking & Transactions

**Date:** 2026-01-22 | **Time:** 14:31  
**Scope:** Supplier transaction APIs, balance calculation, database schema, reports

## Executive Summary

Located 21 files across supplier module: 5 API routes, 2 utility libraries, 1 schema, 1 config, 1 types file, 5 React components, 3 dashboard pages, 3 test files.

## 1. Database Schema

**Location:** prisma/schema.prisma (lines 379-452)

Supplier Model:
- code (unique): HOT-DN-ANK-0001 format
- paymentModel: PREPAID | PAY_PER_USE | CREDIT
- type: HOTEL, RESTAURANT, TRANSPORT, GUIDE, VISA, VMB, CRUISE, ACTIVITY, OTHER
- location: HA_NOI, DA_NANG, etc. (optional)
- relations: transactions[], operators[]

SupplierTransaction Model:
- type: DEPOSIT | REFUND | ADJUSTMENT | FEE
- amount: Decimal(15, 0) positive values
- transactionDate: DateTime
- proofLink, relatedBookingCode, createdBy: optional/tracking fields

Enums:
- PaymentModel: PREPAID, PAY_PER_USE, CREDIT
- TransactionType: DEPOSIT, REFUND, ADJUSTMENT, FEE

## 2. Balance Calculation (src/lib/supplier-balance.ts)

Three functions:

1. calculateSupplierBalance(supplierId)
   - Formula: balance = deposits + refunds + adjustments - fees - costs
   - Returns: {deposits, refunds, adjustments, fees, costs, balance}

2. getSupplierBalanceSummary(typeFilter?)
   - Fetches all active suppliers with optional type filter
   - Returns: {data, summary, byPaymentModel}
   - Summary: supplierCount, totalDeposits, totalCosts, totalRefunds, totalBalance, positiveBalance, negativeBalance

3. getBalanceTrend()
   - 6-month trend data grouped by month
   - Returns: [{month, deposits, costs, balance}] with running balance

## 3. API Endpoints (8 routes)

Suppliers API (src/app/api/suppliers/):
- GET /suppliers: list with filters (search, type, location, paymentModel, isActive, includeBalance)
- POST /suppliers: create with auto-generated code
- GET /suppliers/[id]: detail with last 10 transactions + balance
- PUT /suppliers/[id]: update supplier info
- DELETE /suppliers/[id]: soft/hard delete

Transactions API (src/app/api/supplier-transactions/):
- GET /transactions: paginated list with filters (supplierId, type, dates, limit, offset)
- POST /transactions: create transaction (auth required, validates amount > 0)
- GET /transactions/[id]: single transaction
- PUT /transactions/[id]: update transaction
- DELETE /transactions/[id]: delete transaction

Reports API (src/app/api/reports/):
- GET /supplier-balance: auth + permission required, returns summary + trend

## 4. Types (src/types/index.ts lines 354-466)

PaymentModel = 'PREPAID' | 'PAY_PER_USE' | 'CREDIT'
TransactionType = 'DEPOSIT' | 'REFUND' | 'ADJUSTMENT' | 'FEE'

Supplier: id, code, name, type, location, paymentModel, creditLimit, paymentTermDays, contacts, isActive, balance (computed)
SupplierTransaction: id, supplierId, type, amount, transactionDate, description, proofLink, relatedBookingCode, createdBy, createdAt
SupplierBalance: deposits, refunds, adjustments, fees, costs, balance

## 5. Config (src/config/supplier-config.ts)

SUPPLIER_TYPES: 9 types with labels & 3-char prefixes (HOT, RES, TRA, GUI, VIS, VMB, CRU, ACT, OTH)
SUPPLIER_LOCATIONS: 18 locations with labels & prefixes (HN, HL, NB, HU, DN, HA, NT, PT, TH, PR, HCM, CC, MT, PQ, CT, TL, CB, LA)
PAYMENT_MODELS: 3 models with labels & descriptions
generateSupplierCode(): auto-sequences codes [TYPE]-[LOCATION]-[NAME]-[SEQUENCE]

## 6. React Components (5)

transaction-form.tsx: Dialog form for adding transactions (type, amount, date, description, proofLink, bookingCode)
supplier-form.tsx: Multi-field form for creating/editing suppliers with code generation
edit-supplier-modal.tsx: Modal wrapper
supplier-selector.tsx: Dropdown for selecting supplier
payment-model-chart.tsx: Visualizes balance by payment model

## 7. Dashboard Pages (3)

suppliers/page.tsx: List with search & filtering
suppliers/[id]/page.tsx: Detail with balance summary + recent transactions + add transaction form
suppliers/reports/page.tsx: Balance report with summary stats + 6-month trend

## 8. Tests (3 files)

supplier-balance.test.ts: Tests for calculateSupplierBalance & getSupplierBalanceSummary
supplier-transactions.test.ts: API endpoint tests
suppliers.test.ts: CRUD endpoint tests

## 9. All 21 Files

API Routes:
1. src/app/api/suppliers/route.ts
2. src/app/api/suppliers/[id]/route.ts
3. src/app/api/supplier-transactions/route.ts
4. src/app/api/supplier-transactions/[id]/route.ts
5. src/app/api/reports/supplier-balance/route.ts

Libraries:
6. src/lib/supplier-balance.ts
7. src/config/supplier-config.ts
8. prisma/schema.prisma
9. src/types/index.ts

Components:
10. src/components/suppliers/supplier-selector.tsx
11. src/components/suppliers/edit-supplier-modal.tsx
12. src/components/suppliers/supplier-form.tsx
13. src/components/suppliers/transaction-form.tsx
14. src/components/suppliers/reports/payment-model-chart.tsx
15. src/components/operators/reports/cost-by-supplier-table.tsx

Pages:
16. src/app/(dashboard)/suppliers/page.tsx
17. src/app/(dashboard)/suppliers/[id]/page.tsx
18. src/app/(dashboard)/suppliers/reports/page.tsx

Tests:
19. src/__tests__/lib/supplier-balance.test.ts
20. src/__tests__/api/supplier-transactions.test.ts
21. src/__tests__/api/suppliers.test.ts

## Key Architecture

Balance = deposits + refunds + adjustments - fees - operator_costs
Code Format: [TYPE]-[LOCATION]-[NAME]-[SEQUENCE]
API Response: {success, data?, error?}
Operator Linking: Operator.supplierId FK automatically included in balance
Auth Pattern: Session check + role-based permission (revenue:view)

## Unresolved Questions

1. No SupplierTransaction history table. Audit trail needed?
2. Suppliers soft-delete but transactions hard-delete. Intentional?
3. Operators & Revenues have 3-tier lock system. Needed for supplier payments?
4. /api/reports/supplier-balance uses revenue:view. Supplier-specific permission?
5. getSupplierBalanceSummary() loops individually. Pagination for 1000+ suppliers?
