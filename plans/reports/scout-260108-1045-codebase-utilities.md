# Scout Report: Codebase Utilities & Libraries

**Date**: 2026-01-08 10:45  
**Scope**: src/lib/, src/hooks/, src/types/, src/stores/  
**Status**: Complete - 14 files cataloged

---

## Summary

Located **14 documentation-relevant files** across lib, hooks, and types directories. Comprehensive documentation on database utilities, auth/permissions, API integration, data mapping, and state management.

---

## Files by Category

### DATABASE & ORM

**File**: `src/lib/db.ts`
- **Purpose**: Prisma Client singleton for database connections
- **Key Exports**: `prisma` (default export)
- **Features**: 
  - PrismaPg adapter for PostgreSQL
  - Singleton pattern for Next.js hot-reloading
  - Dev-mode logging (query, error, warn)
  - Configurable via DATABASE_URL env var

---

### API & EXTERNAL SERVICES

**File**: `src/lib/google-sheets.ts`
- **Purpose**: Google Sheets API client for sync operations
- **Key Exports**: 
  - `getSheetData(sheetName, startRow, spreadsheetId)` - Fetch sheet rows
  - `getLastSyncedRow(sheetName)` - Get last sync checkpoint
  - `getSheetHeaders(sheetName)` - Get column headers
  - `getSheetConfig(sheetName)` - Configuration with sheet ID, tab name, header row
  - `isGoogleSheetsConfigured()` - Verify setup
  - `getSheetConfigStatus()` - Per-sheet configuration status
- **Features**: 
  - Service Account auth
  - Multiple sheet configs (Request, Operator, Revenue)
  - Incremental sync tracking
  - Lazy client initialization
- **Config**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SHEET_ID_*` env vars

---

### DATA MAPPING & TRANSFORMATION

**File**: `src/lib/sheet-mappers.ts`
- **Purpose**: Google Sheet row transformation to database entities
- **Key Exports**:
  - `mapRequestRow(row, rowIndex)` → RequestRowData
  - `mapOperatorRow(row, rowIndex)` → OperatorRowData
  - `mapRevenueRow(row, rowIndex)` → RevenueRowData
  - Helper functions: parseDate(), parseNumber(), mapVietnameseToStatusKey(), mapStatusToStage()
- **Features**:
  - Vietnamese status label mapping
  - Multi-format date parsing (DD/MM/YYYY, ISO, Excel serial)
  - Vietnamese number format (dots as thousands, comma as decimal)
  - Seller lookup with fallback
  - Row validation and skipping logic
  - Decimal type handling for Prisma
- **Column Mappings**: 
  - Request: 44 columns mapped (A-AR)
  - Operator: 23 columns mapped
  - Revenue: 20 columns mapped (row 1 blank, headers in row 2)

---

### BUSINESS LOGIC & CALCULATIONS

**File**: `src/lib/supplier-balance.ts`
- **Purpose**: Supplier financial balance calculations
- **Key Exports**:
  - `calculateSupplierBalance(supplierId)` → SupplierBalance object
  - `getSupplierBalanceSummary(typeFilter)` → {data, summary}
- **Formula**: deposits + refunds + adjustments - fees - operator_costs
- **Returns**: {deposits, refunds, adjustments, fees, costs, balance}

**File**: `src/lib/request-utils.ts`
- **Purpose**: Request module utilities (IDs, dates, follow-ups)
- **Key Exports**:
  - `generateRQID()` → RQ-YYMMDD-0001 format ID
  - `generateBookingCode(startDate, sellerId)` → YYYYMMDD+Code+Seq format
  - `calculateEndDate(startDate, tourDays)` → End date
  - `calculateNextFollowUp(stage, lastContactDate)` → Next follow-up date
  - `getFollowUpDateBoundaries()` - Today/3-days-later boundaries

**File**: `src/lib/operator-history.ts`
- **Purpose**: Audit trail for operator changes
- **Key Exports**:
  - `createOperatorHistory(entry)`, `getOperatorHistory(operatorId, limit=20)`
  - `diffObjects(before, after)` - Calculate field changes
- **Actions**: CREATE, UPDATE, DELETE, LOCK, UNLOCK, APPROVE

---

### VALIDATION & SCHEMAS

**File**: `src/lib/operator-validation.ts`
- **Purpose**: Zod validation for operator forms
- **Schemas**: operatorFormSchema, approvePaymentSchema, lockPeriodSchema

**File**: `src/lib/validations/seller-validation.ts`
- **Purpose**: Seller and follow-up configuration validation
- **Schemas**: sellerSchema, followUpStatusSchema, reorderSchema

**File**: `src/lib/validations/config-validation.ts`
- **Purpose**: Configuration validation (duplicate of seller-validation.ts)

---

### PERMISSION & ACCESS CONTROL

**File**: `src/lib/permissions.ts`
- **Purpose**: RBAC (Role-Based Access Control) system
- **Key Exports**:
  - `hasPermission(role, permission)` → boolean
  - `getPermissions(role)` → Permission[]
  - `PERMISSIONS` record
- **Roles**: ADMIN, SELLER, OPERATOR, ACCOUNTANT
- **Permission Types**: 24 total (request:*, operator:*, revenue:*, expense:*, supplier:*, user:*, "*")

---

### LOGGING & UTILITIES

**File**: `src/lib/logger.ts`
- **Purpose**: Structured logging for errors, warnings, info
- **Key Exports**: logError(), logWarn(), logInfo(), createLogger()

**File**: `src/lib/utils.ts`
- **Purpose**: General utility functions
- **Key Exports**: cn(), formatCurrency(), formatDate()

---

## CUSTOM HOOKS

**File**: `src/hooks/use-permission.ts`
- **Purpose**: React hook for client-side permission checking
- **Hook**: `usePermission()` → {can, canAll, canAny, role, userId, isLoading, isAuthenticated, isAdmin, isAccountant, isSeller, isOperator}

**File**: `src/hooks/index.ts`
- **Purpose**: Barrel export for all hooks

---

## TYPE DEFINITIONS

**File**: `src/types/index.ts`
- **Purpose**: Central TypeScript type definitions (40+ types)
- **Domains**:
  - User & Auth: User, Role, Permission
  - Requests: Request, RequestFormData, RequestFilters
  - Operators: Operator, OperatorFormData, OperatorHistoryEntry
  - Revenue: Revenue, RevenueFormData
  - Suppliers: Supplier, SupplierTransaction, SupplierBalance
  - Configuration: ConfigFollowUp, ConfigUser
  - Dashboard & API: DashboardStats, ApiResponse, PaginatedResponse
- **Re-exports**: REQUEST_STATUSES, SUPPLIER_TYPES, SERVICE_TYPES from config files

---

## STORES DIRECTORY

**Location**: `src/stores/`  
**Status**: Empty (no files)

---

## DOCUMENTATION RECOMMENDATIONS

### Documentation Priority
1. **Permissions System** - Already well-structured, minimal doc needed
2. **Google Sheets Integration** - Document column mappings and sync process
3. **Data Mapping** - Document Vietnamese format handling
4. **Type Exports** - Document re-export pattern from config files
5. **Request Utils** - Document ID generation algorithms

### Gaps
1. Duplicate validation file (config-validation.ts = seller-validation.ts)
2. Empty stores directory - clarify Zustand adoption
3. No rate limiting for Google Sheets API
4. Logger needs external service integration docs
5. usePermission should document NextAuth requirement

---

## Statistics

- **Total Files**: 14
- **Utility Functions**: 40+
- **Type Definitions**: 40+
- **Permission Types**: 24
- **Roles**: 4
- **Custom Hooks**: 1
- **Validation Schemas**: 6

