# Codebase Summary

MyVivaTour Platform - Comprehensive directory structure and implementation details.

**Last Updated**: 2026-01-08 (Phase 06: Core Modules 75% - Request/Operator/Revenue Implementation)
**Total Files**: 95+ source files | **Pages**: 18 | **Components**: 61 | **API Routes**: 33 | **Database Models**: 17

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
│   │   ├── suppliers/                # Supplier CRUD pages (Phase 01)
│   │   │   ├── page.tsx              # Supplier list
│   │   │   ├── create/page.tsx       # Create supplier
│   │   │   ├── [id]/page.tsx         # Supplier detail
│   │   │   └── reports/page.tsx      # Supplier reports
│   │   ├── layout.tsx                # Dashboard layout (Header + AIAssistant)
│   │   └── page.tsx                  # Dashboard home with widgets
│   ├── api/                          # REST API routes (33 endpoints)
│   │   ├── auth/[...nextauth]/       # NextAuth.js v5 handlers
│   │   ├── requests/                 # Request CRUD (2 endpoints)
│   │   ├── operators/                # Operator CRUD (8 endpoints)
│   │   ├── suppliers/                # Supplier CRUD (5 endpoints)
│   │   ├── supplier-transactions/    # Transaction CRUD (5 endpoints)
│   │   ├── revenue/                  # Revenue CRUD (4 endpoints)
│   │   ├── reports/                  # Reports (3 endpoints)
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
│   ├── logger.ts                     # Structured logging
│   ├── utils.ts                      # cn(), formatCurrency(), formatDate()
│   └── validations/                  # Zod schemas
│       ├── seller.ts                 # Seller schema validation
│       └── config.ts                 # Config validation schemas
├── hooks/
│   ├── use-permission.ts             # can(), canAll(), canAny(), role shortcuts
│   └── index.ts                      # Barrel export
├── stores/                           # Zustand state management
├── types/index.ts                    # 40+ TypeScript definitions
├── auth.ts                           # NextAuth.js v5 config (Phase 04)
├── middleware.ts                     # Route protection & role-based access (Phase 03)
└── constants.ts                      # App constants
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

### Revenue Endpoints (4)
```
GET    /api/revenue                      # List revenue records
POST   /api/revenue                      # Create revenue
GET    /api/revenue/[id]                 # Get revenue detail
PUT    /api/revenue/[id]                 # Update revenue
DELETE /api/revenue/[id]                 # Delete revenue
```

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
| 01 | Supplier Module + Multi-Spreadsheet Support | Complete | 2026-01-01, 2026-01-07 |
| 02a | Dashboard Layout + Google Sheets Sync API | Complete | 2026-01-02 |
| 02b | Auth Middleware + Request/Operator/Revenue Sync | Complete | 2026-01-04 |
| 02c | Request Sync Fix: Request ID Key + Booking Code Deduplication | Complete | 2026-01-08 |
| 03 | Login Page + RBAC (4 roles, 24 permissions) | Complete | 2026-01-05 |
| 04 | Responsive Layouts (Master-Detail, Mobile Sheets) | Complete | 2026-01-05 |
| 05 | Request Module - Pages (List, Create, Detail, Edit) | Complete | 2026-01-06+ |
| 05 | Operator Module - Pages + Approvals + Locking | Complete | 2026-01-07+ |
| 05 | Revenue Module - Pages + Multi-currency | Complete | 2026-01-07+ |
| 06 | Request/Operator/Revenue Components & Forms | 75% | 2026-01-08 |
| 07 | Operator/Revenue Reports & Analytics | Planned | TBD |
| 08 | AI Assistant & Knowledge Base | Planned | TBD |
| 09 | Production Hardening & Deployment | Planned | TBD |

