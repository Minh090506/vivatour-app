# Revenue Components Scout Report - 2026-01-21 16:16

## COMPLETE REVENUE COMPONENTS INVENTORY

### MAIN COMPONENTS (5)
1. RevenueForm - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\revenue-form.tsx
2. RevenueTable - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\revenue-table.tsx
3. RevenueSummaryCard - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\revenue-summary-card.tsx
4. RevenueHistoryPanel - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\revenue-history-panel.tsx
5. RevenueLockDialog - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\revenue-lock-dialog.tsx

### SUPPORTING COMPONENTS (4)
6. SalesSummaryTable - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\sales-summary-table.tsx
7. CurrencyBreakdownTable - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\reports\currency-breakdown-table.tsx
8. RevenueBySourceChart - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\reports\revenue-by-source-chart.tsx
9. RevenueByTypeChart - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\reports\revenue-by-type-chart.tsx

### COMPONENT INDEX
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\index.ts

### TEST FILES (5)
1. revenue-form.test.tsx - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\__tests__\revenue-form.test.tsx
2. revenue-table.test.tsx - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\__tests__\revenue-table.test.tsx
3. revenue-summary-card.test.tsx - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\__tests__\revenue-summary-card.test.tsx
4. revenue-history-panel.test.tsx - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\__tests__\revenue-history-panel.test.tsx
5. revenue-lock-dialog.test.tsx - C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\__tests__\revenue-lock-dialog.test.tsx

### TEST UTILITIES (415 lines)
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\components\revenues\__tests__\test-utils.ts

INCLUDES:
- Mock fixtures: mockRevenue, mockLockedKTRevenue, mockLockedAdminRevenue, mockLockedFinalRevenue, mockForeignRevenue, mockRefundRevenue
- Mock requests: mockRequestOutcome, mockRequestOutcome2, mockRequests
- Mock history: mockHistoryEntry, mockUpdateHistoryEntry, mockLockKTHistoryEntry, mockHistoryEntries
- Helper factories: createMockRevenue(), createMockHistoryEntry(), createMockRequest()
- Fetch mocks: setupFetchMock(), setupFetchMockError(), resetMocks()
- Global mocks: mockRouter, mockSession, mockAccountantSession, mockToast
- Permission mocks: defaultPermissionMock, accountantPermissionMock, sellerPermissionMock, createPermissionMock()
- Constants: PAYMENT_TYPE_LABELS, PAYMENT_SOURCE_LABELS, formatVND()

### TYPES (src/types/index.ts)
- Revenue interface (lines 202-233): Full revenue record with 3-tier locking system
- RevenueFormData interface (lines 235-245): Form input data
- RevenueHistoryAction type: CREATE, UPDATE, DELETE, LOCK_KT, UNLOCK_KT, LOCK_ADMIN, UNLOCK_ADMIN, LOCK_FINAL, UNLOCK_FINAL

### VALIDATION SCHEMA (src/lib/validations/revenue-validation.ts - 209 lines)
- createRevenueApiSchema: Full validation for creation
- updateRevenueApiSchema: Partial validation for updates
- Custom validators for foreign currency and VND requirements
- Functions: validateCreateRevenue(), validateUpdateRevenue(), extractRevenueZodErrors()

### CONFIGURATION (src/config/revenue-config.ts - 53 lines)
PAYMENT_TYPES: DEPOSIT (blue), FULL_PAYMENT (green), PARTIAL (yellow), REFUND (red)
PAYMENT_SOURCES: BANK_TRANSFER, CASH, CARD, PAYPAL, WISE, OTHER
CURRENCIES: VND, USD, EUR, GBP, AUD, JPY, SGD, THB
DEFAULT_EXCHANGE_RATES: Record for each currency

### UTILITIES
1. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\lib\revenue-history.ts
   - REVENUE_HISTORY_ACTIONS enum
   - RevenueHistoryInput interface
   - createRevenueHistory()
   - getRevenueHistory()

2. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\lib\validations\revenue-validation.ts
   - Zod schemas and validation functions

### HOOKS
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\hooks\use-revenue-reports.ts
  - useRevenueReports(dateRange, customDates?)
  - Fetches revenue breakdown via /api/reports/revenue-breakdown

### API ROUTES (6 endpoints)
1. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\revenues\route.ts - GET/POST
2. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\revenues\[id]\route.ts - GET/PUT/DELETE
3. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\revenues\[id]\lock\route.ts - POST
4. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\revenues\[id]\unlock\route.ts - POST
5. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\revenues\[id]\history\route.ts - GET
6. C:\Users\Admin\Projects\company-workflow-app\vivatour-app\src\app\api\revenues\sales\route.ts - GET

### TEST CONFIGURATION
- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\jest.config.ts (77 lines)
  - Environment: jest-environment-jsdom
  - Pattern: **/__tests__/**/*.test.ts(x)
  - Coverage: 70% threshold

- C:\Users\Admin\Projects\company-workflow-app\vivatour-app\jest.setup.ts (36 lines)
  - @testing-library/jest-dom
  - TextEncoder/TextDecoder polyfills
  - ResizeObserver mock
  - Global timeout: 10000ms

### TESTING PATTERNS
1. Fixture approach: Pre-built mock objects with variations
2. Factory functions: createMock* helpers for custom overrides
3. Fetch mocking: Pattern-based URL matching
4. Permission-based: ADMIN, ACCOUNTANT, SELLER role mocks
5. Session mocking: NextAuth session state
6. Router mocking: Next.js navigation
7. Toast mocking: Sonner notifications

### COMPONENT PATTERNS
- All use 'use client' directive
- React Hook Form + Zod validation
- Hooks: useState, useEffect, useRef, useCallback
- Async: safeFetch, safePost, safePut
- Permissions: usePermission hook
- Notifications: sonner toast

### NAMING CONVENTIONS
- Components: PascalCase
- Files: kebab-case
- Constants: UPPER_SNAKE_CASE
- Variables/functions: camelCase

### DEPENDENCIES
- shadcn/ui components
- lucide-react icons
- sonner notifications
- React Hook Form + Zod
- Next.js

### SUMMARY
- 9 Components (5 main + 4 supporting)
- 5 Test files
- 1 Test utilities file (415 lines)
- 6 API routes
- 2+ Type definitions
- 2 Validation schemas
- 2 Utility files
- 1 Hook
- 1 Config file
- Full test infrastructure with mocks

Status: COMPLETE - All files located and documented.

