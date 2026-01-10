# Codebase Summary

MyVivaTour Platform - Comprehensive directory structure and implementation details.

**Last Updated**: 2026-01-10 (Phase 06 Complete - React Hooks Fixed)
**Total Files**: 107+ source files | **Pages**: 19 | **Components**: 71+ | **API Routes**: 37+ | **Database Models**: 18

---

## Directory Structure

```
src/
├── app/                              # Next.js App Router (v16)
│   ├── (auth)/                       # Auth route group (Phase 04)
│   │   ├── login/                    # Login page
│   │   │   ├── page.tsx              # Login page component
│   │   │   ├── login-form.tsx        # LoginForm with React Hook Form + Zod
│   │   │   └── __tests__/            # Login tests (Vitest)
│   │   └── layout.tsx                # Auth layout
│   ├── (dashboard)/                  # Dashboard route group
│   │   ├── requests/                 # Request module (Phase 06) - 5 pages
│   │   │   ├── page.tsx              # List with table + filters
│   │   │   ├── create/page.tsx       # Create request form
│   │   │   ├── [id]/page.tsx         # Detail/edit view
│   │   │   ├── [id]/edit/page.tsx    # Edit-specific view
│   │   │   └── [id]/delete/page.tsx  # Delete confirmation
│   │   ├── operators/                # Operator module (Phase 06) - 5 pages
│   │   │   ├── page.tsx              # List with approval table
│   │   │   ├── create/page.tsx       # Create operator form
│   │   │   ├── [id]/page.tsx         # Detail with lock dialog
│   │   │   ├── [id]/edit/page.tsx    # Edit operator
│   │   │   └── approvals/page.tsx    # Approval queue
│   │   ├── revenue/                  # Revenue module (Phase 06) - single page
│   │   │   ├── page.tsx              # List + create form
│   │   │   └── [id]/page.tsx         # Revenue detail
│   │   ├── reports/                  # Reports & Dashboard (Phase 07.2) - 1 page
│   │   │   └── page.tsx              # Dashboard with charts + KPI cards
│   │   ├── suppliers/                # Supplier CRUD pages (Phase 01)
│   │   │   ├── page.tsx              # Supplier list
│   │   │   ├── create/page.tsx       # Create supplier
│   │   │   ├── [id]/page.tsx         # Supplier detail
│   │   │   └── reports/page.tsx      # Supplier reports
│   │   ├── layout.tsx                # Dashboard layout (Header + AIAssistant)
│   │   └── page.tsx                  # Dashboard home with widgets
│   ├── api/                          # REST API routes (37 endpoints)
│   │   ├── auth/[...nextauth]/       # NextAuth.js v5 handlers
│   │   ├── requests/                 # Request CRUD (2 endpoints)
│   │   ├── operators/                # Operator CRUD (8 endpoints)
│   │   ├── suppliers/                # Supplier CRUD (5 endpoints)
│   │   ├── supplier-transactions/    # Transaction CRUD (5 endpoints)
│   │   ├── revenue/                  # Revenue CRUD (4 endpoints)
│   │   ├── reports/                  # Reports & Analytics (7 endpoints - Phase 07.1)
│   │   │   ├── dashboard/route.ts    # Dashboard KPIs (Phase 07.1)
│   │   │   ├── revenue-trend/route.ts# Revenue trend over time (Phase 07.1)
│   │   │   ├── cost-breakdown/route.ts# Cost analysis by service (Phase 07.1)
│   │   │   └── funnel/route.ts       # Sales funnel analysis (Phase 07.1)
│   │   ├── config/                   # Config endpoints (8 endpoints)
│   │   ├── sync/sheets/              # Google Sheets sync
│   │   └── users/                    # User management
│   ├── layout.tsx                    # Root layout with SessionProvider
│   ├── page.tsx                      # Home page
│   └── forbidden.tsx                 # 403 access denied page
├── components/
│   ├── ui/                           # shadcn/ui components (22+)
│   │   ├── button, input, form, table, dialog, etc.
│   │   └── (Radix UI + Tailwind CSS based)
│   ├── layout/                       # Global layout components
│   │   ├── Header.tsx                # Navigation + user menu
│   │   └── AIAssistant.tsx           # Floating chat widget
│   ├── layouts/                      # Layout patterns (Phase 05)
│   │   ├── master-detail-layout.tsx  # Responsive 2-panel (resizable desktop, sheet mobile)
│   │   └── slide-in-panel.tsx        # Mobile right-side sheet overlay
│   ├── providers/                    # Context providers (Phase 05)
│   │   └── session-provider-wrapper.tsx # NextAuth SessionProvider wrapper
│   ├── requests/                     # Request module components (Phase 06)
│   │   ├── request-form.tsx          # Create/edit request form
│   │   ├── request-list.tsx          # Request list with table
│   │   ├── request-detail.tsx        # Request detail view
│   │   ├── request-filters.tsx       # Status/stage/seller filters
│   │   ├── request-table.tsx         # Sortable request table
│   │   └── request-status-badge.tsx  # Status indicator
│   ├── operators/                    # Operator module components (Phase 06)
│   │   ├── operator-form.tsx         # Create/edit operator form
│   │   ├── operator-approval-table.tsx # Approval queue table
│   │   ├── operator-lock-dialog.tsx  # Accounting lock dialog
│   │   ├── operator-history-panel.tsx # Operator history timeline
│   │   ├── operator-report-chart.tsx # Revenue/cost charts
│   │   ├── operator-payment-table.tsx # Payment status table
│   │   └── operator-details-table.tsx # Operator details view
│   ├── revenues/                     # Revenue module components (Phase 06)
│   │   ├── revenue-form.tsx          # Create/edit revenue form
│   │   ├── revenue-table.tsx         # Revenue list table
│   │   └── revenue-summary-card.tsx  # Revenue summary statistics
│   ├── reports/                      # Reports & Dashboard components (Phase 07.2)
│   │   ├── date-range-selector.tsx   # Date range dropdown (5 options)
│   │   ├── kpi-cards.tsx             # 5 KPI metric cards with trends (memoized)
│   │   ├── revenue-trend-chart.tsx   # Composed chart: Revenue/Cost/Profit (memoized)
│   │   ├── cost-breakdown-chart.tsx  # Pie + payment status bars (memoized)
│   │   └── funnel-chart.tsx          # Sales funnel horizontal bar chart (memoized)
│   ├── suppliers/                    # Supplier module components (Phase 01)
│   │   ├── supplier-form.tsx         # Create/edit supplier form
│   │   ├── supplier-selector.tsx     # Supplier selection component
│   │   ├── supplier-modal.tsx        # Modal for supplier management
│   │   └── transaction-form.tsx      # Transaction entry form
│   ├── settings/                     # Settings components
│   │   ├── seller-modal.tsx          # Seller configuration
│   │   ├── seller-table.tsx          # Sellers management
│   │   ├── follow-up-modal.tsx       # Follow-up configuration
│   │   ├── follow-up-table.tsx       # Follow-up status table
│   │   └── google-sheets-sync.tsx    # Sync configuration UI
│   └── dashboard/                    # Dashboard components
│       └── follow-up-widget.tsx      # Follow-up action widget
├── lib/
│   ├── db.ts                         # Prisma Client singleton
│   ├── permissions.ts                # RBAC: roles, permissions, hasPermission()
│   ├── google-sheets.ts              # Google Sheets API client (Phase 01)
│   ├── sheet-mappers.ts              # Sheet ↔ DB mapping (Request: 44 cols, Operator: 23, Revenue: 20)
│   ├── supplier-balance.ts           # Balance calculation utilities
│   ├── request-utils.ts              # RQID, BookingCode, follow-up utilities
│   ├── operator-history.ts           # Operator audit trail
│   ├── operator-validation.ts        # Zod schemas for operators
│   ├── id-utils.ts                   # ID generation (RequestID, ServiceID, RevenueID) - Phase 01 Foundation
│   ├── lock-utils.ts                 # Lock tier utilities (3-tier lock: KT/Admin/Final) - Phase 01 Foundation
│   ├── revenue-history.ts            # Revenue audit trail + history retrieval with user names (Phase 2b)
│   ├── report-utils.ts               # Date range, KPI calculation, dashboard response types (Phase 07.1)
│   ├── logger.ts                     # Structured logging
│   ├── utils.ts                      # cn(), formatCurrency(), formatDate()
│   ├── sync/                          # Bidirectional sync utilities (Phase 07.5)
│   │   └── write-back-queue.ts       # SyncQueue management (enqueue, dequeue, markComplete, markFailed, resetStuck, cleanupCompleted, getQueueStats, getFailedItems, retryFailed, deleteQueueItem)
│   └── validations/                  # Zod schemas
│       ├── seller.ts                 # Seller schema validation
│       ├── config.ts                 # Config validation schemas
│       └── report-validation.ts      # Report query schema with date range validation (Phase 07.1)
├── hooks/
│   ├── use-permission.ts             # can(), canAll(), canAny(), role shortcuts
│   ├── use-reports.ts                # Data fetching hook for 4 report APIs (Phase 07.2)
│   └── index.ts                      # Barrel export
├── stores/                           # Zustand state management
├── types/index.ts                    # 40+ TypeScript definitions
├── auth.ts                           # NextAuth.js v5 config (Phase 04)
├── middleware.ts                     # Route protection & role-based access (Phase 03)
├── constants.ts                      # App constants
└── config/                           # Configuration modules
    └── lock-config.ts                # Lock system configuration (labels, colors, history actions) - Phase 01 Foundation
```

---

## Phase 04: Login Page Implementation

### Components

**src/app/login/page.tsx**
- Server component for /login route
- Centered card layout (Tailwind CSS)
- Vietnamese UI: "MyVivaTour", "Dang nhap de tiep tuc"
- Mobile-responsive design

**src/app/login/login-form.tsx**
- Client component with Suspense boundary
- React Hook Form + Zod validation
- Features:
  - Email & password input fields
  - Form submission via signIn("credentials")
  - Callback URL handling with open redirect protection
  - Toast notifications (sonner)
  - Loading state with spinner
  - Error handling with Vietnamese messages
  - Accessibility: labels, autocomplete

**Key Security Functions**
- `getSafeCallbackUrl()`: Validates callback URL to prevent open redirects
  - Only allows relative paths starting with /
  - Blocks protocol-relative URLs (//)
  - Default fallback to /requests

**Form Validation Schema**
```typescript
loginSchema = z.object({
  email: z.string().email("Email khong hop le"),
  password: z.string().min(1, "Mat khau bat buoc"),
})
```

**Authentication Flow**
1. User navigates to /login
2. LoginForm renders with Suspense boundary
3. User submits email & password
4. Zod schema validates input
5. signIn("credentials") calls NextAuth.js v5
6. On success: Toast notification, redirect to callback URL or /requests
7. On error: Toast error, form validation messages

### Tests

**src/app/login/__tests__/page.test.tsx**
- Login page component rendering
- Layout structure verification

**src/app/login/__tests__/login-form.test.tsx**
- Form submission behavior
- Input field interactions
- Toast notifications
- Loading states

**src/app/login/__tests__/login-validation.test.ts**
- Zod schema validation
- Email format validation
- Error message accuracy

### Security Features

- Open redirect protection via getSafeCallbackUrl()
- CSRF protection built-in via NextAuth.js v5
- Zod schema validation at client
- Generic error messages (no credential leaks)
- Suspense boundary prevents hydration mismatches
- Password minimal validation at client (server validates)

---

## Authentication & RBAC Layer (Phase 04)

### Core Files

| File | Purpose |
|------|---------|
| src/auth.ts | NextAuth.js v5: Credentials provider, JWT callbacks, type extensions |
| src/middleware.ts | Route protection: auth + role-based access control |
| src/app/api/auth/[...nextauth]/route.ts | NextAuth.js v5 handler |
| src/app/(auth)/login/page.tsx | Login page (server component) |
| src/app/(auth)/login/login-form.tsx | LoginForm with React Hook Form + Zod |
| src/lib/permissions.ts | RBAC: 4 roles + 24 permissions |
| src/hooks/use-permission.ts | Client permission checking hook |

### RBAC System (4 Roles, 24 Permissions)

**Roles**:
- **ADMIN**: All permissions (wildcard `*`)
- **SELLER**: Request creation/viewing, own request editing, operator viewing
- **OPERATOR**: Request viewing, operator claiming/editing, cost tracking
- **ACCOUNTANT**: Financial oversight - revenue/expense/supplier/operator approval

**Permissions** (24 total - resource:action convention):
- Request: `view`, `create`, `edit`, `edit_own`, `delete`
- Operator: `view`, `create`, `edit`, `edit_claimed`, `claim`, `approve`, `delete`
- Revenue: `view`, `manage`
- Expense: `view`, `manage`
- Supplier: `view`, `manage`
- User: `view`, `manage`

**Permission Hook** (`src/hooks/use-permission.ts`):
```typescript
const { can, canAll, canAny, isAdmin, isSeller, isOperator, isAccountant } = usePermission()
```

**Middleware Route Access** (`src/middleware.ts`):
```
/requests   → ADMIN, SELLER, OPERATOR, ACCOUNTANT
/operators  → ADMIN, OPERATOR, ACCOUNTANT
/revenue    → ADMIN, ACCOUNTANT
/expense    → ADMIN, ACCOUNTANT
/settings   → ADMIN only
/suppliers  → ADMIN, ACCOUNTANT
```

### UI Components

**SessionProviderWrapper** (`src/components/providers/session-provider-wrapper.tsx`):
- Client component wrapping NextAuth SessionProvider
- Enables useSession() hook availability throughout app
- Wrapped by root layout

**MasterDetailLayout** (`src/components/layouts/master-detail-layout.tsx`):
- Responsive 2-panel layout with resizable panels (desktop, md+)
- Mobile: Full-width list with Sheet overlay for detail
- Props: master, detail, selectedId, onClose, storageKey (localStorage persistence)
- Examples: requests list/detail, suppliers list/detail

**SlideInPanel** (`src/components/layouts/slide-in-panel.tsx`):
- Mobile detail panel: Right-side sheet overlay
- Props: isOpen, onClose, title, description, children
- Used by MasterDetailLayout for mobile view
- Responsive widths: 85vw (mobile), 540px (sm), 600px (md)

---

## API Endpoints Overview (33 Total)

### Request Endpoints (2)
```
GET    /api/requests                     # List all requests with filters
POST   /api/requests                     # Create new request
GET    /api/requests/[id]                # Get request detail
PUT    /api/requests/[id]                # Update request
DELETE /api/requests/[id]                # Delete request
```

### Operator Endpoints (8)
```
GET    /api/operators                    # List operators with approvals
POST   /api/operators                    # Create operator
GET    /api/operators/[id]               # Get operator detail
PUT    /api/operators/[id]               # Update operator
DELETE /api/operators/[id]               # Delete operator
POST   /api/operators/[id]/approve       # Approve operator (accountant)
POST   /api/operators/[id]/lock          # Lock operator (accounting)
GET    /api/operators/pending-approval   # Get pending approvals
```

### Supplier Endpoints (5)
```
GET    /api/suppliers                    # List suppliers
POST   /api/suppliers                    # Create supplier
GET    /api/suppliers/[id]               # Get supplier detail
PUT    /api/suppliers/[id]               # Update supplier
DELETE /api/suppliers/[id]               # Delete supplier
GET    /api/suppliers/code-generate      # Generate unique code
```

### Supplier Transaction Endpoints (5)
```
GET    /api/supplier-transactions        # List transactions
POST   /api/supplier-transactions        # Create transaction
GET    /api/supplier-transactions/[id]   # Get transaction detail
PUT    /api/supplier-transactions/[id]   # Update transaction
DELETE /api/supplier-transactions/[id]   # Delete transaction
```

### Revenue Endpoints (7) - Phase 2b Complete
```
GET    /api/revenues                     # List revenues with filters (requestId, paymentType, paymentSource, currency, date range, lock status)
POST   /api/revenues                     # Create revenue with revenueId generation from bookingCode
GET    /api/revenues/[id]                # Get revenue detail
PUT    /api/revenues/[id]                # Update revenue
DELETE /api/revenues/[id]                # Delete revenue
POST   /api/revenues/[id]/lock           # Lock revenue - {tier: "KT"|"Admin"|"Final"} - 3-tier lock with role permissions
POST   /api/revenues/[id]/unlock         # Unlock revenue - {tier: "KT"|"Admin"|"Final"} - reverse unlock order (Final → Admin → KT)
GET    /api/revenues/[id]/history        # Get revenue history with userName - full audit trail
```

**Lock Tier System Details**:
- Sequential lock: KT (ACCOUNTANT) → Admin (ADMIN) → Final (ADMIN)
- Reverse unlock: Final → Admin → KT
- Each lock/unlock creates history entry with action, changes, userId
- History includes user.name from user lookup

### Report Endpoints (3)
```
GET    /api/reports/supplier-balance     # Supplier balance summary
GET    /api/reports/operator-costs       # Operator cost analysis
GET    /api/reports/operator-payments    # Operator payment tracking
```

### Config Endpoints (8)
```
GET    /api/config/follow-up             # Get follow-up status config
POST   /api/config/follow-up             # Create follow-up status
GET    /api/config/sellers               # List seller configurations
POST   /api/config/sellers               # Create seller config
PUT    /api/config/sellers/[id]          # Update seller config
GET    /api/config/user/me               # Current user config
PUT    /api/config/user/me               # Update user config
POST   /api/config/sync                  # Trigger Google Sheets sync
```

### Auth Endpoints (NextAuth.js)
```
POST   /api/auth/callback/credentials    # Credentials provider login
GET    /api/auth/providers               # Available auth providers
GET    /api/auth/session                 # Get current session
POST   /api/auth/signin                  # Sign in (redirect)
GET    /api/auth/signout                 # Sign out (redirect)
```

### Sync Endpoints (2)
```
POST   /api/sync/sheets                  # Trigger Google Sheets sync
GET    /api/sync/sheets                  # Get sync status & statistics
```

### Users Endpoints
```
GET    /api/users                        # List users (admin only)
POST   /api/users                        # Create user (admin only)
GET    /api/users/[id]                   # Get user detail
PUT    /api/users/[id]                   # Update user
DELETE /api/users/[id]                   # Delete user (admin only)
```

---

## Phase 01: Multi-Spreadsheet Support (Google Sheets Sync)

### Key Features

**Per-Sheet Configuration**:
- Support separate spreadsheet IDs for Request, Operator, and Revenue sheets
- Environment variables: `SHEET_ID_REQUEST`, `SHEET_ID_OPERATOR`, `SHEET_ID_REVENUE`
- Backward compatible with single `GOOGLE_SHEET_ID` fallback
- Configuration status checking via `getSheetConfigStatus()`

### Core Files

| File | Purpose |
|------|---------|
| `src/lib/google-sheets.ts` | Google Sheets API client with multi-sheet support |
| `src/app/api/sync/sheets/route.ts` | Sync endpoints (POST trigger, GET status) |
| `.env.example` | Environment variable templates for per-sheet IDs |

### Implementation Details

**src/lib/google-sheets.ts** (Key functions):
- `getSheetIdForType(sheetName)`: Resolves spreadsheet ID for sheet type (Request, Operator, Revenue)
  - Checks per-sheet env var first (`SHEET_ID_*`)
  - Falls back to `GOOGLE_SHEET_ID`
  - Throws error if no ID configured for sheet
- `parsePrivateKey(key)`: Parses Google service account private key
  - Handles escaped newlines (`\\n` → `\n`)
  - Auto-adds PEM headers if missing
  - Supports raw base64 or formatted PEM keys
- `getSheetConfigStatus()`: Returns configuration status per sheet
  - Returns object: `{ Request: boolean, Operator: boolean, Revenue: boolean }`
  - Checks both per-sheet and fallback env vars
- `getSheetData(sheetName, startRow, spreadsheetId?)`: Fetches rows from sheet tab
  - **Phase 02**: Extended range from `A:Z` to `A:AZ` to include all columns through AR
  - Returns array of SheetRow with rowIndex and values
- `getLastSyncedRow(sheetName)`: Returns last successfully synced row
- `getSheetHeaders(sheetName, spreadsheetId?)`: Fetches first row (headers)
- `isGoogleSheetsConfigured()`: Overall configuration check (credentials + any sheet ID)

**src/app/api/sync/sheets/route.ts** (API endpoints):

**POST `/api/sync/sheets`** - Trigger sync for a sheet
- Request body: `{ sheetName: "Request" | "Operator" | "Revenue" }`
- Auth: Admin only (via middleware)
- Response: `{ success: boolean, message: string, synced: number, errors: number, lastRowIndex?: number }`
- Flow:
  1. Check auth (admin required)
  2. Verify Google Sheets configured
  3. Validate sheet name in VALID_SHEETS
  4. Check per-sheet configuration status
  5. Get last synced row from SyncLog
  6. Fetch new rows from Google Sheets API
  7. Call appropriate sync function (syncRequestSheet, syncOperatorSheet, syncRevenueSheet)
  8. Log all results in SyncLog table

**GET `/api/sync/sheets`** - Get sync status & statistics
- Auth: Authenticated users
- Response: `{ success: boolean, data: { configured: boolean, sheetConfig: Record<string, boolean>, stats: Array, lastSyncs: Array } }`
- Returns:
  - `configured`: Boolean, overall Google Sheets enabled (credentials + any sheet ID)
  - `sheetConfig`: Per-sheet configuration status (Request, Operator, Revenue)
  - `stats`: Sync statistics grouped by sheet and status (SUCCESS/FAILED)
  - `lastSyncs`: Last sync timestamp and row index per sheet

**Sync Functions** (src/app/api/sync/sheets/route.ts):
- `syncRequestSheet(rows)`: Upserts requests by code, logs sync status per row
- `syncOperatorSheet(rows)`: Creates operators (allows duplicates), links to requests, logs status
- `syncRevenueSheet(rows)`: Creates revenue records (allows multiple per request), links to requests, logs status

### Environment Variables

```env
# Google Sheets Service Account (required for sync)
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Per-sheet configuration (Phase 01 - multi-spreadsheet support)
SHEET_ID_REQUEST="spreadsheet-id-for-requests"
SHEET_ID_OPERATOR="spreadsheet-id-for-operators"
SHEET_ID_REVENUE="spreadsheet-id-for-revenues"

# Fallback for single spreadsheet (backward compatible)
GOOGLE_SHEET_ID="fallback-if-all-same-spreadsheet"
```

---

## Phase 01: ID Generation System

### Core File
**src/lib/id-utils.ts** - Centralized ID generators for Request, Operator, Revenue

#### Key Functions

**generateRequestId(sellerCode, timestamp?)**
- Format: `{SellerCode}{yyyyMMddHHmmssSSS}` (25-35 chars)
- Example: `LY20260108143045123`
- Features:
  - Removes Vietnamese diacritics from seller code
  - Auto-resolves collisions via timestamp retry
  - Verifies uniqueness in database

**generateServiceId(bookingCode, timestamp?)**
- Format: `{bookingCode}-{yyyyMMddHHmmssSSS}` (35-50 chars)
- Example: `20260108L0001-20260108143045123`
- Used for Operator service tracking
- Collision-safe with database verification

**generateRevenueId(bookingCode, timestamp?)**
- Format: `{bookingCode}-{yyyyMMddHHmmss}-{rowNum}` (30-40 chars)
- Example: `20260108L0001-20260108143045-1`
- Multiple revenues per booking supported via rowNum suffix
- Sequence-based numbering per timestamp prefix

#### Helper Functions
- `removeDiacritics(str)`: Vietnamese character normalization (À→A, é→e)
- `formatTimestamp(date)`: yyyyMMddHHmmssSSS format (17 chars)
- `formatDatePart(date)`: yyyyMMdd format (8 chars)

---

## Phase 2b: Revenue History Utility

### Core File
**src/lib/revenue-history.ts** - Revenue audit trail management with history retrieval

#### History Actions
- **CRUD**: CREATE, UPDATE, DELETE
- **Locking**: LOCK_KT, LOCK_ADMIN, LOCK_FINAL
- **Unlocking**: UNLOCK_KT, UNLOCK_ADMIN, UNLOCK_FINAL

#### Key Functions
- `createRevenueHistory(input)`: Create audit entry
  - Records: revenueId, action, changes (before/after values), userId, createdAt
  - Changes use structured format: `{ field: { before?, after? } }`
  - Automatically timestamped via Prisma createdAt default
- `getRevenueHistory(revenueId)`: Retrieve with user names
  - Fetches all history entries ordered by createdAt DESC
  - Looks up user.name for each unique userId
  - Returns merged array with userName field (fallback: "Unknown")
  - Efficient: single user batch lookup via Set deduplication

#### Data Structure
```typescript
interface RevenueHistoryInput {
  revenueId: string;
  action: RevenueHistoryAction;
  changes: Record<string, { before?: unknown; after?: unknown }>;
  userId: string;
}
```

#### Integration Points
- **POST /api/revenues**: Creates history on revenue creation with initial revenueId, amount, type, source
- **POST /api/revenues/[id]/lock**: Records lock action with before/after tier state
- **POST /api/revenues/[id]/unlock**: Records unlock action with before/after tier state
- **GET /api/revenues/[id]/history**: Returns full audit trail

---

## Phase 01: Lock System (3-Tier)

### Core Files

**src/lib/lock-utils.ts** - Lock tier management utilities

#### Lock Tier Hierarchy
1. **KT** (Khóa KT) - Accountant lock (ACCOUNTANT, ADMIN)
2. **Admin** (Khóa Admin) - Admin lock (ADMIN only)
3. **Final** (Khóa Cuối) - Final lock (ADMIN only)

Sequential progression: Records must be locked KT → Admin → Final in order. Unlocking reverses: Final → Admin → KT.

#### Key Functions
- `canLock(role, tier)`: Check permission to lock tier
- `canUnlock(role, tier)`: Check permission to unlock tier
- `getCurrentLockTier(state)`: Get highest active tier
- `canLockTier(state, tier)`: Validate sequential progression
- `canUnlockTier(state, tier)`: Validate unlock order
- `isEditable(state)`: Check if record has no locks
- `getLockFields(tier, userId, lock)`: DB update payload
- `getActiveLockTiers(state)`: List all locked tiers
- `hasAnyLock(state)`: Check if any lock active

#### LockState Interface
```typescript
interface LockState {
  lockKT: boolean;
  lockAdmin: boolean;
  lockFinal: boolean;
}
```

**src/config/lock-config.ts** - Lock configuration & labels

#### Configuration Constants
- `LOCK_TIER_LABELS`: Vietnamese labels (Khóa KT, Khóa Admin, Khóa Cuối)
- `LOCK_TIER_COLORS`: Tailwind colors (amber, orange, red)
- `HISTORY_ACTION_LABELS`: Action labels (Khóa KT, Mở khóa KT, etc.)
- `HISTORY_ACTION_COLORS`: Action colors for history UI

#### Helper Functions
- `getLockTierLabel(tier)`: Get Vietnamese label
- `getLockTierColor(tier)`: Get Tailwind color
- `getHistoryActionLabel(action)`: Get history label
- `getHistoryActionColor(action)`: Get history color

---

## Phase 07.5: Bidirectional Sync (Database Queue) - Phase 01

### Overview

Phase 07.5.1 implements database queue infrastructure for bidirectional sync (DB → Google Sheets). Writes to DB are enqueued, processed asynchronously, and synced back to Sheets with retry logic, failure tracking, and queue management.

### Database Schema

**SyncQueue Model** (`prisma/schema.prisma`):
```prisma
model SyncQueue {
  id            String    @id @default(cuid())
  action        String    // "CREATE", "UPDATE", "DELETE"
  model         String    // "Request", "Operator", "Revenue"
  recordId      String    // DB record ID
  sheetRowIndex Int?      // Row number in sheet (null for CREATE)
  payload       Json      // Changed fields: { field: value }
  status        String    @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED
  retries       Int       @default(0)
  maxRetries    Int       @default(3)
  lastError     String?
  createdAt     DateTime  @default(now())
  processedAt   DateTime?

  @@index([status, createdAt])
  @@index([model, recordId])
  @@index([status])
}
```

### Core Utilities

**src/lib/sync/write-back-queue.ts** (237 lines):

#### Types & Interfaces
- `SyncAction`: "CREATE" | "UPDATE" | "DELETE"
- `QueueStatus`: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
- `SyncModel`: "Request" | "Operator" | "Revenue"
- `EnqueueParams`: action, model, recordId, sheetRowIndex?, payload
- `QueueItem`: id, action, model, recordId, sheetRowIndex, payload
- `QueueStats`: pending, processing, completed, failed counts

#### Functions (10 total)

**1. enqueue(params: EnqueueParams): Promise<void>**
- Fire-and-forget queue insertion
- Creates PENDING status record with maxRetries=3
- Catches errors internally (best-effort)
- Called after DB CREATE/UPDATE/DELETE operations

**2. dequeue(batchSize: number = 25): Promise<QueueItem[]>**
- Atomic batch retrieval + status update
- Transaction: selects PENDING items, marks PROCESSING
- Prevents duplicate processing
- Returns oldest items first (FIFO)

**3. markComplete(id: string): Promise<void>**
- Sets status=COMPLETED, records processedAt timestamp
- Called after successful sheet sync

**4. markFailed(id: string, error: string): Promise<void>**
- Increments retries counter
- If retries < maxRetries: status=PENDING (retry)
- Else: status=FAILED (give up)
- Stores error message for debugging

**5. resetStuck(olderThanMinutes: number = 10): Promise<number>**
- Crash recovery: PROCESSING items older than threshold → PENDING
- Default 10min timeout per item
- Returns count of reset items
- Useful for worker restart scenarios

**6. cleanupCompleted(olderThanDays: number = 7): Promise<number>**
- Retention policy: delete COMPLETED items older than threshold
- Default 7 days retention
- Returns count of deleted items

**7. getQueueStats(): Promise<QueueStats>**
- Returns current queue state counts
- Useful for monitoring dashboards
- Groups by status: pending, processing, completed, failed

**8. getFailedItems(limit: number = 10): Promise<Array>**
- Lists failed items with error details
- Returns: id, model, action, recordId, lastError, retries, createdAt
- Default limit 10 items
- Useful for error investigation UI

**9. retryFailed(id: string): Promise<void>**
- Manual retry: sets status=PENDING, resets retries=0, clears lastError
- Allows operator intervention on failed syncs

**10. deleteQueueItem(id: string): Promise<void>**
- Manual cleanup: removes specific queue item
- For clearing stuck or unwanted items

### Implementation Patterns

**Enqueue Pattern** (after DB operations):
```typescript
// In API route POST /api/requests (after create)
await enqueue({
  action: "CREATE",
  model: "Request",
  recordId: request.id,
  payload: { code, customerName, contact, ... }
});
```

**Process Pattern** (background worker):
```typescript
const items = await dequeue(25); // Get next batch
for (const item of items) {
  try {
    await syncToSheet(item);
    await markComplete(item.id);
  } catch (error) {
    await markFailed(item.id, error.message);
  }
}
```

**Maintenance Pattern** (scheduled job):
```typescript
// Hourly cron job
await resetStuck(10); // Reset items stuck >10 min
await cleanupCompleted(7); // Delete items >7 days old
```

### Integration Points

- **Database**: Prisma operations trigger enqueue()
- **API Routes**: POST/PUT/DELETE operations enqueue changes
- **Sync Worker**: Background job consumes queue (Phase 07.5.2+)
- **Monitoring**: Queue stats exposed via admin dashboard (Phase 07.5.3+)

### Files

| File | Lines | Status |
|------|-------|--------|
| `prisma/schema.prisma` | +24 lines (SyncQueue model) | Complete |
| `src/lib/sync/write-back-queue.ts` | 237 | Complete |
| `src/lib/sync/__tests__/write-back-queue.test.ts` | ~150 | Complete |

---

## Tech Stack Summary

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS 4, shadcn/ui (22+ components)
- **Forms**: React Hook Form, Zod
- **Auth**: NextAuth.js v5 with Credentials provider
- **Database**: PostgreSQL (Supabase), Prisma 7 ORM
- **State**: Zustand, React Context
- **Notifications**: Sonner
- **Testing**: Vitest, React Testing Library

---

## Development Patterns

**Component Organization**
- Page components in page.tsx files
- Feature-specific components collocated
- UI components in components/ui/

**Form Handling**
- React Hook Form for state management
- Zod for TypeScript-first validation
- Sonner for toast notifications

**Styling**
- Tailwind CSS utility classes
- shadcn/ui pre-built components
- Mobile-first responsive design

**API Design**
- REST endpoints with standard CRUD
- NextAuth.js v5 for authentication
- Prisma for database queries

**Testing**
- Vitest for unit tests
- React Testing Library for components
- Test coverage for critical paths

---

## Phase 07.1: Dashboard Report APIs

### Overview

Phase 07.1 implements four core reporting APIs for business analytics dashboards:
- **Dashboard KPI Cards**: Summary metrics (bookings, revenue, profit, active requests, conversion rate)
- **Revenue Trend Analysis**: Monthly revenue/cost/profit over time
- **Cost Breakdown**: Cost analysis by service type + payment status
- **Sales Funnel**: Stage-wise request distribution + conversion rates

All endpoints require `revenue:view` permission and support fixed date ranges (thisMonth, lastMonth, last3Months, last6Months, thisYear).

### Validation & Utilities

**src/lib/validations/report-validation.ts**
- `reportQuerySchema`: Zod schema for date range validation
- `DATE_RANGE_OPTIONS`: Const array of valid range options
- `extractReportZodErrors()`: Helper to extract Zod error messages

**src/lib/report-utils.ts**
- Date range functions:
  - `getDateRange(range)`: Returns start/end dates for range option
  - `getComparisonRange(range)`: Previous period calculation
  - `formatPeriodKey(date)`: YYYY-MM format for grouping
  - `calcChangePercent(current, previous)`: % change calculation
- Response types:
  - `KpiCards`: Bookings, revenue, profit, active requests, conversion rate
  - `ComparisonMetric`: Current value, previous value, % change
  - `DashboardResponse`: KPI + comparison + date range
  - `TrendDataPoint`: Period-wise revenue, cost, profit
  - `RevenueTrendResponse`: Trend data + summary + date range
  - `CostByType`: Service type breakdown with percentage
  - `CostBreakdownResponse`: By-type costs + payment status
  - `FunnelStage`: Stage name, count, percentage
  - `FunnelResponse`: Stages array + conversion rate

### API Endpoints (4 new)

**GET /api/reports/dashboard**
- Query: `?range=thisMonth` (default)
- Response: KPI cards + comparison metrics
- Data sources:
  - Bookings: Request count with bookingCode (current + previous period)
  - Revenue: Sum of Revenue.amountVND (current + previous period)
  - Costs: Sum of Operator.totalCost (non-archived, current period)
  - Active Requests: Count where stage in [LEAD, QUOTE]
  - Leads: Total requests created in range (for conversion rate)
- Calculations:
  - Profit = totalRevenue - totalCost
  - ConversionRate = (bookings / leads) * 100%
  - ChangePercent = ((current - previous) / previous) * 100%

**GET /api/reports/revenue-trend**
- Query: `?range=thisMonth` (default)
- Response: Monthly data points + summary statistics
- Data sources:
  - Revenues: Grouped by month (YYYY-MM key)
  - Operators: Grouped by month (non-archived)
- Summary:
  - Total revenue, total cost, total profit, average monthly
- Use case: Line/area chart visualization

**GET /api/reports/cost-breakdown**
- Query: `?range=thisMonth` (default)
- Response: Costs by service type + payment status
- Data sources:
  - Operators: Grouped by serviceType (non-archived)
  - Payment status aggregation: PAID, PARTIAL, UNPAID
- Format: Array sorted by amount descending
- Use case: Pie/bar chart visualization

**GET /api/reports/funnel**
- Query: `?range=thisMonth` (default)
- Response: Stage distribution + overall conversion rate
- Data sources:
  - Requests: Grouped by stage (LEAD, QUOTE, FOLLOWUP, OUTCOME)
  - Converted: Count with bookingCode
- Stage order: LEAD → QUOTE → FOLLOWUP → OUTCOME
- Conversion rate: (bookings / total requests) * 100%
- Use case: Funnel/waterfall chart visualization

### Error Handling

All endpoints return consistent error response:
```typescript
{ success: false, error: "Vietnamese error message" }
```

HTTP status codes:
- 401: Unauthorized (not logged in)
- 403: Forbidden (missing revenue:view permission)
- 400: Bad Request (invalid date range)
- 500: Server error (with message)

### Authentication & Authorization

All endpoints check:
1. Session exists: `await auth()`
2. User has role
3. Role has `revenue:view` permission via `hasPermission(role, 'revenue:view')`

Roles with `revenue:view`:
- ADMIN
- ACCOUNTANT
- SELLER (depending on implementation)

---

## Phase 07.2: Dashboard UI Components

### Overview

Phase 07.2 implements the complete dashboard UI for Phase 07.1 APIs with memoized chart components, responsive layouts, and real-time data fetching. The `/reports` page consolidates 4 API endpoints into a cohesive dashboard with KPI cards, trend visualization, cost analysis, and sales funnel metrics.

### Route & Pages

**src/app/(dashboard)/reports/page.tsx**
- New `/reports` route (30 lines)
- Permission gating: ADMIN/ACCOUNTANT only
- State management: Date range via useState
- Data fetching: useReports hook with 4 parallel APIs
- Error handling: ErrorFallback component with retry
- Responsive layout: Grid with space-y-6 vertical spacing
- Features:
  - Loading indicator ("Đang tải...")
  - Unauthorized access message
  - Data error with retry button
  - Header with DateRangeSelector on right
  - KPI cards (responsive: 2 col mobile, 5 col desktop)
  - Revenue trend chart (400px height)
  - 2-column grid: Cost breakdown + Funnel charts

### Components (5 new)

**src/components/reports/date-range-selector.tsx** (43 lines)
- Select dropdown (w-48) with 5 options
- Vietnamese labels: "Tháng này", "Tháng trước", etc.
- Types: `DateRangeOption` (thisMonth, lastMonth, last3Months, last6Months, thisYear)
- Props: `value: DateRangeOption`, `onChange: (value) => void`
- Non-memoized (simple form control)

**src/components/reports/kpi-cards.tsx** (82 lines, memoized)
- 5 metric cards with trend badges
- Metrics:
  1. Tổng Booking (Total Bookings) - number
  2. Tổng Doanh thu (Total Revenue) - currency (₫)
  3. Tổng Lợi nhuận (Total Profit) - currency (₫)
  4. Yêu cầu đang xử lý (Active Requests) - number
  5. Tỷ lệ chuyển đổi (Conversion Rate) - percentage
- Responsive grid: `grid-cols-2 md:grid-cols-5 gap-4`
- Trend display: Green badge (positive), Red badge (negative)
- Loading: 5 skeleton loaders
- Memoization: `memo()` prevents parent re-renders

**src/components/reports/revenue-trend-chart.tsx** (162 lines, memoized)
- Composed chart: Bar (profit) + 2 Lines (revenue, cost)
- Metrics:
  - Bar: Lợi nhuận (Profit) - Green (#22c55e)
  - Line: Doanh thu (Revenue) - Blue (#3b82f6)
  - Line: Chi phí (Cost) - Red (#ef4444)
- Chart container: h-[400px] w-full
- Period format: "Th.1/26" (Th.M/YY)
- Y-axis compact: 1M, 500K, 100 formatting
- Custom tooltip with currency values
- Memoization: `memo()` + `useMemo()` for chart data

**src/components/reports/cost-breakdown-chart.tsx** (168 lines, memoized)
- Dual visualization:
  1. Pie chart by service type (250px height)
  2. Horizontal progress bars by payment status
- Pie colors: 6-color palette (blue, green, amber, red, purple, cyan)
- Payment status bars:
  - Đã thanh toán (Paid) - Green (#22c55e)
  - Thanh toán một phần (Partial) - Amber (#f59e0b)
  - Chưa thanh toán (Unpaid) - Red (#ef4444)
- Layout: `grid md:grid-cols-2 gap-6`
- Service type labels in Vietnamese
- Custom tooltip with currency formatting
- Memoization: `memo()` + `useMemo()` for data transformation

**src/components/reports/funnel-chart.tsx** (137 lines, memoized)
- Horizontal bar chart with stage breakdown
- Stages (in order): LEAD, QUOTE, FOLLOWUP, OUTCOME
- Colors: Blue → Indigo → Purple → Green gradient
- Features:
  - 300px height responsive container
  - Percentage and count labels
  - Conversion rate badge at top-right
  - Stage names translated to Vietnamese
  - Count labels on bar right edge
- Custom tooltip: Stage name, count, percentage
- Memoization: `memo()` + `useMemo()`

### Data Fetching Hook

**src/hooks/use-reports.ts** (95 lines)
- Fetches all 4 report APIs in parallel
- Features:
  - AbortController for race condition prevention
  - Error handling with Vietnamese fallback messages
  - Automatic refetch on date range change
  - Manual refetch capability via `refetch()`
  - Loading state across all 4 endpoints
- Implementation:
  - `useState` for state management
  - `useRef(AbortController)` for request cancellation
  - `useCallback` for fetchAll function
  - `useEffect` for lifecycle management
- Return type:
  ```typescript
  {
    dashboard: DashboardResponse | null
    trend: RevenueTrendResponse | null
    costBreakdown: CostBreakdownResponse | null
    funnel: FunnelResponse | null
    loading: boolean
    error: string | null
    refetch: () => void
  }
  ```

### Performance Optimizations

**Component Memoization**:
- All chart components use `React.memo()` to prevent unnecessary re-renders
- Parent page re-renders on state change don't cascade to charts

**Data Memoization**:
- `useMemo()` in each chart for data transformation
- Only recalculates when data prop changes

**Parallel API Calls**:
- All 4 endpoints fetched concurrently via `Promise.all()`
- Reduces total fetch time from sequential

**Abort Signal Handling**:
- AbortController prevents memory leaks
- Cancels previous requests on date range change
- Cleanup on component unmount

### Responsive Design

**Mobile (< 768px)**:
- KPI cards: 2 columns
- Charts: Full width, stacked vertically
- All containers: 100% width

**Desktop (>= 768px)**:
- KPI cards: 5 columns
- Cost breakdown: 2-column grid (pie + bars)
- Chart cards: Full width in rows

### Error Handling

1. **Unauthorized Access**: Red error card "Không có quyền truy cập"
2. **Permission Denied**: "Bạn cần quyền Admin hoặc Kế toán"
3. **API Error**: Error message + "Tải lại" retry button
4. **No Data**: "Không có dữ liệu" center text per chart
5. **Loading**: Skeleton loaders on initial load

### Vietnamese UI Text

All labels fully localized:
- Page: "Báo cáo Tổng quan", "Phân tích hiệu suất kinh doanh"
- KPI labels: "Tổng Booking", "Tổng Doanh thu", "Tổng Lợi nhuận", etc.
- Date ranges: "Tháng này", "Tháng trước", "3 tháng gần đây", etc.
- Chart titles: "Xu hướng Doanh thu", "Phân tích Chi phí", "Phễu Chuyển đổi"
- Payment status: "Đã thanh toán", "Thanh toán một phần", "Chưa thanh toán"
- Service types: "Khách sạn", "Vé máy bay", "Vận chuyển", "Tour", "Visa", "Bảo hiểm"

### Files Summary

| File | Lines | Type | Status |
|------|-------|------|--------|
| `src/app/(dashboard)/reports/page.tsx` | 130 | Page | Complete |
| `src/components/reports/date-range-selector.tsx` | 43 | Component | Complete |
| `src/components/reports/kpi-cards.tsx` | 82 | Component (memoized) | Complete |
| `src/components/reports/revenue-trend-chart.tsx` | 162 | Component (memoized) | Complete |
| `src/components/reports/cost-breakdown-chart.tsx` | 168 | Component (memoized) | Complete |
| `src/components/reports/funnel-chart.tsx` | 137 | Component (memoized) | Complete |
| `src/hooks/use-reports.ts` | 95 | Hook | Complete |

**Total**: ~817 lines of production code

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# NextAuth.js v5
NEXTAUTH_SECRET="<generated-secret>"
NEXTAUTH_URL="http://localhost:3000"

# AI & APIs (optional)
ANTHROPIC_API_KEY="sk-ant-xxx"
GOOGLE_SHEETS_API_KEY="xxx"
```

---

## Project Status

| Phase | Component | Status | Date |
|-------|-----------|--------|------|
| **01 Foundation** | Supplier Module + Multi-Spreadsheet Support | Complete | 2026-01-01, 2026-01-07 |
| **01 Foundation** | ID Generation System (RequestID, ServiceID, RevenueID) | Complete | 2026-01-08 |
| **01 Foundation** | Lock System (3-tier: KT/Admin/Final) + RevenueHistory | Complete | 2026-01-08 |
| 02a | Dashboard Layout + Google Sheets Sync API | Complete | 2026-01-02 |
| 02b | Auth Middleware + Request/Operator/Revenue Sync | Complete | 2026-01-04 |
| 02b | Revenue API: Lock/Unlock (3-tier) + History (audit trail) | Complete | 2026-01-08 |
| 02c | Request Sync Fix: Request ID Key + Booking Code Deduplication | Complete | 2026-01-08 |
| 03 | Login Page + RBAC (4 roles, 24 permissions) | Complete | 2026-01-05 |
| 04 | Responsive Layouts (Master-Detail, Mobile Sheets) | Complete | 2026-01-05 |
| 05 | Request Module - Pages (List, Create, Detail, Edit) | Complete | 2026-01-06+ |
| 05 | Operator Module - Pages + Approvals + Locking | Complete | 2026-01-07+ |
| 05 | Revenue Module - Pages + Multi-currency | Complete | 2026-01-07+ |
| **06** | **Request/Operator/Revenue Components & Forms** | **Complete** | **2026-01-10** |
| 06 | React Hooks violations fixed (3 files): requests/[id]/edit/page.tsx, requests/page.tsx, operators/approvals/page.tsx | Complete | 2026-01-10 |
| **07.1** | **Dashboard Report APIs (KPI, Trend, Cost, Funnel)** | **Complete** | **2026-01-09** |
| **07.2** | **Dashboard UI (Reports Page + 5 Chart Components + Data Hook)** | **Complete** | **2026-01-09** |
| **07.5.1** | **Bidirectional Sync - Phase 01: Database Queue** | **Complete** | **2026-01-10** |
| 08+ | AI Assistant & Knowledge Base | Planned | TBD |
| 09+ | Production Hardening & Deployment | Planned | TBD |

